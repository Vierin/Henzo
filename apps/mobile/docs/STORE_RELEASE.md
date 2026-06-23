# Store releases: TestFlight & Play Internal

## Versioning

Single source: [`pubspec.yaml`](../pubspec.yaml)

```yaml
version: 1.0.0+1
#        │       └── build number (CFBundleVersion / versionCode) — bump every upload
#        └── user-facing version (CFBundleShortVersionString / versionName)
```

**Before each upload to TestFlight or Play:** increment only the build number (`+2`, `+3`, …) or both if shipping a new user-visible version.

```powershell
cd apps\mobile
# Option A: edit pubspec.yaml → version: 1.0.0+2
# Option B: CLI override
flutter build appbundle --release --build-name=1.0.0 --build-number=2
flutter build ipa --release --build-name=1.0.0 --build-number=2
```

## Android (`com.henzo.mobile`)

| Step | Action |
|------|--------|
| 1 | `copy android\key.properties.example android\key.properties` and set passwords |
| 2 | `.\android\scripts\create-upload-keystore.ps1` (once) — upload SHA-1: `70:A5:A9:76:D4:97:F8:00:6E:B7:5B:1C:0F:44:12:71:E6:13:47:94` |
| 3 | `assets/.env` from `assets/.env.production.example` (production API, not LAN). Release builds **fail at startup** if `.example` or placeholder keys are loaded (`lib/config/release_env.dart`). |
| 4 | Firebase: add Android app `com.henzo.mobile` → `dart run flutterfire configure` |
| 5 | Google OAuth Android client: package `com.henzo.mobile` + debug & release SHA-1 ([GOOGLE_OAUTH_ANDROID.md](../GOOGLE_OAUTH_ANDROID.md)) |
| 6 | RevenueCat: Android app package `com.henzo.mobile` |
| 7 | `flutter build appbundle --release` → upload `build/app/outputs/bundle/release/app-release.aab` |
| 8 | Play Console → Internal testing → add tester emails |

Release builds use **HTTPS only** (`usesCleartextTraffic=false`). Debug allows HTTP via `src/debug/AndroidManifest.xml`.

## iOS (`com.henzo.vn.Henzo`)

| Step | Action |
|------|--------|
| 1 | Same `assets/.env` as Android for release |
| 2 | Mac + Xcode: signing team `PR2HAF6344`, Distribution profile |
| 3 | `flutter build ipa --release` → Xcode Organizer or Transporter |
| 4 | App Store Connect → TestFlight → Internal testing |
| 5 | App Privacy: location, photos, HealthKit, analytics; Privacy Policy URL |
| 6 | Watch extension `com.henzo.vn.Henzo.watchkitapp` — include in archive or disable scheme if skipping Watch |

## App Store Connect checklist

- [ ] App record with bundle ID `com.henzo.vn.Henzo`
- [ ] Privacy Policy URL (same as in-app legal links)
- [ ] App Privacy questionnaire (data types collected)
- [ ] Export compliance (standard encryption, exempt if applicable)
- [ ] TestFlight internal group + testers (App Store Connect users)

## Google Play Console checklist

- [ ] App created with package **`com.henzo.mobile`** (immutable after first release)
- [ ] Store listing draft: icon 512, screenshots, short description
- [ ] App content: Data safety, Health Connect, privacy policy URL
- [ ] Internal testing track + tester list
- [ ] Upload AAB signed with upload keystore

## Pre-upload smoke (release build on device)

- [ ] Email login / register
- [ ] Google Sign-In (iOS + Android)
- [ ] Browse class / book flow
- [ ] Push notification (FCM token registers)
- [ ] Deep link: `henzo://class/...`
- [ ] API reachable from mobile data (not dev LAN)

## Windows note

If `flutter build appbundle` fails with *failed to strip debug symbols*, the AAB may still exist at `build/app/outputs/bundle/release/app-release.aab`. Fix: install Android NDK in SDK Manager, or use `useLegacyPackaging` in `android/app/build.gradle.kts` (already enabled). `kotlin.incremental=false` in `android/gradle.properties` avoids Kotlin cache errors when the project is on a different drive than the Pub cache.

## CI (optional)

Store `android/key.properties` and `upload-keystore.jks` as secrets; generate `assets/.env` from CI variables; run `flutter build appbundle` / `ipa` with `--build-number=$GITHUB_RUN_NUMBER`.
