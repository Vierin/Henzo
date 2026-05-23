# Lawyer review checklist (Henzo legal — draft 2026-05-23)

Engineering draft is in:

- [DATA_MAP.md](./DATA_MAP.md)
- [apps/frontend/src/app/[locale]/(public)/privacy-policy/page.tsx](../../apps/frontend/src/app/[locale]/(public)/privacy-policy/page.tsx)
- [apps/frontend/src/app/[locale]/(public)/terms-of-service/page.tsx](../../apps/frontend/src/app/[locale]/(public)/terms-of-service/page.tsx)

**Status:** Draft for counsel — not final legal advice.

## Must confirm

- [ ] Data controller block (IVAN VIERIN PEREBIICHUK, NIP, Poland) accurate
- [ ] Minimum age **16** and removal of “all ages” language appropriate for EU + target markets
- [ ] GDPR legal bases: analytics/crash/push — consent vs legitimate interest
- [ ] Health data: on-device only, no sale, no ads — sufficient for HealthKit / Health Connect
- [ ] Auto-renewable subscription clauses (Apple 3.1.2 / Google subscriptions policy)
- [ ] Liability limitations for independent fitness studios and training injury
- [ ] SEA / Vietnam PDPA if processing Vietnamese residents’ data
- [ ] International transfers and SCCs for US processors (Firebase, RevenueCat, Google)
- [ ] Account deletion retention (3 years post-delete) vs actual backend behavior
- [ ] Telegram as feedback processor — DPA / disclosure

## Nice to have

- [ ] Polish summary page (`/pl/privacy-policy`) linking to English full text
- [ ] Russian/Vietnamese translations or “English prevails” disclaimer wording
- [ ] Cookie policy separation if marketing cookies expand

## Sign-off

| Role | Name | Date |
|------|------|------|
| Counsel | | |
| Product owner | | |
