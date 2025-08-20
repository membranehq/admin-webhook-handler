#!/bin/bash

# Deploy script for Google Cloud Functions

set -e

# Configuration
FUNCTION_NAME="membrane-webhook"
RUNTIME="nodejs20"
MEMORY="256MB"
TIMEOUT="540s"
REGION="us-central1"

echo "🏗️  Building TypeScript..."
npm run build

echo "🚀 Deploying to Google Cloud Functions..."

# Deploy the function
gcloud functions deploy $FUNCTION_NAME \
  --runtime=$RUNTIME \
  --trigger-http \
  --entry-point=membraneWebhook \
  --memory=$MEMORY \
  --timeout=$TIMEOUT \
  --region=$REGION \
  --allow-unauthenticated \
  --set-env-vars="$(cat .env | grep -v '^#' | paste -sd ',' -)" \
  --source=. \
  --max-instances=10

echo "✅ Deployment completed!"

# Get the function URL
FUNCTION_URL=$(gcloud functions describe $FUNCTION_NAME --region=$REGION --format="value(httpsTrigger.url)")
echo "🔗 Function URL: $FUNCTION_URL"

echo ""
echo "📝 Configure this URL in your Membrane webhook settings:"
echo "   URL: $FUNCTION_URL"
echo "   Secret: [Your WEBHOOK_SECRET value]"