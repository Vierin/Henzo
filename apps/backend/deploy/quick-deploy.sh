#!/bin/bash

# Quick deploy wrapper (no migrations).

set -euo pipefail

cd /var/www/henzo/apps/backend

IMAGE_REF="${BACKEND_IMAGE:-henzo-backend:prod}"

echo "🔄 Quick Docker deploy for production"
bash deploy/deploy-compose-service.sh --env=production --image="$IMAGE_REF" --migrate=false
