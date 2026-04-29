#!/bin/bash

# Backward-compatible wrapper around unified deploy entrypoint.
# Run from /var/www/henzo/apps/backend

set -euo pipefail

echo "🚀 Docker deploy wrapper"

ENVIRONMENT="production"
if [ -f ".env.staging" ]; then
  read -r -p "Environment [production/staging] (default: production): " ENV_INPUT
  if [ -n "${ENV_INPUT:-}" ]; then
    ENVIRONMENT="$ENV_INPUT"
  fi
fi

if [ "$ENVIRONMENT" = "staging" ]; then
  DEFAULT_IMAGE="${BACKEND_STAGING_IMAGE:-henzo-backend:staging}"
else
  DEFAULT_IMAGE="${BACKEND_IMAGE:-henzo-backend:prod}"
fi

read -r -p "Image ref (default: $DEFAULT_IMAGE): " IMAGE_INPUT
IMAGE_REF="${IMAGE_INPUT:-$DEFAULT_IMAGE}"

read -r -p "Run migrations? (y/n): " MIGRATE_INPUT
RUN_MIGRATIONS="false"
if [[ "$MIGRATE_INPUT" =~ ^[Yy]$ ]]; then
  RUN_MIGRATIONS="true"
fi

bash deploy/deploy-compose-service.sh --env="$ENVIRONMENT" --image="$IMAGE_REF" --migrate="$RUN_MIGRATIONS"
