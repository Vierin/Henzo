# Firebase Android — package `com.henzo.mobile`

After renaming from `com.example.mobile`, register a new Android app in Firebase.

## Steps

1. [Firebase Console](https://console.firebase.google.com/) → project **henzo-79a1e** → Project settings → Your apps.
2. **Add app** → Android → package name **`com.henzo.mobile`**.
3. Download `google-services.json` → `apps/mobile/android/app/google-services.json` (gitignored).
4. From `apps/mobile`:

   ```powershell
   dart run flutterfire configure
   ```

   Select **henzo-79a1e**, Android package `com.henzo.mobile`, iOS `com.henzo.vn.Henzo`. This refreshes [`lib/firebase_options.dart`](../lib/firebase_options.dart).

5. Add **SHA-1** (debug + upload/release) in Firebase app settings — see [GOOGLE_OAUTH_ANDROID.md](../GOOGLE_OAUTH_ANDROID.md).

Until `google-services.json` matches `com.henzo.mobile`, release builds may fail at Gradle merge or FCM may target the wrong app.
