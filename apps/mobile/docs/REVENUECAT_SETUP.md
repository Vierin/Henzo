# RevenueCat (App Store / Google Play)

Mobile Pro subscriptions use **RevenueCat** + native IAP. Stripe Checkout in the app is disabled.

## 1. RevenueCat project

1. Create a project at [revenuecat.com](https://www.revenuecat.com).
2. Add **iOS** (`com.henzo.vn.Henzo`) and **Android** (`com.henzo.app`) apps.
3. Connect **App Store Connect** (shared secret / App Store Connect API) and **Google Play** (service account JSON).
4. Create entitlement **`pro`** (or set `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID`).
5. Create products in App Store Connect & Play Console, link them in RevenueCat.
6. Create an **Offering** (e.g. `default`) with packages:
   - **Monthly** (`$rc_monthly` or custom)
   - **Annual** (`$rc_annual` or custom)

## 2. Mobile env (`assets/.env`)

```env
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_...
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=goog_...
EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID=pro
```

## 3. Backend env

```env
REVENUECAT_SECRET_API_KEY=sk_...
REVENUECAT_ENTITLEMENT_ID=pro
REVENUECAT_WEBHOOK_AUTHORIZATION=<random-secret>
```

Webhook URL (production):

`POST https://api.henzo.app/webhooks/revenuecat`

Header: `Authorization: Bearer <REVENUECAT_WEBHOOK_AUTHORIZATION>` (same value in RevenueCat dashboard).

## 4. App Review

- Provide sandbox Apple ID / Google license tester in review notes.
- **Restore purchases** is on the Subscription screen.
- Do not link to external payment for Pro inside the app.

## 5. Stripe

Keep Stripe for **web** checkout only. Mobile uses `POST /subscriptions/sync-revenuecat` after purchase/restore.
