# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Azure Functions TypeScript project that handles webhooks from Membrane platform. It processes organization-related events and automatically sends email notifications via Gmail integration using the Membrane SDK with JWT authentication.

## Development Commands

- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Start the Azure Functions runtime (requires prior build)  
- `npm run dev` - Build and start in development mode (recommended for development)

**Important**: This project uses ES modules (`"type": "module"` in package.json). When adding dependencies, ensure they support ES modules or use dynamic imports.

## Architecture

### Core Components

- **membraneWebhook.ts** (`src/functions/membraneWebhook.ts`) - Main Azure Function handling POST `/api/webhooks/membrane`
- **membraneService.ts** (`src/services/membraneService.ts`) - Membrane SDK integration with JWT auth and Gmail email service
- **Event Processing** - Strongly typed handlers for webhook events with automatic email notifications

### Membrane SDK Integration

The service uses `@membranehq/sdk` with JWT authentication:
- JWT tokens generated with `HS512` algorithm using workspace key/secret
- Lazy client initialization with 2-hour token expiration
- Automatic Gmail connection discovery or uses configured `GMAIL_CONNECTION_ID`
- Email sending via Gmail integration's `send-email-fixed` action

### Security Implementation  

- HMAC-SHA256 signature verification using raw request body (timing-safe comparison)
- Environment variable-based secret management
- JWT-based Membrane SDK authentication
- **Critical**: Always verify HMAC signature before JSON parsing

### Error Handling Strategy

- Returns 401 for invalid HMAC signatures
- Returns 400 for malformed JSON
- Returns 500 for processing errors (Membrane doesn't retry failed webhooks)
- Email failures logged but don't fail webhook processing (non-blocking)
- Structured logging for debugging with event-specific context

## Configuration

### Required Environment Variables

- **WEBHOOK_SECRET** - HMAC signature verification (set in `local.settings.json`)
- **MEMBRANE_WORKSPACE_KEY** - JWT issuer for Membrane SDK auth
- **MEMBRANE_WORKSPACE_SECRET** - JWT signing secret  
- **GMAIL_CONNECTION_ID** - Gmail connection ID (optional, will auto-discover)
- **CUSTOMER_ID** - Customer identifier for JWT token
- **CUSTOMER_NAME** - Customer name for JWT token

### Optional Variables

- **MEMBRANE_API_URI** - Custom Membrane API endpoint (defaults to production)
- **AzureWebJobsStorage** - Azure storage connection string

## Event Types & Email Templates

1. **user-invited-to-org** - Sends invitation email to invited user with invitation URL
2. **org-access-requested** - Notifies all organization admins about access requests  
3. **org-created** - Sends welcome email to organization creator with org details

All email templates are inline in the webhook handler and include relevant event data.

## Development Setup

1. Copy `local.settings.json.sample` to `local.settings.json`
2. Configure all required environment variables
3. Ensure Gmail integration is set up in Membrane with `send-email-fixed` action
4. Use Node.js v18 or v20 (Azure Functions v4 requirement)