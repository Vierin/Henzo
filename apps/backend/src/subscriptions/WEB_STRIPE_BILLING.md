# Web Stripe billing (ops checklist)

## One-time Stripe Dashboard

1. Products + Prices (**EUR** for Spain / Europe):

- Studio monthly / annual → `STRIPE_MONTHLY_PRICE_ID` / `STRIPE_YEARLY_PRICE_ID`
- Enterprise monthly / annual → `STRIPE_ENTERPRISE_MONTHLY_PRICE_ID` / `STRIPE_ENTERPRISE_YEARLY_PRICE_ID`
- Fallback display (optional): `FALLBACK_PRO_PRICE_MONTHLY_EUR=22.99` / enterprise `69.99`

2. Webhook endpoint: `POST https://api.henzo.app/webhooks/stripe` (staging: `api-staging`)

- Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
- Copy signing secret → `STRIPE_WEBHOOK_SECRET`

3. Customer Portal: enable in Stripe Dashboard (Settings → Billing → Customer portal)

## Backend env

See `apps/backend/.env.local.example` / `.env.staging.example`.

## DB

```bash
cd apps/backend
npx prisma migrate deploy
npx prisma generate
```

Restart the Nest process after `prisma generate` if Windows locks `query_engine-windows.dll.node`.

## Smoke test

1. Solo owner → `/salon-info/subscription` → Studio or Enterprise Checkout (test card)
2. Return URL syncs; `Subscription.billingProvider=STRIPE`, `type=STUDIO|ENTERPRISE`
3. Manage Billing → Portal → cancel at period end → webhook updates `cancelAtPeriodEnd`
4. Owner with active RC IAP → Checkout returns 409 `REVENUECAT_ACTIVE`
5. Stripe-paid owner → RC webhook with empty entitlements does **not** downgrade to Solo
