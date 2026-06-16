#!/bin/bash
# Certbot pre-hook: free ports 80/443 for standalone renewal.
set -euo pipefail

BACKEND_DIR="/var/www/henzo/apps/backend"

if [ ! -d "$BACKEND_DIR" ]; then
  echo "pre-stop-nginx: $BACKEND_DIR not found" >&2
  exit 1
fi

cd "$BACKEND_DIR"
docker compose stop nginx || true
