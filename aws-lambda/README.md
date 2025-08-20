# Membrane Webhook Handler - AWS Lambda

AWS Lambda service for handling Membrane platform webhooks with secure HMAC verification and Gmail email integration.

## Overview

This service receives and processes organization-related events from Membrane including user invitations, access requests, and organization creation events. It implements proper HMAC-SHA256 signature verification for security and automatically sends notification emails via Gmail integration using the Membrane SDK.

## Features

- 🔒 Secure HMAC-SHA256 webhook signature verification
- 📧 Automated email notifications via Gmail integration
- 🔑 JWT-based authentication with Membrane SDK
- ⚡ Non-blocking error handling for resilient webhook processing
- 📝 Rich email templates for different event types
- 🚀 Serverless deployment with AWS SAM

## Supported Events

- **user-invited-to-org** - User invitation events (sends invitation email)
- **org-access-requested** - Organization access requests (notifies org admins)
- **org-created** - New organization creation events (sends welcome email)

## Prerequisites

- **AWS CLI** - Configure with your AWS credentials
- **SAM CLI** - AWS Serverless Application Model CLI (`pip install aws-sam-cli`)
- **Node.js** (v18 or v20) - Lambda runtime compatibility
- **TypeScript**

### Membrane Preparation

Same as Azure Functions version:
- Create Gmail integration (from the latest public version)
- Create `send-email-fixed` action for Gmail integration (see Azure Functions README for YAML config)

## Development

### Setup

1. **Install dependencies:**
   ```bash
   cd aws-lambda
   npm install
   ```

2. **Configure environment variables:**
   Edit `env.json` with your credentials:
   ```json
   {
     "MembraneWebhookFunction": {
       "WEBHOOK_SECRET": "your-webhook-secret",
       "MEMBRANE_WORKSPACE_KEY": "your-workspace-key",
       "MEMBRANE_WORKSPACE_SECRET": "your-workspace-secret",
       "GMAIL_CONNECTION_ID": "your-gmail-connection-id",
       "CUSTOMER_ID": "your-customer-id",
       "CUSTOMER_NAME": "your-customer-name",
       "MEMBRANE_API_URI": ""
     }
   }
   ```

### Local Development Commands

- `npm run build` - Compile TypeScript to JavaScript
- `npm run dev` - Build and start SAM local API
- `npm test` - Test function with sample event
- `npm run deploy` - Build and deploy to AWS

### Local Testing

Start the local API server:
```bash
npm run dev
```

The webhook endpoint will be available at:
```
http://localhost:3000/webhooks/membrane
```

Test with a sample event:
```bash
npm test
```

## Deployment

### Prerequisites

- **AWS CLI** configured with appropriate permissions
- **S3 bucket** for deployment artifacts (will be created automatically)

### Environment Setup

First, create the required SSM parameters for your environment:

```bash
# Set your environment (dev, staging, prod)
ENV=dev

# Store configuration in AWS Systems Manager Parameter Store
aws ssm put-parameter --name "/membrane-webhook/$ENV/webhook-secret" --value "your-webhook-secret" --type "SecureString"
aws ssm put-parameter --name "/membrane-webhook/$ENV/workspace-key" --value "your-workspace-key" --type "SecureString"  
aws ssm put-parameter --name "/membrane-webhook/$ENV/workspace-secret" --value "your-workspace-secret" --type "SecureString"
aws ssm put-parameter --name "/membrane-webhook/$ENV/gmail-connection-id" --value "your-gmail-connection-id" --type "String"
aws ssm put-parameter --name "/membrane-webhook/$ENV/customer-id" --value "your-customer-id" --type "String"
aws ssm put-parameter --name "/membrane-webhook/$ENV/customer-name" --value "your-customer-name" --type "String"
aws ssm put-parameter --name "/membrane-webhook/$ENV/api-uri" --value "" --type "String"
```

### Deploy to AWS

1. **Build and deploy:**
   ```bash
   npm run build
   sam deploy --guided
   ```

2. **Or use the configured deployment:**
   ```bash
   npm run deploy
   ```

### Post-Deployment

Your webhook endpoint will be available at:
```
https://{api-id}.execute-api.{region}.amazonaws.com/{stage}/webhooks/membrane
```

The exact URL will be shown in the SAM deployment outputs.

Configure this URL in your Membrane webhook settings with the corresponding `WEBHOOK_SECRET`.

## Configuration

### Environment Variables

Same as Azure Functions version:
- **WEBHOOK_SECRET** - Secret for HMAC-SHA256 signature verification
- **MEMBRANE_WORKSPACE_KEY** - Membrane workspace key for JWT authentication
- **MEMBRANE_WORKSPACE_SECRET** - Membrane workspace secret for JWT signing
- **MEMBRANE_API_URI** - (Optional) Membrane API endpoint, defaults to production
- **GMAIL_CONNECTION_ID** - Gmail connection ID from Membrane integration

### Security

The service implements:
- HMAC-SHA256 signature verification using raw request body
- Timing-safe comparison to prevent timing attacks
- JWT-based authentication with Membrane SDK
- Proper error handling with appropriate HTTP status codes
- AWS Lambda Powertools for structured logging

## Monitoring

The Lambda function automatically logs to CloudWatch. You can monitor:

- **Function metrics** - Invocation count, duration, errors
- **API Gateway metrics** - Request count, latency, 4XX/5XX errors
- **Custom logs** - Structured logging with AWS Lambda Powertools

Access logs in AWS CloudWatch under:
```
/aws/lambda/membrane-webhook-{environment}
```

## Architecture

- **AWS Lambda** - Serverless function runtime
- **API Gateway** - HTTP endpoint and request routing
- **CloudWatch** - Logging and monitoring
- **Systems Manager** - Parameter storage for configuration
- **Membrane SDK** - Integration with Membrane platform
- **AWS Lambda Powertools** - Structured logging and observability