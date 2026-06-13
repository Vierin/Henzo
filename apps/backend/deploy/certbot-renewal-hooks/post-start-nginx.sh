#!/bin/bash
# Certbot post-hook: bring nginx back after renewal (no backend pull).
set -euo pipefail

BACKEND_DIR="/var/www/henzo/apps/backend"

if [ ! -d "$BACKEND_DIR" ]; then
  echo "post-start-nginx: $BACKEND_DIR not found" >&2
  exit 1
fi

cd "$BACKEND_DIR"
docker compose up -d --no-deps nginx
