'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SettingsSubpageShell } from '@/components/owner/settingsSubpageShell';
import { useTranslation } from '@/contexts/LanguageContext';
import {
  apiErrorCode,
  apiErrorMessage,
  createCheckoutSession,
  fetchOwnerSubscription,
  fetchOwnerUsage,
  fetchProPrices,
  isPaidActiveSubscription,
  openBillingPortal,
  planBadgeLabel,
  syncCheckoutSession,
  type CheckoutInterval,
  type CheckoutPlan,
} from '@/lib/owner/fetch-subscription';
import { formatMoney } from '@/lib/format-money';
import { extractLocaleFromPath, type Locale } from '@/i18n/routing';
import { ownerTheme } from '@/lib/owner/owner-theme';

function formatPeriodEnd(iso: string | null | undefined, locale: string) {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return null;
  }
}

export default function SubscriptionSettingsPage() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const locale = (extractLocaleFromPath(pathname) ?? 'en') as Locale;

  const [interval, setInterval] = useState<CheckoutInterval>('monthly');
  const [checkoutLoading, setCheckoutLoading] = useState<CheckoutPlan | null>(
    null,
  );
  const [portalLoading, setPortalLoading] = useState(false);
  const [banner, setBanner] = useState<{
    kind: 'ok' | 'err' | 'info';
    text: string;
  } | null>(null);
  const [syncingCheckout, setSyncingCheckout] = useState(false);

  const subQuery = useQuery({
    queryKey: ['owner-subscription'],
    queryFn: fetchOwnerSubscription,
  });
  const usageQuery = useQuery({
    queryKey: ['owner-usage'],
    queryFn: fetchOwnerUsage,
  });
  const pricesQuery = useQuery({
    queryKey: ['owner-pro-prices'],
    queryFn: fetchProPrices,
  });

  const plan = planBadgeLabel(subQuery.data ?? null);
  const usage = usageQuery.data;
  const paidActive = isPaidActiveSubscription(subQuery.data ?? null);
  const provider = (subQuery.data?.billingProvider || 'NONE').toUpperCase();
  const periodLabel = formatPeriodEnd(subQuery.data?.currentPeriodEnd, locale);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const successUrl = useMemo(
    () =>
      `${origin}/${locale}/salon-info/subscription?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    [origin, locale],
  );
  const cancelUrl = useMemo(
    () => `${origin}/${locale}/salon-info/subscription?checkout=cancelled`,
    [origin, locale],
  );
  const returnUrl = useMemo(
    () => `${origin}/${locale}/salon-info/subscription`,
    [origin, locale],
  );

  useEffect(() => {
    const checkout = searchParams.get('checkout');
    if (!checkout) return;

    const clearParams = () => {
      router.replace(`/${locale}/salon-info/subscription`);
    };

    if (checkout === 'cancelled') {
      setBanner({
        kind: 'info',
        text:
          t('owner.subscription.checkoutCancelled') || 'Checkout cancelled.',
      });
      clearParams();
      return;
    }

    if (checkout === 'success') {
      const sessionId = searchParams.get('session_id')?.trim();
      if (!sessionId) {
        setBanner({
          kind: 'err',
          text:
            t('owner.subscription.checkoutError') ||
            'Failed to proceed to payment',
        });
        clearParams();
        return;
      }
      let cancelled = false;
      setSyncingCheckout(true);
      void (async () => {
        try {
          await syncCheckoutSession(sessionId);
          if (cancelled) return;
          await queryClient.invalidateQueries({
            queryKey: ['owner-subscription'],
          });
          await queryClient.invalidateQueries({ queryKey: ['owner-usage'] });
          setBanner({
            kind: 'ok',
            text:
              t('owner.subscription.checkoutSuccess') ||
              'Subscription activated.',
          });
        } catch (err) {
          if (cancelled) return;
          setBanner({
            kind: 'err',
            text: apiErrorMessage(
              err,
              t('owner.subscription.checkoutError') ||
                'Failed to proceed to payment',
            ),
          });
        } finally {
          if (!cancelled) setSyncingCheckout(false);
          clearParams();
        }
      })();
      return () => {
        cancelled = true;
      };
    }
  }, [searchParams, locale, router, queryClient, t]);

  async function startCheckout(planTier: CheckoutPlan) {
    setCheckoutLoading(planTier);
    setBanner(null);
    try {
      const url = await createCheckoutSession({
        plan: planTier,
        interval,
        successUrl,
        cancelUrl,
      });
      window.location.href = url;
    } catch (err) {
      const code = apiErrorCode(err);
      if (code === 'REVENUECAT_ACTIVE') {
        setBanner({
          kind: 'info',
          text:
            t('owner.subscription.manageInAppStore') ||
            'Active App Store / Google Play subscription. Manage billing in the store.',
        });
      } else {
        setBanner({
          kind: 'err',
          text: apiErrorMessage(
            err,
            t('owner.subscription.checkoutError') ||
              'Failed to proceed to payment',
          ),
        });
      }
      setCheckoutLoading(null);
    }
  }

  async function handlePortal() {
    setPortalLoading(true);
    setBanner(null);
    try {
      const url = await openBillingPortal(returnUrl);
      window.location.href = url;
    } catch (err) {
      setBanner({
        kind: 'err',
        text: apiErrorMessage(
          err,
          t('owner.subscription.checkoutError') ||
            'Failed to open billing portal',
        ),
      });
      setPortalLoading(false);
    }
  }

  const studioPrices = pricesQuery.data?.studio;
  const enterprisePrices = pricesQuery.data?.enterprise;
  const priceFor = (tier: CheckoutPlan) => {
    const block = tier === 'enterprise' ? enterprisePrices : studioPrices;
    if (!block) return '—';
    const amount = interval === 'annual' ? block.annual : block.monthly;
    return formatMoney(amount, 'EUR');
  };

  const showUpgrade = !paidActive && !syncingCheckout;

  return (
    <SettingsSubpageShell
      title={t('owner.subscription.title') || 'Subscription & billing'}
    >
      {banner ? (
        <div
          className="rounded-[14px] px-4 py-3 text-sm"
          style={{
            backgroundColor:
              banner.kind === 'ok'
                ? '#E8F5E9'
                : banner.kind === 'err'
                  ? '#FFEBEE'
                  : '#FFF8E1',
            color: ownerTheme.text,
          }}
          role="status"
        >
          {banner.text}
        </div>
      ) : null}

      <div className="rounded-[14px] bg-white px-4 py-4">
        <p
          className="text-xs font-medium uppercase tracking-wide"
          style={{ color: ownerTheme.textSecondary }}
        >
          {t('owner.subscription.activePlan') || 'Current plan'}
        </p>
        {subQuery.isLoading || syncingCheckout ? (
          <p
            className="mt-2 text-sm"
            style={{ color: ownerTheme.textSecondary }}
          >
            {t('owner.subscription.loading') || 'Loading…'}
          </p>
        ) : subQuery.isError ? (
          <p className="mt-2 text-sm text-red-600">
            {t('owner.subscription.checkoutError') || 'Failed to load'}
          </p>
        ) : (
          <>
            <p
              className="mt-1 text-xl font-bold"
              style={{ color: ownerTheme.text }}
            >
              {plan}
            </p>
            {subQuery.data?.status ? (
              <p
                className="mt-1 text-sm capitalize"
                style={{ color: ownerTheme.textSecondary }}
              >
                {(t('owner.subscription.status') || 'Status') + ': '}
                {subQuery.data.status}
              </p>
            ) : null}
            {periodLabel ? (
              <p
                className="mt-1 text-sm"
                style={{ color: ownerTheme.textSecondary }}
              >
                {subQuery.data?.cancelAtPeriodEnd
                  ? (t('owner.subscription.cancelsOn') ||
                      'Subscription will end on') +
                    ' ' +
                    periodLabel
                  : (t('owner.subscription.nextRenewalDate') ||
                      'Next renewal date') +
                    ': ' +
                    periodLabel}
              </p>
            ) : null}
          </>
        )}
      </div>

      {(usage?.classesLimit != null || usage?.trainersLimit != null) && (
        <div className="space-y-2">
          {usage.classesLimit != null ? (
            <div className="rounded-[14px] bg-white px-4 py-3.5 text-sm">
              <span style={{ color: ownerTheme.textSecondary }}>
                Classes this month{' '}
              </span>
              <span
                className="font-semibold"
                style={{ color: ownerTheme.text }}
              >
                {usage.classesUsed}/{usage.classesLimit}
              </span>
            </div>
          ) : null}
          {usage.trainersLimit != null ? (
            <div className="rounded-[14px] bg-white px-4 py-3.5 text-sm">
              <span style={{ color: ownerTheme.textSecondary }}>Trainers </span>
              <span
                className="font-semibold"
                style={{ color: ownerTheme.text }}
              >
                {usage.trainersUsed}/{usage.trainersLimit}
              </span>
            </div>
          ) : null}
        </div>
      )}

      {paidActive && provider === 'STRIPE' ? (
        <button
          type="button"
          onClick={() => void handlePortal()}
          disabled={portalLoading}
          className="w-full rounded-[14px] px-4 py-3.5 text-sm font-semibold text-white disabled:opacity-60"
          style={{ backgroundColor: ownerTheme.accent }}
        >
          {portalLoading
            ? t('owner.subscription.switching') || 'Opening…'
            : t('owner.subscription.manageBilling') || 'Manage Billing'}
        </button>
      ) : null}

      {paidActive && provider === 'REVENUECAT' ? (
        <p
          className="rounded-[14px] bg-white px-4 py-3.5 text-sm"
          style={{ color: ownerTheme.textSecondary }}
        >
          {t('owner.subscription.manageInAppStore') ||
            'Manage this subscription in the App Store or Google Play (Henzo app).'}
        </p>
      ) : null}

      {showUpgrade ? (
        <div className="space-y-3">
          <div className="flex gap-2 rounded-[14px] bg-white p-1">
            {(['monthly', 'annual'] as const).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setInterval(id)}
                className="flex-1 rounded-[12px] px-3 py-2 text-sm font-semibold transition-colors"
                style={{
                  backgroundColor:
                    interval === id ? ownerTheme.accent : 'transparent',
                  color: interval === id ? '#fff' : ownerTheme.text,
                }}
              >
                {id === 'monthly'
                  ? t('owner.subscription.monthly') || 'Monthly'
                  : t('owner.subscription.annual') || 'Annual'}
              </button>
            ))}
          </div>

          {(['studio', 'enterprise'] as const).map((tier) => (
            <div key={tier} className="rounded-[14px] bg-white px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p
                    className="text-base font-bold"
                    style={{ color: ownerTheme.text }}
                  >
                    {tier === 'studio'
                      ? t('owner.subscription.studioTitle') || 'Studio'
                      : t('owner.subscription.enterpriseTitle') || 'Enterprise'}
                  </p>
                  <p
                    className="mt-1 text-sm"
                    style={{ color: ownerTheme.textSecondary }}
                  >
                    {tier === 'studio'
                      ? t('owner.subscription.studioTagline') ||
                        'Up to 4 trainers · 100 classes / month'
                      : t('owner.subscription.enterpriseTagline') ||
                        'Unlimited trainers & classes'}
                  </p>
                </div>
                <p
                  className="shrink-0 text-right text-base font-semibold tabular-nums"
                  style={{ color: ownerTheme.text }}
                >
                  {pricesQuery.isLoading ? '…' : priceFor(tier)}
                  <span
                    className="mt-0.5 block text-[11px] font-medium"
                    style={{ color: ownerTheme.textSecondary }}
                  >
                    {interval === 'annual'
                      ? t('owner.subscription.perYear') || 'year'
                      : t('owner.subscription.perMonth') || 'month'}
                  </span>
                </p>
              </div>
              <button
                type="button"
                disabled={checkoutLoading != null || !origin}
                onClick={() => void startCheckout(tier)}
                className="mt-4 w-full rounded-[12px] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: ownerTheme.accent }}
              >
                {checkoutLoading === tier
                  ? t('owner.subscription.switching') || 'Redirecting…'
                  : t('owner.subscription.startProPlan') || 'Start plan'}
              </button>
            </div>
          ))}

          <p
            className="text-center text-xs"
            style={{ color: ownerTheme.textSecondary }}
          >
            {t('owner.subscription.noLongTermContracts') ||
              'No long term contracts. Cancel anytime.'}
          </p>
        </div>
      ) : null}
    </SettingsSubpageShell>
  );
}
