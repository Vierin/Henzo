# Backend Deploy Runbook (Docker Compose)

This is the current deployment model for `apps/backend`:

- one DigitalOcean server;
- two backend services in `docker compose`: `backend_staging` and `backend`;
- production is deployed by promoting the already-validated staging image digest (no rebuild on prod deploy).

## Required server layout

- repo cloned at `/var/www/henzo`
- backend path: `/var/www/henzo/apps/backend`
- env files:
  - `.env.staging` for `backend_staging`
  - `.env.production` for `backend`

## Unified deploy entrypoint

Use one script for both environments:

```bash
bash deploy/deploy-compose-service.sh --env=staging|production --image=<image-ref> --migrate=true|false
```

Examples:

```bash
# staging by tag
bash deploy/deploy-compose-service.sh --env=staging --image=ghcr.io/<org>/<repo>/backend:staging --migrate=true

# production by digest
bash deploy/deploy-compose-service.sh --env=production --image=ghcr.io/<org>/<repo>/backend@sha256:<digest> --migrate=true
```

## Promotion flow (staging -> prod)

1. `staging` workflow builds and pushes backend image.
2. Staging deploy uses exact image digest.
3. After QA signoff, merge `staging` → `main` and run **Deploy Backend to DigitalOcean** (or push to `main` with environment approval). The workflow promotes the staging image digest and runs `prisma migrate status` + `prisma migrate deploy` on production automatically via `deploy-compose-service.sh --migrate=true`.

## Rollback

Rollback does not rebuild code.
Redeploy previous known-good digest:

```bash
bash deploy/deploy-compose-service.sh --env=production --image=ghcr.io/<org>/<repo>/backend@sha256:<previous_digest> --migrate=false
```

## Migration failure runbook

If migrations fail in deploy:

1. stop rollout (do not continue to restart unrelated services);
2. inspect migration status/logs:

```bash
docker compose run --rm backend npx prisma migrate status
docker compose logs backend
```

3. fix migration in code and redeploy from staging flow;
4. avoid manual schema drift in production database.

## Troubleshooting quick commands

```bash
docker compose ps
docker compose logs -f backend
docker compose logs -f backend_staging
docker compose logs -f nginx
curl -fsS http://127.0.0.1/health
curl -fsS -H "Host: api-staging.henzo.app" http://127.0.0.1/health
```
