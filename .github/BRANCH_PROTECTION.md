# Ветки и защита `staging` + `main` (сделать в GitHub вручную)

1. Создай ветку **`staging`** от `main` и пушни: feature-ветки мержатся в `staging`, релизы идут `staging -> main`.
2. Для private-репозитория на GitHub Free branch protection/rulesets могут не применяться. Для MVP solo это нормально: используем дисциплину веток и ручной production deploy.
3. **Settings -> Branches -> Branch protection rules** (если доступны на твоем плане):
   - для `main`: Require a pull request before merging + Require status checks (**Lint and typecheck** из `CI`) + запрет прямого push.
   - для `staging`: минимум Require status checks (**Lint and typecheck**), PR требование по желанию.
4. **Settings -> Environments** (рекомендуется):
   - `staging` environment: доступ к staging секретам.
   - `production` environment: отдельные prod секреты и опционально required reviewers.

## GitHub secrets (минимум)

- `DO_HOST`
- `DO_USERNAME`
- `DO_SSH_KEY`
- `GHCR_TOKEN` (если registry приватный)
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `VERCEL_STAGING_ALIAS` (опционально, например `staging.henzo.app`)

Сервер: первый staging деплой на дроплете один раз `git checkout staging && git pull`, создай `apps/backend/.env.staging` по `.env.staging.example`, затем `docker compose up -d`.

## Простой flow для solo MVP

- Любые изменения: `feature/* -> staging` (можно прямым push, если один разработчик).
- `staging` деплоится автоматически (frontend preview + backend staging).
- Прод деплой только вручную из `main`:
  - backend: workflow `Deploy Backend to DigitalOcean` (ввести `DEPLOY`).
  - frontend: workflow `Deploy Frontend to Vercel` с `environment=production`, запускать из `main`.
