#!/usr/bin/env bash
# Quick security smoke checks against a running API (staging/prod).
# Usage: API_BASE=https://api-staging.henzo.app bash scripts/security-smoke.sh

set -euo pipefail

API_BASE="${API_BASE:-http://localhost:3001}"
API_BASE="${API_BASE%/}"

fail() {
  echo "FAIL: $1"
  exit 1
}

pass() {
  echo "OK: $1"
}

code_reminders="$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API_BASE/reminders/send" || true)"
if [ "$code_reminders" = "404" ] || [ "$code_reminders" = "401" ] || [ "$code_reminders" = "403" ]; then
  pass "POST /reminders/send removed or blocked ($code_reminders)"
else
  fail "POST /reminders/send returned $code_reminders (expected 401/403/404)"
fi

code_reminders_get="$(curl -s -o /dev/null -w '%{http_code}' "$API_BASE/reminders/test" || true)"
if [ "$code_reminders_get" = "404" ] || [ "$code_reminders_get" = "401" ]; then
  pass "GET /reminders/test removed or blocked ($code_reminders_get)"
else
  fail "GET /reminders/test returned $code_reminders_get"
fi

code_register="$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API_BASE/auth/register-client" \
  -H 'Content-Type: application/json' \
  -d '{"email":"smoke@example.com","password":"secret12","name":"Smoke"}' || true)"
if [ "$code_register" = "410" ] || [ "$code_register" = "400" ] || [ "$code_register" = "401" ]; then
  pass "POST /auth/register-client restricted ($code_register)"
else
  fail "POST /auth/register-client returned $code_register"
fi

slug_body="$(curl -s "$API_BASE/studios/by-slug/nonexistent-studio-slug-xyz" || true)"
if echo "$slug_body" | grep -qi 'ownerId'; then
  fail "/studios/by-slug leaks ownerId"
else
  pass "/studios/by-slug does not expose ownerId"
fi

if [ -n "${METRICS_SECRET:-}" ]; then
  code_metrics="$(curl -s -o /dev/null -w '%{http_code}' "$API_BASE/metrics" || true)"
  if [ "$code_metrics" = "401" ]; then
    pass "/metrics requires secret when METRICS_SECRET set"
  else
    fail "/metrics returned $code_metrics without secret"
  fi
else
  echo "SKIP: METRICS_SECRET not set — /metrics check skipped"
fi

code_trainer="$(curl -s -o /dev/null -w '%{http_code}' "$API_BASE/trainers/fake-trainer-id-xyz" || true)"
if [ "$code_trainer" = "200" ]; then
  trainer_body="$(curl -s "$API_BASE/trainers/fake-trainer-id-xyz" || true)"
  if echo "$trainer_body" | grep -qiE '"email"|"phone"'; then
    fail "GET /trainers/:id leaks email/phone without auth"
  else
    pass "GET /trainers/:id public response sanitized"
  fi
elif [ "$code_trainer" = "404" ]; then
  pass "GET /trainers/:id requires no auth for public profile (404 ok)"
else
  fail "GET /trainers/:id returned $code_trainer"
fi

code_protected="$(curl -s -o /dev/null -w '%{http_code}' "$API_BASE/subscriptions/current" || true)"
if [ "$code_protected" = "401" ]; then
  pass "GET /subscriptions/current requires auth ($code_protected)"
else
  fail "GET /subscriptions/current returned $code_protected (expected 401)"
fi

echo "Security smoke checks finished."
