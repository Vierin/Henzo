# Ветки и защита `main` (сделать в GitHub вручную)

1. Создай ветку **`develop`** от `main` и пушни: дальше feature-ветки вливаешь в `develop`, в **`main`** только релизы из `develop`.
2. **Settings → Branches → Branch protection rules** для `main`:
   - Require a pull request before merging
   - Require status checks to pass: выбери job **Lint and typecheck** из workflow `CI`
   - (по желанию) Restrict who can push — запрет прямого push в `main`
3. Для **`develop`** можно включить только required CI без полного запрета push (удобно соло).

Сервер: первый деплой staging — на дроплете один раз `git checkout develop && git pull`, создай `apps/backend/.env.staging` по `.env.staging.example`, подними `docker compose up -d`.
