import { HttpFunction } from '@google-cloud/functions-framework/build/src/functions';
import { Request, Response } from 'express';
import { Logging } from '@google-cloud/logging';
import crypto from "crypto";
import { MembraneService } from "../services/membraneService.js";

// Initialize Google Cloud Logging
const logging = new Logging();
const log = logging.log('membrane-webhook');

/**
 * Membrane sends:
 *  - Method: POST
 *  - Header: X-Signature: <hex HMAC-SHA256(JSON.stringify(payload), secret)>
 *  - Body:   JSON
 *
 * We MUST compute HMAC over the *raw* request body string.
 */

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";

// ---- Types for known events (extend as Membrane adds more) ----
type UserInvitedToOrg = {
  type: "user-invited-to-org";
  invitationUrl: string;
  issuer: { name: string; email: string };
  user: { email: string };
  org: { id: string; name: string; trialEndDate?: string };
};

type OrgAccessRequested = {
  type: "org-access-requested";
  user: { id: string; email: string; name?: string };
  orgAdmins: { email: string; orgs: { id: string; name: string }[] }[];
};

type OrgCreated = {
  type: "org-created";
  name: string;
  workspaceName: string;
  orgId: string;
  org: { id: string; name: string; domains?: string[]; trialEndDate?: string };
  user: { name?: string; email: string };
};

type MembraneEvent = UserInvitedToOrg | OrgAccessRequested | OrgCreated;

// ---- HMAC verification (timing-safe) ----
function verifySignature(rawBody: string, signatureHex: string | null): boolean {
  if (!WEBHOOK_SECRET) return true; // allow in dev if no secret set (or change to false to enforce)
  if (!signatureHex) return false;

  const expected = crypto.createHmac("sha256", WEBHOOK_SECRET).update(rawBody).digest("hex");

  // timing-safe compare
  const a = Buffer.from(signatureHex, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Helper function for structured logging
function logInfo(message: string, data?: any) {
  const entry = log.entry(
    { severity: 'INFO' },
    { message, ...data, timestamp: new Date().toISOString() }
  );
  log.write(entry);
  console.log(message, data);
}

function logError(message: string, error?: Error | any) {
  const entry = log.entry(
    { severity: 'ERROR' },
    { message, error: error?.message || error, stack: error?.stack, timestamp: new Date().toISOString() }
  );
  log.write(entry);
  console.error(message, error);
}

function logWarn(message: string, data?: any) {
  const entry = log.entry(
    { severity: 'WARNING' },
    { message, ...data, timestamp: new Date().toISOString() }
  );
  log.write(entry);
  console.warn(message, data);
}

export const membraneWebhook: HttpFunction = async (req: Request, res: Response): Promise<void> => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).send({ error: 'Method not allowed' });
    return;
  }

  try {
    // 1) Read the *raw* body (string) BEFORE parsing
    const rawBody = JSON.stringify(req.body);
    const signature = req.headers['x-signature'] || req.headers['X-Signature'];

    // 2) Verify HMAC signature
    if (!verifySignature(rawBody, signature as string)) {
      logWarn("Invalid X-Signature for Membrane webhook");
      res.status(401).json({ error: "Invalid signature" });
      return;
    }

    // 3) Parse JSON safely *after* verification
    let event: MembraneEvent;
    try {
      event = req.body;
    } catch (e) {
      logError("Failed to parse webhook JSON", e);
      res.status(400).json({ error: "Invalid JSON" });
      return;
    }

    // 4) Process by event type (keep work fast—timeout limit, no retries from Membrane)
    try {
      switch (event.type) {
        case "user-invited-to-org": {
          logInfo("User invited to org", {
            invitationUrl: event.invitationUrl,
            userEmail: event.user.email,
            orgId: event.org.id,
            orgName: event.org.name,
          });

          // Send invitation email
          try {
            await MembraneService.sendEmailWithAutoConnection({
              to: event.user.email,
              subject: `You've been invited to join ${event.org.name}`,
              body: `Hello,

You've been invited by ${event.issuer.name} (${event.issuer.email}) to join the organization "${event.org.name}".

Click the link below to accept your invitation:
${event.invitationUrl}

${event.org.trialEndDate ? `Note: This organization's trial ends on ${event.org.trialEndDate}` : ''}

Best regards,
The Team`,
            });
            logInfo("Invitation email sent successfully");
          } catch (error) {
            logError("Failed to send invitation email", error);
          }
          break;
        }

        case "org-access-requested": {
          logInfo("Org access requested", {
            requesterId: event.user.id,
            requesterEmail: event.user.email,
            adminCount: event.orgAdmins.length,
          });

          // Send notification emails to all org admins
          for (const admin of event.orgAdmins) {
            try {
              await MembraneService.sendEmailWithAutoConnection({
                to: admin.email,
                subject: "New Organization Access Request",
                body: `Hello,

A user has requested access to your organization(s).

Requester Details:
- Email: ${event.user.email}
- Name: ${event.user.name || 'Not provided'}
- User ID: ${event.user.id}

Organizations they're requesting access to:
${admin.orgs.map(org => `- ${org.name} (ID: ${org.id})`).join('\n')}

Please review this request and take appropriate action in your admin dashboard.

Best regards,
The Team`,
              });
              logInfo(`Access request notification sent to admin: ${admin.email}`);
            } catch (error) {
              logError(`Failed to send access request notification to ${admin.email}`, error);
            }
          }
          break;
        }

        case "org-created": {
          logInfo("Org created", {
            orgId: event.org.id,
            orgName: event.org.name,
            workspaceName: event.workspaceName,
            creatorEmail: event.user.email,
          });

          // Send welcome email to organization creator
          try {
            await MembraneService.sendEmailWithAutoConnection({
              to: event.user.email,
              subject: `Welcome to ${event.org.name}!`,
              body: `Hello ${event.user.name || 'there'},

Congratulations! Your organization "${event.org.name}" has been successfully created.

Organization Details:
- Organization Name: ${event.org.name}
- Workspace Name: ${event.workspaceName}
- Organization ID: ${event.org.id}
${event.org.domains ? `- Domains: ${event.org.domains.join(', ')}` : ''}
${event.org.trialEndDate ? `- Trial ends: ${event.org.trialEndDate}` : ''}

You can now start inviting team members and setting up your workspace.

Best regards,
The Team`,
            });
            logInfo("Welcome email sent successfully");
          } catch (error) {
            logError("Failed to send welcome email", error);
          }
          break;
        }

        default: {
          // Future-proof: accept unknown types for forward compatibility
          logInfo("Unhandled Membrane event type", { eventType: (event as any).type });
          break;
        }
      }
    } catch (err) {
      // If something fails internally, return 200 *only if* you've made processing idempotent elsewhere.
      // Since Membrane does NOT retry failed webhooks, you may choose to return 500 to alert upstream.
      logError("Error processing Membrane webhook", err);
      res.status(500).json({ error: "Processing error" });
      return;
    }

    // 5) ACK quickly
    res.status(200).json({ ok: true });
  } catch (error) {
    logError("Unexpected error in webhook handler", error);
    res.status(500).json({ error: "Internal server error" });
  }
};