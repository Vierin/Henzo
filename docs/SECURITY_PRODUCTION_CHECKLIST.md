# Production security checklist

Run before first production deploy and after major releases.

## Environment (GitHub `production` environment)

- [ ] `HENZO_ENV=production`
- [ ] `ADMIN_ALLOWED_EMAILS` — non-empty comma-separated list
- [ ] `METRICS_SECRET` — random secret; `/metrics` requires `X-Metrics-Secret` header
- [ ] `SUPABASE_JWT_SECRET` — matches Supabase project JWT secret (HS256)
- [ ] `REVENUECAT_WEBHOOK_AUTHORIZATION` — matches RevenueCat dashboard
- [ ] `EMAIL_REMINDERS_ENABLED` — unset or `false` (push reminders only)
- [ ] Rotate before launch: `SUPABASE_SERVICE_ROLE_KEY`, webhook secrets

## Supabase Dashboard

- [ ] Apply migrations in `apps/backend/supabase/migrations/` (newest first):
  - `20260608120000_revoke_postgrest_public_access.sql`
  - `20260608140000_storage_owner_role_write.sql`
- [ ] Email confirmation enabled
- [ ] Leaked password protection on
- [ ] MFA for admin accounts

## DigitalOcean / server

- [ ] Firewall: public 443 only; block direct access to metrics/reminders ports
- [ ] Docker: non-root user where possible
- [ ] Encrypted DB backups

## CI / release

- [ ] `pnpm turbo run check-types` passes
- [ ] `flutter analyze` passes
- [ ] `bash apps/backend/scripts/security-smoke.sh` against staging API

## Smoke tests (must pass)

```bash
API_BASE=https://api-staging.henzo.app METRICS_SECRET=xxx \
  bash apps/backend/scripts/security-smoke.sh
```

## Store / compliance

- [ ] Privacy policy URL live: `https://henzo.app/en/privacy-policy`
- [ ] Fill App Store / Play data safety using `docs/legal/STORE_PRIVACY_DECLARATIONS.md`
- [ ] Account deletion works: Settings → Delete account (calls `DELETE /auth/account`)
