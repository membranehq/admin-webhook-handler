# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Google Cloud Functions TypeScript project that handles webhooks from Membrane platform. It processes organization-related events and automatically sends email notifications via Gmail integration using the Membrane SDK with JWT authentication. Built using Google Cloud Functions with HTTP triggers and Cloud Logging.

## Development Commands

- `npm run build` - Compile TypeScript to JavaScript
- `npm run dev` - Build and start local Functions Framework server
- `npm test` - Test function with sample payload locally
- `npm run deploy` - Build and deploy to Google Cloud Functions (or use `./deploy.sh`)

**Important**: This project uses ES modules (`"type": "module"` in package.json). When adding dependencies, ensure they support ES modules or use dynamic imports.

## Architecture

### Core Components

- **membraneWebhook.ts** (`src/functions/membraneWebhook.ts`) - Main Cloud Function with HTTP trigger
- **membraneService.ts** (`src/services/membraneService.ts`) - Membrane SDK integration with JWT auth and Gmail email service
- **index.ts** (`src/index.ts`) - Entry point that exports the Cloud Function
- **deploy.sh** - Deployment script for Google Cloud Functions
- **Event Processing** - Strongly typed handlers for webhook events with automatic email notifications

### Google Cloud Functions Integration

The function uses HTTP triggers for direct webhook handling:
- HTTP POST requests received directly by the function
- Express.js Request/Response objects for familiar HTTP handling
- Raw body access for HMAC signature verification
- No API Gateway needed - Cloud Functions provides the HTTP endpoint directly

### Membrane SDK Integration

The service uses `@membranehq/sdk` with JWT authentication:
- JWT tokens generated with `HS512` algorithm using workspace key/secret
- Lazy client initialization with 2-hour token expiration
- Automatic Gmail connection discovery or uses configured `GMAIL_CONNECTION_ID`
- Email sending via Gmail integration's `send-email` action

### Security Implementation

- HMAC-SHA256 signature verification using raw request body (timing-safe comparison)
- Environment variable-based secret management via .env file
- JWT-based Membrane SDK authentication
- Google Cloud Logging for structured logging with severity levels
- **Critical**: Always verify HMAC signature before JSON parsing

### Error Handling Strategy

- Returns 401 for invalid HMAC signatures
- Returns 400 for malformed JSON
- Returns 500 for processing errors (Membrane doesn't retry failed webhooks)
- Email failures logged but don't fail webhook processing (non-blocking)
- Structured logging with Google Cloud Logging for debugging with context

## Configuration

### Required Environment Variables

- **WEBHOOK_SECRET** - HMAC signature verification (set in `.env`)
- **MEMBRANE_WORKSPACE_KEY** - JWT issuer for Membrane SDK auth
- **MEMBRANE_WORKSPACE_SECRET** - JWT signing secret
- **GMAIL_CONNECTION_ID** - Gmail connection ID (optional, will auto-discover)
- **CUSTOMER_ID** - Customer identifier for JWT token
- **CUSTOMER_NAME** - Customer name for JWT token

### Optional Variables

- **MEMBRANE_API_URI** - Custom Membrane API endpoint (defaults to production)
- **GOOGLE_CLOUD_PROJECT** - Google Cloud project ID

### Google Cloud Infrastructure

- **Cloud Function** - Node.js 20 runtime with HTTP trigger
- **HTTP Trigger** - Direct public endpoint (no API Gateway needed)
- **Cloud Logging** - Automatic structured logging with severity levels
- **Functions Framework** - Local development server for testing

## Event Types & Email Templates

1. **user-invited-to-org** - Sends invitation email to invited user with invitation URL
2. **org-access-requested** - Notifies all organization admins about access requests
3. **org-created** - Sends welcome email to organization creator with org details

All email templates are inline in the webhook handler and include relevant event data.

## Development Setup

1. Install Google Cloud CLI and authenticate (`gcloud auth login`)
2. Set Google Cloud project (`gcloud config set project YOUR_PROJECT_ID`)
3. Enable Cloud Functions API (`gcloud services enable cloudfunctions.googleapis.com`)
4. Copy and configure `.env.sample` to `.env` with your credentials
5. Ensure Gmail integration is set up in Membrane with `send-email` action
6. Use `npm run dev` for local development with Functions Framework

## Deployment

Uses Google Cloud Functions with environment variables from `.env`:
- Deploy with `./deploy.sh` script or `gcloud functions deploy` command
- Environment variables automatically set from `.env` file
- Function creates HTTP endpoint at `https://REGION-PROJECT_ID.cloudfunctions.net/FUNCTION_NAME`
- Supports memory limits, timeout configuration, and auto-scaling

## Logging Strategy

Uses Google Cloud Logging with structured logging:
- `logInfo()` - INFO severity with structured data
- `logError()` - ERROR severity with error details and stack traces  
- `logWarn()` - WARNING severity for non-critical issues
- All logs include timestamps and context for better debugging