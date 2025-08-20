# Membrane Webhook Handler - Google Cloud Functions

Google Cloud Functions service for handling Membrane platform webhooks with secure HMAC verification and Gmail email integration.

## Overview

This service receives and processes organization-related events from Membrane including user invitations, access requests, and organization creation events. It implements proper HMAC-SHA256 signature verification for security and automatically sends notification emails via Gmail integration using the Membrane SDK.

## Features

- 🔒 Secure HMAC-SHA256 webhook signature verification
- 📧 Automated email notifications via Gmail integration
- 🔑 JWT-based authentication with Membrane SDK
- ⚡ Non-blocking error handling for resilient webhook processing
- 📝 Rich email templates for different event types
- 🚀 Serverless deployment with Google Cloud Functions
- 📊 Structured logging with Google Cloud Logging

## Supported Events

- **user-invited-to-org** - User invitation events (sends invitation email)
- **org-access-requested** - Organization access requests (notifies org admins)
- **org-created** - New organization creation events (sends welcome email)

## Prerequisites

- **Google Cloud CLI** - Configure with your Google Cloud project
- **Node.js** (v18 or v20) - Cloud Functions runtime compatibility
- **TypeScript**
- **Google Cloud Project** with Cloud Functions API enabled

### Membrane Preparation

Same as other versions:
- Create Gmail integration (from the latest public version)
- Create `send-email` action for Gmail integration (see Azure Functions README for YAML config)

## Development

### Setup

1. **Install dependencies:**
   ```bash
   cd google-cloud
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.sample .env
   # Edit .env with your credentials
   ```

3. **Set up Google Cloud:**
   ```bash
   # Login and set project
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   
   # Enable required APIs
   gcloud services enable cloudfunctions.googleapis.com
   gcloud services enable logging.googleapis.com
   ```

### Local Development Commands

- `npm run build` - Compile TypeScript to JavaScript
- `npm run dev` - Build and start local Functions Framework server
- `npm test` - Test function with sample payload
- `npm run deploy` - Build and deploy to Google Cloud

### Local Testing

Start the local development server:
```bash
npm run dev
```

The webhook endpoint will be available at:
```
http://localhost:8080
```

Test with a sample event:
```bash
npm test
```

Or test manually:
```bash
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -H "x-signature: your-test-signature" \
  -d @test-payload.json
```

## Deployment

### Quick Deploy

Use the provided deployment script:
```bash
./deploy.sh
```

### Manual Deployment

1. **Build the project:**
   ```bash
   npm run build
   ```

2. **Deploy to Google Cloud:**
   ```bash
   gcloud functions deploy membrane-webhook \
     --runtime nodejs20 \
     --trigger-http \
     --entry-point membraneWebhook \
     --memory 256MB \
     --timeout 540s \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars "$(cat .env | grep -v '^#' | paste -sd ',' -)"
   ```

### Environment Variables

Set your environment variables in `.env` file before deployment:

```bash
# Required variables
WEBHOOK_SECRET=your-webhook-secret
MEMBRANE_WORKSPACE_KEY=your-workspace-key
MEMBRANE_WORKSPACE_SECRET=your-workspace-secret
GMAIL_CONNECTION_ID=your-gmail-connection-id
CUSTOMER_ID=your-customer-id
CUSTOMER_NAME=your-customer-name

# Optional
MEMBRANE_API_URI=  # Leave empty for production
GOOGLE_CLOUD_PROJECT=your-project-id
```

### Post-Deployment

After deployment, your webhook endpoint will be available at:
```
https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/membrane-webhook
```

Configure this URL in your Membrane webhook settings with the corresponding `WEBHOOK_SECRET`.

## Configuration

### Environment Variables

Same as other versions:
- **WEBHOOK_SECRET** - Secret for HMAC-SHA256 signature verification
- **MEMBRANE_WORKSPACE_KEY** - Membrane workspace key for JWT authentication
- **MEMBRANE_WORKSPACE_SECRET** - Membrane workspace secret for JWT signing
- **MEMBRANE_API_URI** - (Optional) Membrane API endpoint, defaults to production
- **GMAIL_CONNECTION_ID** - Gmail connection ID from Membrane integration
- **GOOGLE_CLOUD_PROJECT** - Your Google Cloud project ID

### Security

The service implements:
- HMAC-SHA256 signature verification using raw request body
- Timing-safe comparison to prevent timing attacks
- JWT-based authentication with Membrane SDK
- Proper error handling with appropriate HTTP status codes
- Google Cloud Logging for structured logging

## Monitoring

The Cloud Function automatically logs to Google Cloud Logging. You can monitor:

- **Function metrics** - Invocation count, duration, errors
- **HTTP metrics** - Request count, latency, status codes
- **Custom logs** - Structured logging with context

Access logs in Google Cloud Console under:
- **Logging > Logs Explorer**
- **Cloud Functions > Your Function > Logs**

### Viewing Logs

```bash
# View recent logs
gcloud functions logs read membrane-webhook --region=us-central1

# Follow logs in real-time
gcloud functions logs tail membrane-webhook --region=us-central1
```

## Architecture

- **Google Cloud Functions** - Serverless function runtime (Node.js 20)
- **HTTP Trigger** - Direct HTTP endpoint for webhooks
- **Cloud Logging** - Structured logging and monitoring
- **Membrane SDK** - Integration with Membrane platform
- **Functions Framework** - Local development server

## Development Tips

1. **Local Development**: Use Functions Framework for local testing
2. **Environment Variables**: Keep sensitive data in `.env` (not committed)
3. **Logging**: Use the structured logging functions for better observability
4. **Error Handling**: Email failures don't fail webhook processing
5. **Cold Starts**: Function may have cold start latency; consider using reserved instances for production

## Troubleshooting

### Common Issues

1. **Missing environment variables**: Ensure all required variables are set in `.env`
2. **Authentication errors**: Verify Google Cloud CLI is authenticated
3. **API not enabled**: Make sure Cloud Functions API is enabled
4. **Permissions**: Ensure your account has Cloud Functions Developer role

### Debug Locally

```bash
# Run with debug logging
DEBUG=* npm run dev

# Test specific payload
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -H "x-signature: test" \
  -d '{"type":"user-invited-to-org","user":{"email":"test@example.com"},...}'
```