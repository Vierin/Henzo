#!/usr/bin/env bash
# Update "Evaluador Ofertes Licitador" workflow in n8n by name (overwrites existing).
# Requires n8n to be RUNNING and N8N_API_KEY set (or pass as first arg).
# Usage: ./scripts/update-evaluador-workflow.sh [API_KEY]
#        N8N_BASE_URL defaults to http://localhost:5678

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
WF_JSON="$ROOT_DIR/workflows/Evaluador Ofertes Licitador.json"
WORKFLOW_NAME="Evaluador Ofertes Licitador"

BASE_URL="${N8N_BASE_URL:-http://localhost:5678}"
API_KEY="${1:-${N8N_API_KEY:-}}"

if [[ ! -f "$WF_JSON" ]]; then
  echo "Error: Workflow file not found: $WF_JSON"
  exit 1
fi

if [[ -z "$API_KEY" ]]; then
  echo "Error: N8N_API_KEY not set and no API key passed."
  echo "Create an API key in n8n: Settings → API → Create API Key"
  echo "Usage: N8N_API_KEY=your_key $0"
  echo "   or: $0 your_key"
  exit 1
fi

# Find workflow id by name
RESP=$(curl -s -w "\n%{http_code}" -H "X-N8N-API-KEY: $API_KEY" \
  "$BASE_URL/api/v1/workflows?name=$WORKFLOW_NAME")
HTTP_BODY=$(echo "$RESP" | head -n -1)
HTTP_CODE=$(echo "$RESP" | tail -n 1)

if [[ "$HTTP_CODE" != "200" ]]; then
  echo "Error: GET workflows returned HTTP $HTTP_CODE"
  echo "$HTTP_BODY" | head -5
  exit 1
fi

# n8n returns { data: [ { id, name, ... } ], nextCursor }
WF_ID=""
if command -v jq &>/dev/null; then
  WF_ID=$(echo "$HTTP_BODY" | jq -r --arg n "$WORKFLOW_NAME" '.data[] | select(.name == $n) | .id // empty')
fi
if [[ -z "$WF_ID" ]] && command -v node &>/dev/null; then
  WF_ID=$(node -e "const d=JSON.parse(process.argv[1]); const w=d.data&&d.data.find(x=>x.name===process.argv[2]); console.log(w?w.id:'')" "$HTTP_BODY" "$WORKFLOW_NAME")
fi
if [[ -z "$WF_ID" ]]; then
  echo "Error: Workflow '$WORKFLOW_NAME' not found. Create it once via UI or import, then run this script."
  echo "Hint: Install jq or ensure node is in PATH for automatic ID detection."
  exit 1
fi

# Build update payload: API expects name, nodes, connections, settings (and optionally staticData, tags)
# Our JSON has name, nodes, connections, pinData, settings, versionId, meta, tags
PAYLOAD=$(cat "$WF_JSON")

# PUT update
UPDATED=$(curl -s -w "\n%{http_code}" -X PUT \
  -H "X-N8N-API-KEY: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  "$BASE_URL/api/v1/workflows/$WF_ID")
UPD_BODY=$(echo "$UPDATED" | head -n -1)
UPD_CODE=$(echo "$UPDATED" | tail -n 1)

if [[ "$UPD_CODE" != "200" ]]; then
  echo "Error: PUT workflow returned HTTP $UPD_CODE"
  echo "$UPD_BODY" | head -20
  exit 1
fi

echo "OK: Workflow '$WORKFLOW_NAME' (id=$WF_ID) updated."
