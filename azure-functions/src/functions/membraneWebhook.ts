import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import crypto from "crypto";
import { MembraneService } from "../services/membraneService.js";

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



app.http("membrane-webhook", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "webhooks/membrane",        // final URL: /api/webhooks/membrane
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
  // 1) Read the *raw* body (string) BEFORE parsing
  const rawBody = await req.text();
  const signature = req.headers.get("x-signature");

  // 2) Verify HMAC signature
  if (!verifySignature(rawBody, signature)) {
    ctx.warn("Invalid X-Signature for Membrane webhook");
    return { status: 401, body: "Invalid signature" };
  }

  // 3) Parse JSON safely *after* verification
  let event: MembraneEvent;
  try {
    event = JSON.parse(rawBody);
  } catch (e) {
    ctx.error("Failed to parse webhook JSON", e);
    return { status: 400, body: "Invalid JSON" };
  }

  // 4) Process by event type (keep work fast—30s timeout, no retries from Membrane)
  try {
    switch (event.type) {
      case "user-invited-to-org": {
        ctx.log("User invited to org", {
          invitationUrl: event.invitationUrl,
          userEmail: event.user.email,
          orgId: event.org.id,
          orgName: event.org.name
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
The Team`
          });
          ctx.log("Invitation email sent successfully");
        } catch (error) {
          ctx.error("Failed to send invitation email", error);
        }
        break;
      }

      case "org-access-requested": {
        ctx.log("Org access requested", {
          requesterId: event.user.id,
          requesterEmail: event.user.email,
          adminCount: event.orgAdmins.length
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
The Team`
            });
            ctx.log(`Access request notification sent to admin: ${admin.email}`);
          } catch (error) {
            ctx.error(`Failed to send access request notification to ${admin.email}`, error);
          }
        }
        break;
      }

      case "org-created": {
        ctx.log("Org created", {
          orgId: event.org.id,
          orgName: event.org.name,
          workspaceName: event.workspaceName,
          creatorEmail: event.user.email
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
The Team`
          });
          ctx.log("Welcome email sent successfully");
        } catch (error) {
          ctx.error("Failed to send welcome email", error);
        }
        break;
      }

      default: {
        // Future-proof: accept unknown types for forward compatibility
        ctx.log("Unhandled Membrane event type", (event as any).type);
        break;
      }
    }
  } catch (err) {
    // If something fails internally, return 200 *only if* you've made processing idempotent elsewhere.
    // Since Membrane does NOT retry failed webhooks, you may choose to return 500 to alert upstream.
    ctx.error("Error processing Membrane webhook", err);
    return { status: 500, body: "Processing error" };
  }

  // 5) ACK quickly
  return { status: 200, jsonBody: { ok: true } };
  }
});

