# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Azure Functions TypeScript project that handles webhooks from Membrane. It receives and processes organization-related events including user invitations, access requests, and organization creation events.

## Development Commands

- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Start the Azure Functions runtime (requires prior build)
- `npm run dev` - Build and start in development mode (recommended for development)

Note: This project uses ES modules (`"type": "module"` in package.json), so ensure compatibility when adding dependencies.

## Architecture

### Core Components

- **membraneWebhook.ts** (`src/functions/membraneWebhook.ts`) - Main Azure Function that handles POST requests to `/api/webhooks/membrane`
- **HMAC Verification** - Uses timing-safe comparison to verify webhook signatures using `WEBHOOK_SECRET`
- **Event Types** - Strongly typed event handlers for:
  - `user-invited-to-org` - User invitation events
  - `org-access-requested` - Organization access requests
  - `org-created` - New organization creation events

### Security Implementation

The webhook handler implements proper security practices:
- HMAC-SHA256 signature verification using the raw request body
- Timing-safe comparison to prevent timing attacks
- Environment variable-based secret management

### Error Handling

- Returns 401 for invalid signatures
- Returns 400 for malformed JSON  
- Returns 500 for processing errors (since Membrane doesn't retry failed webhooks)
- Uses structured logging for debugging
- **Critical**: Always verify HMAC signature before parsing JSON to prevent attacks

## Configuration

- **WEBHOOK_SECRET** - Set in `local.settings.json` for development, configure in Azure for production
- **AzureWebJobsStorage** - Uses development storage by default
- Function runs on Node.js runtime with anonymous auth level

## TypeScript Setup

- Target: ES2022 with NodeNext modules
- Strict mode enabled
- Output directory: `dist/`
- Source directory: `src/`