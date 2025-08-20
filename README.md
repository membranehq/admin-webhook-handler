# Admin Webhook Handler

Azure Functions service for handling Membrane platform webhooks with secure HMAC verification and Gmail email integration.

## Overview

This service receives and processes organization-related events from Membrane including user invitations, access requests, and organization creation events. It implements proper HMAC-SHA256 signature verification for security and automatically sends notification emails via Gmail integration using the Membrane SDK.

## Features

- 🔒 Secure HMAC-SHA256 webhook signature verification
- 📧 Automated email notifications via Gmail integration
- 🔑 JWT-based authentication with Membrane SDK
- ⚡ Non-blocking error handling for resilient webhook processing
- 📝 Rich email templates for different event types

## Supported Events

- **user-invited-to-org** - User invitation events (sends invitation email)
- **org-access-requested** - Organization access requests (notifies org admins)
- **org-created** - New organization creation events (sends welcome email)

## Development

### Prerequisites

- Node.js (v18 or v20 - Azure Functions v4 compatibility)
- Azure Functions Core Tools: `brew install azure/functions/azure-functions-core-tools@4`
- TypeScript

**Note**: Node.js v23 is not supported by Azure Functions v4. Use Node.js v18 or v20.

#### Membrane preparation:

- create gmail integration (from the latest public version)
- create send-email action for gmail integration
```yaml
name: Send Email
isDeactivated: false
state: READY
errors: []
key: send-email
isCustomized: true
type: create-data-record
inputSchema:
  type: object
  properties:
    to:
      type: array
      items:
        type: string
    subject:
      type: string
    body:
      type: string
    htmlBody:
      type: string
config:
  dataSource:
    collectionKey: emails
  fieldMapping:
    defaultValue:
      body:
        $var: $.input.body
      subject:
        $var: $.input.subject
      to:
        $var: $.input.to
      html_body:
        $var: $.input.htmlBody
```

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy and configure local settings:
   ```bash
   cp local.settings.json.sample local.settings.json
   ```

3. Edit `local.settings.json` with your credentials:
   ```json
   {
     "IsEncrypted": false,
     "Values": {
       "AzureWebJobsStorage": "UseDevelopmentStorage=true",
       "FUNCTIONS_WORKER_RUNTIME": "node",
       "WEBHOOK_SECRET": "your-webhook-secret",
       "MEMBRANE_WORKSPACE_KEY": "your-workspace-key",
       "MEMBRANE_WORKSPACE_SECRET": "your-workspace-secret",
       "GMAIL_CONNECTION_ID": "your-gmail-connection-id",
       "CUSTOMER_ID": "your-customer-id",
       "CUSTOMER_NAME": "your-user-name"
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
- `MEMBRANE_WORKSPACE_KEY` - Membrane workspace key for JWT authentication
- `MEMBRANE_WORKSPACE_SECRET` - Membrane workspace secret for JWT signing
- `MEMBRANE_API_URI` - (Optional) Membrane API endpoint, defaults to production
- `GMAIL_CONNECTION_ID` - Gmail connection ID from Membrane integration
- `AzureWebJobsStorage` - Azure storage connection string

### Security

The service implements:
- HMAC-SHA256 signature verification using raw request body
- Timing-safe comparison to prevent timing attacks
- JWT-based authentication with Membrane SDK
- Proper error handling with appropriate HTTP status codes

## Deployment

### Prerequisites

- Azure CLI installed (`brew install azure-cli` on macOS)
- Azure Functions Core Tools (`brew install azure/functions/azure-functions-core-tools@4`)
- Active Azure subscription

### Deployment Steps

1. **Login to Azure:**
   ```bash
   az login
   az account set --subscription "your-subscription-id"
   ```

2. **Create Resources:**
   ```bash
   # Create resource group
   az group create --name "rg-webhook-handler" --location "germanywestcentral"
   
   # Create storage account (name must be globally unique, max 24 chars)
   STORAGE_NAME="stwh$(date +%s | tail -c 10)"
   az storage account create \
     --name "$STORAGE_NAME" \
     --resource-group "rg-webhook-handler" \
     --location "germanywestcentral" \
     --sku "Standard_LRS"
   ```

3. **Create Function App:**
   ```bash
   FUNCTION_NAME="func-webhook-$(date +%s | tail -c 8)"
   az functionapp create \
     --resource-group "rg-webhook-handler" \
     --consumption-plan-location "germanywestcentral" \
     --runtime "node" \
     --runtime-version "20" \
     --functions-version "4" \
     --name "$FUNCTION_NAME" \
     --storage-account "$STORAGE_NAME" \
     --os-type "Linux"
   ```

4. **Configure Application Settings:**
   ```bash
   az functionapp config appsettings set \
     --name "$FUNCTION_NAME" \
     --resource-group "rg-webhook-handler" \
     --settings \
       "WEBHOOK_SECRET=your-production-webhook-secret" \
       "MEMBRANE_WORKSPACE_KEY=your-workspace-key" \
       "MEMBRANE_WORKSPACE_SECRET=your-workspace-secret" \
       "GMAIL_CONNECTION_ID=your-gmail-connection-id" \
       "CUSTOMER_ID=your-customer-id" \
       "CUSTOMER_NAME=your-customer-name" \
       "WEBSITE_RUN_FROM_PACKAGE=1"
   ```

5. **Deploy the Function:**
   ```bash
   npm run build
   func azure functionapp publish "$FUNCTION_NAME" --javascript
   ```

### Post-Deployment

Your webhook endpoint will be available at:
```
https://$FUNCTION_NAME.azurewebsites.net/api/webhooks/membrane
```

Configure this URL in your Membrane webhook settings with the corresponding `WEBHOOK_SECRET`.

### Monitoring

Enable Application Insights for monitoring:
```bash
az monitor app-insights component create \
  --app "ai-webhook-handler" \
  --location "Germany West Central" \
  --resource-group "rg-webhook-handler"
```