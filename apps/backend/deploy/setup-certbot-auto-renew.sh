#!/bin/bash
# Install certbot renewal hooks + verify systemd timer on the DO droplet.
# Run on server: bash deploy/setup-certbot-auto-renew.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PRE_HOOK="/etc/letsencrypt/renewal-hooks/pre/stop-nginx.sh"
POST_HOOK="/etc/letsencrypt/renewal-hooks/post/start-nginx.sh"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root on the server."
  exit 1
fi

install -m 755 "$SCRIPT_DIR/certbot-renewal-hooks/pre-stop-nginx.sh" "$PRE_HOOK"
install -m 755 "$SCRIPT_DIR/certbot-renewal-hooks/post-start-nginx.sh" "$POST_HOOK"

echo "Installed hooks:"
echo "  $PRE_HOOK"
echo "  $POST_HOOK"

if systemctl is-enabled certbot.timer >/dev/null 2>&1; then
  echo "certbot.timer is enabled (runs certbot renew twice daily)."
  systemctl status certbot.timer --no-pager || true
else
  echo "Enabling certbot.timer..."
  systemctl enable --now certbot.timer
fi

echo ""
echo "Dry-run renewal test..."
certbot renew --dry-run

echo ""
echo "Starting nginx if needed..."
cd /var/www/henzo/apps/backend
docker compose up -d --no-deps nginx

echo ""
echo "Done. Check: curl -I https://api.henzo.app/health"
