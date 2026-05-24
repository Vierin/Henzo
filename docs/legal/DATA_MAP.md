# Henzo — Data Map (for legal review)

**Product:** B2B SaaS for fitness studios (owners/staff) + client mobile app for discovering studios, booking training sessions, and managing profile.

**Data controller:** IVAN VIERIN PEREBIICHUK (NIP PL5252954316), Poland, brand Henzo, contact hello@henzo.app

**Markets:** EU/PL (primary controller jurisdiction), Southeast Asia (e.g. Vietnam), Russia/CIS via localized UI (legal text English unless translated).

**Last reviewed (engineering):** 2026-05-23

---

## Applications in scope

| Surface     | Package / ID                             | Notes                                          |
| ----------- | ---------------------------------------- | ---------------------------------------------- |
| iOS app     | `com.henzo.app` (verify in Xcode)        | HealthKit read-only, IAP via RevenueCat        |
| Android app | `com.henzo.app` (verify in build.gradle) | Health Connect, IAP, FCM                       |
| Web         | henzo.app                                | Next.js, cookie banner, Google Analytics (web) |

---

## Data categories

| Category            | Fields                                                        | Source                                 | Stored / processed by                      | Legal basis (draft)                  | Retention                                                  |
| ------------------- | ------------------------------------------------------------- | -------------------------------------- | ------------------------------------------ | ------------------------------------ | ---------------------------------------------------------- |
| Account             | email, password (hashed), name, phone, role                   | User registration / profile            | Supabase Auth + Henzo API DB               | Contract                             | Active account + 3y after deletion (tax/legal per Privacy) |
| OAuth               | email, name, avatar URL                                       | Google Sign-In                         | Supabase                                   | Contract                             | Same as account                                            |
| Studio (owner)      | business name, address, lat/lon, photos, schedule, services   | Owner onboarding                       | API + Supabase Storage `studio-photos`     | Contract                             | Same as account                                            |
| Client booking      | session times, enrollments, notes                             | In-app actions                         | API DB                                     | Contract                             | Per booking/studio policies                                |
| Location            | city, coarse/precise lat-lon (if permitted)                   | Client explore, map picker             | Device SharedPreferences + API             | Consent (permission) + contract      | Until account delete / user clears                         |
| Push                | FCM token, platform, app language                             | After login                            | Henzo API `POST /notifications/push-token` | Consent (OS) + contract              | Until logout/delete                                        |
| Analytics           | events (`app_opened`, `paywall_opened`), userId, role, locale | Mobile app (opt-in toggle in Settings) | Google Firebase Analytics                  | Consent                              | Per Firebase (~14 months default)                          |
| Crash diagnostics   | stack traces, userId (if opted in)                            | Automatic on crash                     | Firebase Crashlytics                       | Consent (linked to analytics toggle) | Per Firebase                                               |
| IAP / subscription  | product IDs, entitlement status, store receipts metadata      | Purchase / restore                     | Apple/Google → RevenueCat → Henzo API sync | Contract                             | Active subscription + legal retention                      |
| Health & fitness    | steps, active/total calories, workouts                        | User grants HealthKit / Health Connect | **On device only** — not sent to Henzo API | Consent (OS health permission)       | Not stored on Henzo servers                                |
| Photos              | profile/studio images                                         | Gallery picker                         | Supabase Storage                           | Contract                             | Until user deletes / account deletion                      |
| Feedback            | name, email, message, userId, role, platform                  | Contact form in app                    | API → Telegram notification                | Contract / legitimate interest       | Support retention                                          |
| Web analytics       | IP (anonymized), pages, device                                | Website                                | Google Analytics G-KBLFJ1533R              | Consent (cookie banner)              | 26 months (GA default)                                     |
| Email               | address, name                                                 | Transactional / marketing              | Brevo                                      | Contract / consent                   | Per Brevo + Privacy                                        |
| Infrastructure logs | IP, user-agent, timestamps                                    | All HTTP                               | Hosting (Vercel), Supabase                 | Legitimate interest                  | Short rolling logs                                         |

---

## Processors & subprocessors

| Vendor                        | Purpose                     | Data shared                                                      | Region (typical)                              |
| ----------------------------- | --------------------------- | ---------------------------------------------------------------- | --------------------------------------------- |
| Supabase                      | Auth, DB, file storage      | Account, studio, photos                                          | EU/US (project region — confirm in dashboard) |
| Google Firebase               | Analytics, Crashlytics, FCM | Usage, crashes, push token                                       | US                                            |
| Google OAuth                  | Sign-in                     | Email, name, profile photo                                       | US                                            |
| RevenueCat                    | Subscription management     | App user ID, purchase events                                     | US                                            |
| Apple App Store / Google Play | Payment processing          | Payment handled by store; Henzo receives entitlement status only | Per user store region                         |
| Brevo                         | Email delivery              | Email, name, booking content                                     | EU                                            |
| Vercel                        | Web hosting                 | Server logs                                                      | US/EU                                         |
| CARTO / OpenStreetMap         | Map tiles                   | No PII (map display)                                             | EU/US                                         |
| Telegram                      | Feedback routing            | Feedback message content                                         | Confirm hosting with ops                      |

---

## User rights (implementation)

- **Access / rectification:** profile screens + hello@henzo.app
- **Erasure:** in-app Delete account (Settings / profile) → `DELETE` flow in backend `deleteUserAccount`
- **Analytics opt-out:** Settings → “Analytics & crash reports” toggle → Firebase collection disabled
- **Push:** revoke in OS settings; token removed on logout
- **Health:** revoke in Apple Health / Health Connect; no server copy to delete

---

## Children

**Engineering recommendation:** minimum age **16** for self-registration (GDPR Art. 8 Poland). Under 16 requires parental consent flow (not implemented in app).

---

## Cross-border transfers

- US: Google (Firebase, OAuth, Analytics), RevenueCat, possibly Vercel
- EU: Brevo, Supabase (if EU project)
- Standard contractual clauses / vendor DPAs to be confirmed by counsel

---

## Store console alignment

See [STORE_PRIVACY_DECLARATIONS.md](./STORE_PRIVACY_DECLARATIONS.md) for App Store Privacy labels and Google Play Data safety answers that must match this map.

---

## Open questions for counsel

1. PDPA (Vietnam) and other SEA requirements for studio client data?
2. Analytics default-off vs opt-in under GDPR — confirm consent UX is sufficient
3. Health data wording for App Store “Health & Fitness” label
4. Subscription refund wording vs Apple/Google mandatory policies
5. English-only legal pages with RU/VI UI —是否需要 PL summary page?
