# Google OAuth — Android (SHA-1 и package name)

Package name: **`com.henzo.mobile`**

## Checklist при ApiException: 10

1. **Тот же GCP-проект** — Android OAuth client в том же проекте, что Web Client ID из `assets/.env`.
2. **SHA-1** — для `flutter run` нужен SHA-1 **debug**; для Play Internal / release AAB — SHA-1 **upload/release** keystore (см. `docs/STORE_RELEASE.md`).
3. **Package name 1:1** — ровно `com.henzo.mobile`.
4. Подожди 2–5 минут после создания/изменения client в Console.
5. Один Android client на пару package + SHA-1.

---

## Package name

```
com.henzo.mobile
```

## SHA-1 (debug)

**keytool (Windows):**

```powershell
keytool -list -v -keystore %USERPROFILE%\.android\debug.keystore -alias androiddebugkey -storepass android -keypass android
```

**Или henzo-debug.keystore** (если есть `android/app/henzo-debug.keystore`):

```powershell
keytool -list -v -keystore apps\mobile\android\app\henzo-debug.keystore -alias henzo-debug -storepass henzo-debug -keypass henzo-debug
```

**Gradle:**

```powershell
cd apps\mobile\android
.\gradlew signingReport
```

## SHA-1 (release / Play upload)

После `android/key.properties` и `app/upload-keystore.jks`:

```powershell
keytool -list -v -keystore apps\mobile\android\app\upload-keystore.jks -alias upload
```

Добавь этот SHA-1 в Firebase (Android app `com.henzo.mobile`) и в Google Cloud → OAuth Android client.

---

## Google Cloud Console

1. [Credentials](https://console.cloud.google.com/apis/credentials) → тот же проект, что Web Client ID.
2. **Create Credentials** → **OAuth client ID** → **Android**.
3. Package: `com.henzo.mobile`.
4. SHA-1: debug и/или release (можно два client или обновить fingerprint).
5. Web Client ID в `.env` не менять (`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`).

После смены package выполни `dart run flutterfire configure` и зарегистрируй Android app в Firebase с `com.henzo.mobile`.
