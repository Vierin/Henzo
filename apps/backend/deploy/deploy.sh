#!/bin/bash

# Legacy entrypoint kept for compatibility.
# Current production deployment uses Docker Compose.

set -euo pipefail

echo "⚠️ deploy.sh now redirects to Docker Compose deploy flow."

IMAGE_REF="${BACKEND_IMAGE:-henzo-backend:prod}"
MIGRATE="false"
if [[ "${1:-}" == "--migrate" ]]; then
  MIGRATE="true"
fi

bash deploy/deploy-compose-service.sh --env=production --image="$IMAGE_REF" --migrate="$MIGRATE"
