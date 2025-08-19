# Admin Webhook Handler

Azure Functions service for handling Membrane platform webhooks with secure HMAC verification.

## Overview

This service receives and processes organization-related events from Membrane including user invitations, access requests, and organization creation events. It implements proper HMAC-SHA256 signature verification for security.

## Supported Events

- **user-invited-to-org** - User invitation events
- **org-access-requested** - Organization access requests  
- **org-created** - New organization creation events

## Development

### Prerequisites

- Node.js (v18 or v20 - Azure Functions v4 compatibility)
- Azure Functions Core Tools: `brew install azure/functions/azure-functions-core-tools@4`
- TypeScript

**Note**: Node.js v23 is not supported by Azure Functions v4. Use Node.js v18 or v20.

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure local settings:
   ```bash
   # Edit local.settings.json
   {
     "Values": {
       "WEBHOOK_SECRET": "your-webhook-secret"
     }
   }
   ```

### Commands

- `npm run build` - Compile TypeScript
- `npm start` - Start Azure Functions runtime
- `npm run dev` - Build and start in development mode

### Endpoint

The webhook endpoint is available at:
```
POST /api/webhooks/membrane
```

## Configuration

### Environment Variables

- `WEBHOOK_SECRET` - Secret for HMAC-SHA256 signature verification
- `AzureWebJobsStorage` - Azure storage connection string

### Security

The service implements:
- HMAC-SHA256 signature verification using raw request body
- Timing-safe comparison to prevent timing attacks
- Proper error handling with appropriate HTTP status codes

## Deployment

Deploy to Azure Functions with the appropriate environment variables configured in the Azure portal.