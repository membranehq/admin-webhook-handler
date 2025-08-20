import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { Logger } from "@aws-lambda-powertools/logger";
import crypto from "crypto";
import { MembraneService } from "../services/membraneService.js";

const logger = new Logger();

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

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  // Set up logging context
  logger.addContext(context);

  // 1) Read the *raw* body (string) BEFORE parsing
  const rawBody = event.body || "";
  const signature = event.headers["x-signature"] || event.headers["X-Signature"];

  // 2) Verify HMAC signature
  if (!verifySignature(rawBody, signature)) {
    logger.warn("Invalid X-Signature for Membrane webhook");
    return {
      statusCode: 401,
      body: JSON.stringify({ error: "Invalid signature" }),
    };
  }

  // 3) Parse JSON safely *after* verification
  let membraneEvent: MembraneEvent;
  try {
    membraneEvent = JSON.parse(rawBody);
  } catch (e) {
    logger.error("Failed to parse webhook JSON", e as Error);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid JSON" }),
    };
  }

  // 4) Process by event type (keep work fast—Lambda timeout, no retries from Membrane)
  try {
    switch (membraneEvent.type) {
      case "user-invited-to-org": {
        logger.info("User invited to org", {
          invitationUrl: membraneEvent.invitationUrl,
          userEmail: membraneEvent.user.email,
          orgId: membraneEvent.org.id,
          orgName: membraneEvent.org.name,
        });

        // Send invitation email
        try {
          await MembraneService.sendEmailWithAutoConnection({
            to: membraneEvent.user.email,
            subject: `You've been invited to join ${membraneEvent.org.name}`,
            body: `Hello,

You've been invited by ${membraneEvent.issuer.name} (${membraneEvent.issuer.email}) to join the organization "${membraneEvent.org.name}".

Click the link below to accept your invitation:
${membraneEvent.invitationUrl}

${membraneEvent.org.trialEndDate ? `Note: This organization's trial ends on ${membraneEvent.org.trialEndDate}` : ''}

Best regards,
The Team`,
          });
          logger.info("Invitation email sent successfully");
        } catch (error) {
          logger.error("Failed to send invitation email", error as Error);
        }
        break;
      }

      case "org-access-requested": {
        logger.info("Org access requested", {
          requesterId: membraneEvent.user.id,
          requesterEmail: membraneEvent.user.email,
          adminCount: membraneEvent.orgAdmins.length,
        });

        // Send notification emails to all org admins
        for (const admin of membraneEvent.orgAdmins) {
          try {
            await MembraneService.sendEmailWithAutoConnection({
              to: admin.email,
              subject: "New Organization Access Request",
              body: `Hello,

A user has requested access to your organization(s).

Requester Details:
- Email: ${membraneEvent.user.email}
- Name: ${membraneEvent.user.name || 'Not provided'}
- User ID: ${membraneEvent.user.id}

Organizations they're requesting access to:
${admin.orgs.map(org => `- ${org.name} (ID: ${org.id})`).join('\n')}

Please review this request and take appropriate action in your admin dashboard.

Best regards,
The Team`,
            });
            logger.info(`Access request notification sent to admin: ${admin.email}`);
          } catch (error) {
            logger.error(`Failed to send access request notification to ${admin.email}`, error as Error);
          }
        }
        break;
      }

      case "org-created": {
        logger.info("Org created", {
          orgId: membraneEvent.org.id,
          orgName: membraneEvent.org.name,
          workspaceName: membraneEvent.workspaceName,
          creatorEmail: membraneEvent.user.email,
        });

        // Send welcome email to organization creator
        try {
          await MembraneService.sendEmailWithAutoConnection({
            to: membraneEvent.user.email,
            subject: `Welcome to ${membraneEvent.org.name}!`,
            body: `Hello ${membraneEvent.user.name || 'there'},

Congratulations! Your organization "${membraneEvent.org.name}" has been successfully created.

Organization Details:
- Organization Name: ${membraneEvent.org.name}
- Workspace Name: ${membraneEvent.workspaceName}
- Organization ID: ${membraneEvent.org.id}
${membraneEvent.org.domains ? `- Domains: ${membraneEvent.org.domains.join(', ')}` : ''}
${membraneEvent.org.trialEndDate ? `- Trial ends: ${membraneEvent.org.trialEndDate}` : ''}

You can now start inviting team members and setting up your workspace.

Best regards,
The Team`,
          });
          logger.info("Welcome email sent successfully");
        } catch (error) {
          logger.error("Failed to send welcome email", error as Error);
        }
        break;
      }

      default: {
        // Future-proof: accept unknown types for forward compatibility
        logger.info("Unhandled Membrane event type", { eventType: (membraneEvent as any).type });
        break;
      }
    }
  } catch (err) {
    // If something fails internally, return 200 *only if* you've made processing idempotent elsewhere.
    // Since Membrane does NOT retry failed webhooks, you may choose to return 500 to alert upstream.
    logger.error("Error processing Membrane webhook", err as Error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Processing error" }),
    };
  }

  // 5) ACK quickly
  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true }),
  };
};