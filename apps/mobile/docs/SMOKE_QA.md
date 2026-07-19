# Release smoke QA (device, cellular)

Run on a **release** build (`flutter run --release` or TestFlight / Internal Testing APK), not debug on LAN.

## Client

- [ ] Email login / register (OTP)
- [ ] Google Sign-In (iOS + Android)
- [ ] Home → browse → studio → class → book → confirmation
- [ ] Activity: upcoming cancel; passes tap opens studio
- [ ] Favorites, leave review
- [ ] Profile stats; Health Connect (Android) if enabled
- [ ] Push: allow notifications; verify token registers (backend)
- [ ] Deep link `henzo://class?...` opens class detail
- [ ] Map overlay opens from home (basic; full search is post-release)

## Owner

- [ ] Business registration / login
- [ ] Onboarding checklist → publish studio
- [ ] Studio profile, photos, booking window
- [ ] Create training; calendar session; attendance
- [ ] Clients list; add client
- [ ] Staff list
- [ ] Settings: booking link; reviews list
- [ ] Pro: IAP purchase + restore (RevenueCat)
- [ ] Push on new booking (owner)

## Known limitations (tell testers)

- No mobile app for **staff** role (OWNER / CLIENT only).
- **Analytics** screen not in app yet (planned for Pro).
- **Map** search / list → studio navigation — later release.
- Pro billing is **App Store / Play IAP** only (no Stripe in app).
- No in-app payouts to studio clients (subscription is Henzo Pro only).

## Env / build

- Release must use real `assets/.env` (not `*.example`); app throws on startup if placeholders detected.
- Bump `version` build number in `pubspec.yaml` before each store upload.

See also [`STORE_RELEASE.md`](STORE_RELEASE.md) and [`STORE_CONSOLE_CHECKLIST.md`](STORE_CONSOLE_CHECKLIST.md).
