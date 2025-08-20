# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AWS Lambda TypeScript project that handles webhooks from Membrane platform. It processes organization-related events and automatically sends email notifications via Gmail integration using the Membrane SDK with JWT authentication. Built using AWS SAM (Serverless Application Model) for deployment.

## Development Commands

- `npm run build` - Compile TypeScript to JavaScript
- `npm run dev` - Build and start SAM local API for development
- `npm test` - Test function with sample event locally
- `npm run deploy` - Build and deploy to AWS

**Important**: This project uses ES modules (`"type": "module"` in package.json). When adding dependencies, ensure they support ES modules or use dynamic imports.

## Architecture

### Core Components

- **membraneWebhook.ts** (`src/handlers/membraneWebhook.ts`) - Main Lambda function handling POST requests via API Gateway
- **membraneService.ts** (`src/services/membraneService.ts`) - Membrane SDK integration with JWT auth and Gmail email service
- **template.yaml** - AWS SAM CloudFormation template for infrastructure as code
- **Event Processing** - Strongly typed handlers for webhook events with automatic email notifications

### AWS Lambda & API Gateway Integration

The Lambda function integrates with API Gateway to handle HTTP requests:
- API Gateway receives POST requests at `/webhooks/membrane`
- Raw request body and headers passed to Lambda handler
- Lambda processes webhook and returns appropriate HTTP responses
- CORS enabled for cross-origin requests

### Membrane SDK Integration

The service uses `@membranehq/sdk` with JWT authentication:
- JWT tokens generated with `HS512` algorithm using workspace key/secret
- Lazy client initialization with 2-hour token expiration
- Automatic Gmail connection discovery or uses configured `GMAIL_CONNECTION_ID`
- Email sending via Gmail integration's `send-email-fixed` action

### Security Implementation

- HMAC-SHA256 signature verification using raw request body (timing-safe comparison)
- Environment variable-based secret management via AWS Systems Manager Parameter Store
- JWT-based Membrane SDK authentication
- AWS Lambda Powertools for structured logging
- **Critical**: Always verify HMAC signature before JSON parsing

### Error Handling Strategy

- Returns 401 for invalid HMAC signatures
- Returns 400 for malformed JSON
- Returns 500 for processing errors (Membrane doesn't retry failed webhooks)
- Email failures logged but don't fail webhook processing (non-blocking)
- Structured logging with AWS Lambda Powertools for debugging

## Configuration

### Required Environment Variables

- **WEBHOOK_SECRET** - HMAC signature verification (stored in SSM Parameter Store)
- **MEMBRANE_WORKSPACE_KEY** - JWT issuer for Membrane SDK auth
- **MEMBRANE_WORKSPACE_SECRET** - JWT signing secret
- **GMAIL_CONNECTION_ID** - Gmail connection ID (optional, will auto-discover)
- **CUSTOMER_ID** - Customer identifier for JWT token
- **CUSTOMER_NAME** - Customer name for JWT token

### Optional Variables

- **MEMBRANE_API_URI** - Custom Membrane API endpoint (defaults to production)

### AWS Infrastructure

- **Lambda Function** - Node.js 20.x runtime with 256MB memory and 30s timeout
- **API Gateway** - Regional endpoint with CORS enabled
- **CloudWatch Logs** - Automatic logging with structured format
- **Systems Manager** - Parameter Store for secure configuration management

## Event Types & Email Templates

1. **user-invited-to-org** - Sends invitation email to invited user with invitation URL
2. **org-access-requested** - Notifies all organization admins about access requests
3. **org-created** - Sends welcome email to organization creator with org details

All email templates are inline in the webhook handler and include relevant event data.

## Development Setup

1. Install AWS CLI and configure credentials
2. Install SAM CLI (`pip install aws-sam-cli`)
3. Copy and configure `env.json` with your credentials
4. Ensure Gmail integration is set up in Membrane with `send-email-fixed` action
5. Use `npm run dev` for local development with SAM local API

## Deployment

Uses AWS SAM for infrastructure as code:
- Store configuration in Systems Manager Parameter Store
- Deploy with `sam deploy --guided` or `npm run deploy`
- Stack creates Lambda function, API Gateway, and required IAM roles
- Environment-specific deployments (dev/staging/prod) supported