#!/bin/bash

# AyuSphere Vercel Management Utility 🚀

# Load environment
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env.vercel"

if [ -f "$ENV_FILE" ]; then
    export $(grep -v '^#' "$ENV_FILE" | xargs)
fi

if [[ -z "$VERCEL_ACCESS_TOKEN" || "$VERCEL_ACCESS_TOKEN" == "PLACEHOLDER_TOKEN" ]]; then
    echo "❌ Error: Vercel Access Token not set in .env.vercel."
    exit 1
fi

# API Endpoints
API_BASE="https://api.vercel.com"
PROJECT_ID="$VERCEL_PROJECT_ID"
AUTH_HEADER="Authorization: Bearer $VERCEL_ACCESS_TOKEN"

# ── Actions ──

case "$1" in
    "status")
        echo "📡 Fetching latest deployment status..."
        curl -s -H "$AUTH_HEADER" "$API_BASE/v6/deployments?projectId=$PROJECT_ID&limit=1" | \
        python3 -c "import sys, json; data = json.load(sys.stdin); dep = data['deployments'][0]; print(f'Deployment: {dep[\"url\"]}\nStatus: {dep[\"state\"]}\nCreated: {dep[\"createdAt\"]}')"
        ;;

    "deploy")
        echo "🚀 Triggering new deployment for main branch..."
        curl -s -X POST -H "$AUTH_HEADER" \
        -d "{\"name\":\"ayusphere-frontend\",\"gitSource\":{\"type\":\"github\",\"repoId\":\"$(curl -s -H "$AUTH_HEADER" "$API_BASE/v9/projects/$PROJECT_ID" | python3 -c 'import sys, json; print(json.load(sys.stdin)["link"]["repoId"])')\",\"ref\":\"main\"}}" \
        "$API_BASE/v13/deployments" | \
        python3 -c "import sys, json; data = json.load(sys.stdin); print(f'Deployment ID: {data[\"id\"]}\nURL: {data[\"url\"]}')"
        ;;

    "env")
        if [[ -z "$2" || -z "$3" ]]; then
            echo "Usage: $0 env [KEY] [VALUE]"
            exit 1
        fi
        echo "⚙️ Setting environment variable $2..."
        curl -s -X POST -H "$AUTH_HEADER" \
        -d "{\"key\":\"$2\",\"value\":\"$3\",\"type\":\"plain\",\"target\":[\"production\",\"preview\",\"development\"]}" \
        "$API_BASE/v10/projects/$PROJECT_ID/env" | \
        python3 -c "import sys, json; data = json.load(sys.stdin); print('Environment variable updated successfully.' if 'id' in data else 'Error updating.')"
        ;;

    "logs")
        if [[ -z "$2" ]]; then
            # Get latest deployment ID first
            DEPLOY_ID=$(curl -s -H "$AUTH_HEADER" "$API_BASE/v6/deployments?projectId=$PROJECT_ID&limit=1" | python3 -c "import sys, json; print(json.load(sys.stdin)['deployments'][0]['uid'])")
        else
            DEPLOY_ID="$2"
        fi
        echo "📜 Fetching logs for $DEPLOY_ID..."
        curl -s -H "$AUTH_HEADER" "$API_BASE/v2/deployments/$DEPLOY_ID/events?limit=50" | \
        python3 -c "import sys, json; data = json.load(sys.stdin); [print(f'[{e[\"type\"]}] {e[\"text\"]}') for e in data]"
        ;;

    *)
        echo "Usage: $0 {status|deploy|env|logs}"
        echo "  status: Show latest deployment status"
        echo "  deploy: Trigger a new deployment"
        echo "  env: Set a project environment variable"
        echo "  logs: Show recent build/edge logs"
        exit 1
        ;;
esac
