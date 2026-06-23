# App Store Connect & Google Play — internal testing checklist

Manual steps in vendor consoles (cannot be automated from the repo).

## Google Play Console (`com.henzo.mobile`)

- [ ] Create app with package **`com.henzo.mobile`** (immutable after first release)
- [ ] Store listing: app name, short/full description, icon 512×512, feature graphic 1024×500, ≥2 phone screenshots
- [ ] **App content** → Privacy policy URL (e.g. `https://henzo.app/privacy-policy`)
- [ ] **Data safety** form (location, photos, health, account, analytics)
- [ ] **Health apps** / Health Connect declaration if applicable
- [ ] **Target audience** and content rating questionnaire
- [ ] **Release** → Testing → **Internal testing** → upload AAB from `build/app/outputs/bundle/release/app-release.aab`
- [ ] Add tester emails to internal testing list
- [ ] Register **upload key** SHA-1 in Firebase + Google OAuth ([STORE_RELEASE.md](STORE_RELEASE.md))
- [ ] **App Links** (deep links): manifest uses `www.henzo.app` (apex `henzo.app` redirects → Google verification fails). After first Play upload, add **App signing key certificate** SHA-256 from Play Console → Setup → App integrity to `apps/frontend/public/.well-known/assetlinks.json`, redeploy frontend, upload new AAB. Verify: `https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://www.henzo.app&relation=delegate_permission/common.handle_all_urls`

## App Store Connect (`com.henzo.vn.Henzo`)

- [ ] App record with bundle ID `com.henzo.vn.Henzo`
- [ ] Privacy Policy URL
- [ ] **App Privacy** (nutrition labels): location, photos, HealthKit, user ID, crash/diagnostics (Firebase)
- [ ] Export compliance (standard encryption — typically exempt)
- [ ] Upload build via Xcode / Transporter (`flutter build ipa --release`)
- [ ] **TestFlight** → Internal Testing → add testers (App Store Connect users, max 100)
- [ ] If shipping Watch: provisioning for `com.henzo.vn.Henzo.watchkitapp`

## RevenueCat

- [ ] iOS app: `com.henzo.vn.Henzo`
- [ ] Android app: `com.henzo.mobile`
- [ ] Test Store keys OK for internal; switch to `appl_` / `goog_` before public release

## Firebase

- [ ] Android app `com.henzo.mobile` registered with debug + upload SHA-1 ([FIREBASE_ANDROID.md](FIREBASE_ANDROID.md))
- [ ] iOS app `com.henzo.vn.Henzo` unchanged
