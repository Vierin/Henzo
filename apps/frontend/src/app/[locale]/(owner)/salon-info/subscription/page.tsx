'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SettingsSubpageShell } from '@/components/owner/settingsSubpageShell';
import { useTranslation } from '@/contexts/LanguageContext';
import {
  apiErrorCode,
  apiErrorMessage,
  changeSubscriptionPlan,
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
  type OwnerSubscription,
} from '@/lib/owner/fetch-subscription';
import { formatMoney } from '@/lib/format-money';
import { extractLocaleFromPath, type Locale } from '@/i18n/routing';
import { ownerTheme } from '@/lib/owner/owner-theme';

type PlanTier = 'solo' | 'studio' | 'enterprise';

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

function tierFromSub(sub: OwnerSubscription | null): PlanTier {
  const raw = (sub?.type || sub?.tier || sub?.plan || 'SOLO').toUpperCase();
  if (raw.includes('ENTERPRISE')) return 'enterprise';
  if (raw.includes('STUDIO') || raw.includes('PRO')) return 'studio';
  return 'solo';
}

function featureKeys(tier: PlanTier): string[] {
  const count = tier === 'studio' ? 5 : 6;
  return Array.from(
    { length: count },
    (_, i) => `owner.subscription.feature_${tier}_${i + 1}`,
  );
}

function PlanFeatureList({
  tier,
  t,
}: {
  tier: PlanTier;
  t: (key: string) => string;
}) {
  return (
    <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
      {featureKeys(tier).map((key) => (
        <li
          key={key}
          className="flex items-start gap-2 text-sm"
          style={{ color: ownerTheme.text }}
        >
          <span
            className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: ownerTheme.accent }}
            aria-hidden
          />
          <span>{t(key)}</span>
        </li>
      ))}
    </ul>
  );
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
  const [changeLoading, setChangeLoading] = useState(false);
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
  const activeTier = tierFromSub(subQuery.data ?? null);
  const provider = (subQuery.data?.billingProvider || 'NONE').toUpperCase();
  const periodLabel = formatPeriodEnd(subQuery.data?.currentPeriodEnd, locale);
  const isStripe = provider === 'STRIPE';
  const isRevenueCat = provider === 'REVENUECAT';

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
      } else if (code === 'STRIPE_ACTIVE') {
        setBanner({
          kind: 'info',
          text:
            t('owner.subscription.manageBilling') ||
            'Use Upgrade or Manage Billing for your current subscription.',
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

  async function upgradeToEnterprise() {
    setChangeLoading(true);
    setBanner(null);
    try {
      await changeSubscriptionPlan({ plan: 'enterprise', interval });
      await queryClient.invalidateQueries({ queryKey: ['owner-subscription'] });
      await queryClient.invalidateQueries({ queryKey: ['owner-usage'] });
      setBanner({
        kind: 'ok',
        text:
          t('owner.subscription.switchSuccess') ||
          'Subscription plan updated successfully',
      });
    } catch (err) {
      setBanner({
        kind: 'err',
        text: apiErrorMessage(
          err,
          t('owner.subscription.switchError') ||
            'Failed to switch subscription plan',
        ),
      });
    } finally {
      setChangeLoading(false);
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

  const busy = syncingCheckout || checkoutLoading != null || changeLoading;
  const showCatalog = !paidActive && !syncingCheckout;
  const showStudioUpgrade =
    paidActive && isStripe && activeTier === 'studio' && !syncingCheckout;

  return (
    <SettingsSubpageShell
      title={t('owner.subscription.title') || 'Subscription Management'}
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

      {(showCatalog || showStudioUpgrade) && (
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
      )}

      {paidActive ? (
        <>
          <div className="rounded-[14px] bg-white px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p
                  className="text-2xl font-bold"
                  style={{ color: ownerTheme.text }}
                >
                  {subQuery.isLoading || syncingCheckout
                    ? t('owner.subscription.loading') || 'Loading…'
                    : plan}
                </p>
                <p
                  className="mt-1 text-sm"
                  style={{ color: ownerTheme.textSecondary }}
                >
                  {activeTier === 'enterprise'
                    ? t('owner.subscription.enterpriseTagline')
                    : t('owner.subscription.studioTagline')}
                </p>
              </div>
              <span
                className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold"
                style={{
                  backgroundColor: '#E8F5E9',
                  color: '#2E7D32',
                }}
              >
                {t('owner.subscription.activeBadge') || 'ACTIVE'}
              </span>
            </div>
            <div className="mt-5 flex gap-4 border-t border-[#F1E4DB] pt-4">
              <div className="min-w-0 flex-1">
                <p
                  className="text-xl font-extrabold tabular-nums"
                  style={{ color: ownerTheme.accent }}
                >
                  {pricesQuery.isLoading
                    ? '…'
                    : priceFor(
                        activeTier === 'enterprise' ? 'enterprise' : 'studio',
                      )}
                </p>
                <p
                  className="text-sm"
                  style={{ color: ownerTheme.textSecondary }}
                >
                  {t('owner.subscription.perOneMonth') || 'per month'}
                </p>
              </div>
              <div
                className="w-px self-stretch"
                style={{ backgroundColor: ownerTheme.borderSoft }}
              />
              <div className="min-w-0 flex-1">
                <p
                  className="text-sm"
                  style={{ color: ownerTheme.textSecondary }}
                >
                  {t('owner.subscription.nextPayment') || 'Next payment'}
                </p>
                <p
                  className="text-base font-bold"
                  style={{ color: ownerTheme.text }}
                >
                  {periodLabel || '—'}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[14px] bg-white px-4 py-4">
            <p
              className="text-base font-bold"
              style={{ color: ownerTheme.text }}
            >
              {t('owner.subscription.whatsIncludedShort') || "What's included:"}
            </p>
            <PlanFeatureList tier={activeTier} t={t} />
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
                  <span style={{ color: ownerTheme.textSecondary }}>
                    Trainers{' '}
                  </span>
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

          {showStudioUpgrade ? (
            <div className="rounded-[14px] bg-white px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p
                    className="text-base font-bold"
                    style={{ color: ownerTheme.text }}
                  >
                    {t('owner.subscription.enterpriseTitle') || 'Enterprise'}
                  </p>
                  <p
                    className="mt-1 text-sm"
                    style={{ color: ownerTheme.textSecondary }}
                  >
                    {t('owner.subscription.enterpriseTagline')}
                  </p>
                </div>
                <p
                  className="shrink-0 text-right text-base font-semibold tabular-nums"
                  style={{ color: ownerTheme.text }}
                >
                  {pricesQuery.isLoading ? '…' : priceFor('enterprise')}
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
              <PlanFeatureList tier="enterprise" t={t} />
              <button
                type="button"
                disabled={busy || !origin}
                onClick={() => void upgradeToEnterprise()}
                className="mt-4 w-full rounded-[12px] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: ownerTheme.accent }}
              >
                {changeLoading
                  ? t('owner.subscription.switching') || 'Switching...'
                  : t('owner.subscription.upgradeToEnterpriseBtn') ||
                    'Upgrade to Enterprise'}
              </button>
            </div>
          ) : null}

          {isStripe ? (
            <button
              type="button"
              onClick={() => void handlePortal()}
              disabled={portalLoading || busy}
              className="w-full rounded-[14px] px-4 py-3.5 text-sm font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: ownerTheme.accent }}
            >
              {portalLoading
                ? t('owner.subscription.switching') || 'Opening…'
                : t('owner.subscription.manageBilling') || 'Manage Billing'}
            </button>
          ) : null}

          {isRevenueCat ? (
            <p
              className="rounded-[14px] bg-white px-4 py-3.5 text-sm"
              style={{ color: ownerTheme.textSecondary }}
            >
              {t('owner.subscription.manageInAppStore') ||
                'Manage this subscription in the App Store or Google Play (Henzo app).'}
            </p>
          ) : null}
        </>
      ) : null}

      {showCatalog ? (
        <div className="space-y-3">
          <div className="rounded-[14px] bg-white px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p
                  className="text-base font-bold"
                  style={{ color: ownerTheme.text }}
                >
                  {t('owner.subscription.soloTitle') || 'Solo'}
                </p>
                <p
                  className="mt-1 text-sm"
                  style={{ color: ownerTheme.textSecondary }}
                >
                  {t('owner.subscription.soloTagline') || 'Get started free'}
                </p>
              </div>
              <span
                className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold"
                style={{ backgroundColor: '#E8F5E9', color: '#2E7D32' }}
              >
                {t('owner.subscription.activeBadge') || 'ACTIVE'}
              </span>
            </div>
            <p
              className="mt-3 text-xl font-extrabold"
              style={{ color: ownerTheme.accent }}
            >
              {t('owner.subscription.soloFreePrice') || 'Free'}
            </p>
            <PlanFeatureList tier="solo" t={t} />
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
                      ? t('owner.subscription.studioTagline')
                      : t('owner.subscription.enterpriseTagline')}
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
              <PlanFeatureList tier={tier} t={t} />
              <button
                type="button"
                disabled={busy || !origin}
                onClick={() => void startCheckout(tier)}
                className="mt-4 w-full rounded-[12px] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: ownerTheme.accent }}
              >
                {checkoutLoading === tier
                  ? t('owner.subscription.switching') || 'Redirecting…'
                  : tier === 'studio'
                    ? t('owner.subscription.subscribeToStudioBtn') ||
                      'Subscribe to Studio'
                    : t('owner.subscription.subscribeToEnterpriseBtn') ||
                      'Subscribe to Enterprise'}
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
