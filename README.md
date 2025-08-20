# Membrane Webhook Handler

Multi-cloud serverless webhook handler for processing Membrane platform events with automated email notifications.

## Overview

This project provides identical webhook handling functionality across three major cloud platforms. It receives and processes organization-related events from the Membrane platform, implementing secure HMAC-SHA256 signature verification and automatically sending email notifications via Gmail integration using the Membrane SDK.

## Supported Events

- **user-invited-to-org** - Sends invitation emails to invited users
- **org-access-requested** - Notifies organization admins about access requests  
- **org-created** - Sends welcome emails to organization creators

## Features

- 🔒 **Secure HMAC-SHA256 webhook signature verification**
- 📧 **Automated Gmail email notifications via Membrane SDK**
- 🔑 **JWT-based authentication with Membrane platform**
- ⚡ **Non-blocking error handling for resilient processing**
- 📝 **Rich, templated email content for each event type**
- 🌐 **Multi-cloud deployment options**

## Cloud Platform Implementations

Choose your preferred cloud platform:

### Azure Functions
Enterprise-ready serverless functions with extensive Azure ecosystem integration.
- **[📖 Azure Functions Documentation](./azure-functions/README.md)**
- **Runtime**: Node.js v18/v20
- **Deployment**: Azure CLI with local.settings.json
- **Features**: Azure Functions Core Tools, structured logging

### AWS Lambda  
Infrastructure as Code serverless deployment with AWS SAM and Systems Manager integration.
- **[📖 AWS Lambda Documentation](./aws-lambda/README.md)**
- **Runtime**: Node.js 20.x
- **Deployment**: AWS SAM with CloudFormation
- **Features**: API Gateway, Parameter Store, Lambda Powertools

### Google Cloud Functions
Simple and direct serverless deployment with integrated Google Cloud Logging.
- **[📖 Google Cloud Functions Documentation](./google-cloud/README.md)**
- **Runtime**: Node.js 20
- **Deployment**: gcloud CLI with Functions Framework
- **Features**: HTTP triggers, Cloud Logging, auto-scaling

## Architecture

All implementations share the same core architecture:

```
Membrane Platform
       ↓ (webhook)
Cloud Function/Lambda
       ↓ (HMAC verification)
Event Processing
       ↓ (JWT auth)
Gmail Integration
       ↓
Email Notifications
```

### Security Implementation

- **HMAC-SHA256** signature verification using timing-safe comparison
- **JWT authentication** with Membrane SDK (HS512 algorithm)
- **Environment variable** based secret management
- **Raw request body** processing for signature validation

## Quick Start

1. **Choose your cloud platform** from the options above
2. **Follow the platform-specific README** for detailed setup instructions
3. **Configure Membrane integration** with Gmail send-email action
4. **Set up webhook URL** in Membrane admin console with your secret

## Prerequisites

### Membrane Platform Setup
- Gmail integration configured in Membrane workspace
- `send-email` action created for Gmail integration
- Admin access to configure webhooks

### Development Requirements
- Node.js (v18 or v20)
- TypeScript
- Cloud platform CLI tools (Azure CLI / AWS CLI / gcloud CLI)

## Configuration

All platforms use the same environment variables:

```bash
# Required
WEBHOOK_SECRET=your-webhook-secret
MEMBRANE_WORKSPACE_KEY=your-workspace-key  
MEMBRANE_WORKSPACE_SECRET=your-workspace-secret
GMAIL_CONNECTION_ID=your-gmail-connection-id
CUSTOMER_ID=your-customer-id
CUSTOMER_NAME=your-customer-name

# Optional
MEMBRANE_API_URI=  # Custom API endpoint (defaults to production)
```

## Email Templates

Each event type has customized email templates:

- **Invitation emails** include invitation URLs and organization trial information
- **Access request notifications** include requester details and affected organizations
- **Welcome emails** include organization details and setup guidance

## Development

Each platform implementation includes:
- **Local development server** for testing
- **Sample test payloads** for webhook simulation
- **TypeScript compilation** and ES module support
- **Structured logging** for debugging and monitoring

## Support

For platform-specific issues, refer to the individual README files linked above. Each contains:
- Detailed setup instructions
- Local development guidance
- Deployment procedures
- Troubleshooting tips
- Architecture details

## License

This project demonstrates multi-cloud serverless webhook handling patterns and is intended for educational and development purposes.