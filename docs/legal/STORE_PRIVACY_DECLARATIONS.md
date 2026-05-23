# App Store & Google Play — privacy declarations

Use the same answers in **App Store Connect → App Privacy** and **Google Play Console → Data safety**. They must match [DATA_MAP.md](./DATA_MAP.md) and the live Privacy Policy URL:

`https://henzo.app/en/privacy-policy`

---

## Privacy Policy URL (both stores)

```
https://henzo.app/en/privacy-policy
```

(Optional localized paths: `/ru/privacy-policy`, `/vi/privacy-policy` — body is English with banner.)

---

## Apple App Privacy (nutrition labels)

| Data type | Collected | Linked to user | Used for tracking | Purposes |
|-----------|-----------|----------------|-------------------|----------|
| Email address | Yes | Yes | No | App functionality, account |
| Name | Yes | Yes | No | App functionality |
| Phone number | Yes (optional) | Yes | No | App functionality |
| User ID | Yes | Yes | No | App functionality, analytics (if opted in) |
| Precise location | Yes (optional) | Yes | No | App functionality (nearby studios, address) |
| Coarse location | Yes (optional) | Yes | No | App functionality |
| Photos | Yes (optional) | Yes | No | App functionality (profile/studio) |
| Health & fitness | Yes (optional) | No* | No | App functionality — *read on device; not linked in backend |
| Purchase history | Yes | Yes | No | App functionality (subscription) |
| Product interaction | Yes (if analytics on) | Yes | No | Analytics |
| Crash data | Yes (if analytics on) | Yes | No | App functionality / analytics |
| Other diagnostic data | Yes (if analytics on) | Yes | No | App functionality |
| Device ID | No IDFA / no ATT | — | **Tracking: No** | — |

**Tracking:** No (no cross-app tracking; no ATT prompt).

**Health:** Declare if HealthKit is enabled — purpose App Functionality; not used for tracking or advertising.

---

## Google Play Data safety

| Question | Answer |
|----------|--------|
| Does your app collect or share user data? | Yes |
| Is all data encrypted in transit? | Yes (HTTPS/TLS) |
| Can users request account deletion? | Yes — in app (Account settings → Delete account) + described in Privacy Policy |
| Data types | See Apple table above |
| Health apps | Yes — reads Health Connect data for optional activity summary; data not uploaded to developer servers |
| Financial info | No direct collection — payments via Google Play Billing |
| Analytics | Collected only when user enables “Analytics & crash reports” in Settings |

---

## Subscription disclosures (in-app, not console)

Ensure subscription screen shows: auto-renewal, billing period, manage/cancel via store account, links to Privacy + Terms (implemented in mobile app).

---

## Account deletion

- **In-app path:** Profile / Account settings → Delete account
- **Privacy Policy:** describes erasure and retention

---

## Checklist before submit

- [ ] Privacy URL loads without login over HTTPS
- [ ] Data safety form matches Firebase, FCM, RevenueCat, location, health
- [ ] Screenshots do not show undeclared data collection
- [ ] Health Connect / HealthKit permissions match declaration
- [ ] Subscription products configured in RevenueCat + store consoles
