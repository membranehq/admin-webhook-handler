## System Webhooks

Membrane supports system-level webhooks that allow you to receive notifications about platform events. Webhooks are managed through the Admin Console and require admin permissions to configure.

### Webhook Types

Membrane supports the following webhook types:

#### User Invited to Organization (`user-invited-to-org`)

Triggered when a user is invited to join an organization workspace.

**Payload Example:**

```json
{
  "type": "user-invited-to-org",
  "invitationUrl": "https://console.yourdomain.com/org-invitations/12345",
  "issuer": {
    "name": "John Admin",
    "email": "admin@company.com"
  },
  "user": {
    "email": "newuser@company.com"
  },
  "org": {
    "id": "org123",
    "name": "My Organization",
    "trialEndDate": "2025-05-16"
  }
}
```

#### Organization Access Requested (`org-access-requested`)

Triggered when a user requests access to an organization based on their email domain.

**Payload Example:**

```json
{
  "type": "org-access-requested",
  "user": {
    "id": "user123",
    "email": "employee@company.com",
    "name": "Jane Employee"
  },
  "orgAdmins": [
    {
      "email": "admin@company.com",
      "orgs": [
        {
          "id": "org123",
          "name": "My Organization"
        }
      ]
    }
  ]
}
```

#### Organization Created (`org-created`)

Triggered when a new organization is created on the platform.

**Payload Example:**

```json
{
  "type": "org-created",
  "name": "New Organization",
  "workspaceName": "Main Workspace",
  "orgId": "org456",
  "org": {
    "id": "org456",
    "name": "New Organization",
    "domains": ["company.com"],
    "trialEndDate": "2025-05-23"
  },
  "user": {
    "name": "Creator User",
    "email": "creator@company.com"
  }
}
```

### Webhook Authentication

Webhooks support HMAC-SHA256 signature verification for secure payload validation:

1. **Secret Configuration**: When creating a webhook, optionally provide a `secret` string
2. **Signature Generation**: Membrane generates an HMAC-SHA256 signature using the webhook secret
3. **Header Delivery**: The signature is sent in the `X-Signature` header with each webhook request
4. **Verification**: Verify the payload by generating the same HMAC signature on your end

**Example Verification (Node.js):**

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return signature === expectedSignature;
}

// In your webhook handler
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-signature'];
  const isValid = verifyWebhook(req.body, signature, 'your-webhook-secret');

  if (!isValid) {
    return res.status(401).send('Invalid signature');
  }

  // Process webhook payload
  res.status(200).send('OK');
});
```

### Managing Webhooks

Webhooks can be managed through the Admin Console:

1. Navigate to **Admin** > **Manage Webhooks**
2. Click **Create Webhook**
3. Configure:
   * **Type**: Select the webhook event type
   * **URL**: Your webhook endpoint URL
   * **Secret**: Optional secret for HMAC verification

**API Endpoints:**

* `GET /webhooks` - List all webhooks
* `POST /webhooks` - Create a new webhook
* `GET /webhooks/:type` - Get webhook by type
* `PATCH /webhooks/:type` - Update webhook
* `DELETE /webhooks/:type` - Delete webhook

> **Note**: All webhook management operations require admin authentication via Auth0 JWT tokens.

### Webhook Configuration Requirements

* **Admin Access**: Only platform administrators can create, modify, or delete webhooks
* **Unique Types**: Only one webhook can be configured per event type
* **HTTPS Required**: Webhook URLs should use HTTPS for security
* **Response Timeout**: Webhook requests have a 30-second timeout
* **Retry Policy**: Failed webhooks are not automatically retried

### Testing Webhooks

For development and testing purposes, you can use tools like:

* **ngrok**: To expose local development servers
* **webhook.site**: To inspect webhook payloads
* **Postman**: To simulate webhook endpoints

Example ngrok setup:

```bash
# Install ngrok
npm install -g ngrok

# Expose local server
ngrok http 3000

# Use the generated HTTPS URL in webhook configuration
```


❯ az functionapp config appsettings set \
    --name "func-webhook-5674854" \
    --resource-group "rg-webhook-handler" \
    --settings \
      "FUNCTIONS_WORKER_RUNTIME=node" \
      "WEBHOOK_SECRET=your-production-webhook-secret" \
      "MEMBRANE_WORKSPACE_KEY=0d1fc4d4-a91b-482d-ab49-592dde31f821" \
      "MEMBRANE_WORKSPACE_SECRET=dc5f4f3b77d6dce0ffcb7afec59c703edcb53211fc66ad85e9a97daecc5f11ff" \
      "GMAIL_CONNECTION_ID=68a57f2087e6ee781fed5c54" \
      "CUSTOMER_ID=668d0b1805550207c651fb77" \
      "CUSTOMER_NAME=Vadym Khodak" \
      "WEBSITE_RUN_FROM_PACKAGE=1"