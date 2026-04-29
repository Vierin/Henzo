#!/bin/bash

# Unified Docker Compose deploy entrypoint.
# Usage:
#   bash deploy/deploy-compose-service.sh --env=staging --image=ghcr.io/org/repo/backend:staging --migrate=true
#   bash deploy/deploy-compose-service.sh --env=production --image=ghcr.io/org/repo/backend@sha256:... --migrate=false

set -euo pipefail

ENVIRONMENT=""
IMAGE_REF=""
RUN_MIGRATIONS="false"

for ARG in "$@"; do
  case "$ARG" in
    --env=*)
      ENVIRONMENT="${ARG#*=}"
      ;;
    --image=*)
      IMAGE_REF="${ARG#*=}"
      ;;
    --migrate=*)
      RUN_MIGRATIONS="${ARG#*=}"
      ;;
    *)
      echo "Unknown argument: $ARG"
      exit 1
      ;;
  esac
done

if [ -z "$ENVIRONMENT" ] || [ -z "$IMAGE_REF" ]; then
  echo "Usage: bash deploy/deploy-compose-service.sh --env=staging|production --image=<image-ref> --migrate=true|false"
  exit 1
fi

if [ "$ENVIRONMENT" = "staging" ]; then
  SERVICE="backend_staging"
  HEALTH_CMD='curl -fsS -H "Host: api-staging.henzo.app" http://127.0.0.1/health'
  export BACKEND_STAGING_IMAGE="$IMAGE_REF"
elif [ "$ENVIRONMENT" = "production" ] || [ "$ENVIRONMENT" = "prod" ]; then
  SERVICE="backend"
  HEALTH_CMD='curl -fsS http://127.0.0.1/health'
  export BACKEND_IMAGE="$IMAGE_REF"
else
  echo "Invalid --env value: $ENVIRONMENT (expected staging|production)"
  exit 1
fi

echo "Deploy target: $SERVICE"
echo "Image: $IMAGE_REF"

if [ "$RUN_MIGRATIONS" = "true" ]; then
  echo "Running migration precheck..."
  docker compose run --rm "$SERVICE" npx prisma migrate status
  echo "Applying migrations..."
  docker compose run --rm "$SERVICE" npx prisma migrate deploy
fi

echo "Pulling image..."
docker compose pull "$SERVICE"

echo "Restarting service..."
docker compose up -d --no-deps "$SERVICE"
docker compose up -d --no-deps nginx

echo "Waiting for startup..."
sleep 10

echo "Health check..."
eval "$HEALTH_CMD"

echo "Done."
docker compose ps
