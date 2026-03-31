# Henzo

Monorepo for Henzo (frontend + backend + mobile).

## 1) First-time setup (install and connect)

### Requirements

- Node.js 20+
- pnpm 9
- Git
- Docker Desktop (for backend containers on server workflows; local backend can run without Docker too)

### Clone and install

```bash
git clone https://github.com/Vierin/Henzo.git
cd Henzo
pnpm install
```

### Configure environment files

Create local env files from examples (minimum):

```bash
copy apps\frontend\.env.example apps\frontend\.env.local
copy apps\backend\.env.staging.example apps\backend\.env
```

Then fill real values:

- `apps/frontend/.env.local`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_API_URL` (usually `http://localhost:3001` for local)
- `apps/backend/.env`
  - `DATABASE_URL`, `DIRECT_URL`
  - `SUPABASE_*`
  - `JWT_SECRET`
  - other provider keys you use (Brevo, Stripe, etc.)

## 2) Run locally

### Run all apps via turbo

```bash
pnpm dev
```

### Run frontend only

```bash
pnpm dev:frontend
```

Frontend default URL: `http://localhost:3000`

### Run backend only

```bash
pnpm dev:backend
```

Backend default URL: `http://localhost:3001`
Health check: `http://localhost:3001/health`

### Useful checks

```bash
pnpm lint
pnpm check-types
```

## 3) Deploy flow (staging and production)

Project uses branch-based flow:

- `staging` = test environment (auto deploy)
- `main` = production (manual deploy)

### Staging deploy (automatic)

1. Create feature branch from `staging`.
2. Commit changes.
3. Merge/push into `staging`.
4. GitHub Actions runs automatically:
   - `CI`
   - `Deploy Frontend to Vercel` (staging)
   - `Deploy Backend (staging) to DigitalOcean`

### Production deploy (manual, safe)

1. Merge `staging` into `main`.
2. Trigger GitHub Actions manually:
   - `Deploy Backend to DigitalOcean` with input `confirm=DEPLOY`
   - `Deploy Frontend to Vercel` with input `environment=production` from branch `main`

### Required GitHub Secrets (Actions)

- `DO_HOST`
- `DO_USERNAME`
- `DO_SSH_KEY`
- `GHCR_TOKEN` (if registry is private)
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `VERCEL_STAGING_ALIAS` (optional)

---

If a workflow fails, open the failed job in GitHub Actions and check the first red step. Most issues are env/secrets mismatch, missing server `.env.staging`, or lockfile mismatch.
