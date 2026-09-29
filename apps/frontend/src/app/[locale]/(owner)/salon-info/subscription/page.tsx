'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
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
import { formatMoney, parseStudioCurrency } from '@/lib/format-money';
import { extractLocaleFromPath, type Locale } from '@/i18n/routing';
import { ownerTheme } from '@/lib/owner/owner-theme';
import {
  OwnerUsageChip,
  UsageCalendarIcon,
  UsagePeopleIcon,
} from '@/components/owner/ownerUsageChips';
import {
  PRICE_ENTERPRISE_MONTHLY_EUR,
  PRICE_MONTHLY_EUR,
} from '@/config/subscriptionPlans';
import { fillPlanLimitTokens } from '@/config/planLimits';

type PlanTier = 'solo' | 'studio' | 'enterprise';

const CHECKOUT_TOAST_ID = 'owner-subscription-checkout';
const startedCheckoutSync = new Set<string>();

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

function isStudioTrialSub(sub: OwnerSubscription | null): boolean {
  if (!sub) return false;
  if (sub.isTrial) return true;
  const provider = (sub.billingProvider || 'NONE').toUpperCase();
  if (provider !== 'NONE') return false;
  const type = (sub.type || sub.tier || sub.plan || '').toUpperCase();
  if (!type.includes('STUDIO')) return false;
  const status = (sub.status || 'ACTIVE').toUpperCase();
  if (status !== 'ACTIVE') return false;
  if (!sub.currentPeriodEnd) return false;
  const end = new Date(sub.currentPeriodEnd).getTime();
  return Number.isFinite(end) && end > Date.now();
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
  compact,
}: {
  tier: PlanTier;
  t: (key: string) => string;
  compact?: boolean;
}) {
  return (
    <ul
      className={
        compact
          ? 'mt-3 grid grid-cols-1 gap-1.5'
          : 'mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2'
      }
    >
      {featureKeys(tier).map((key) => (
        <li
          key={key}
          className={`flex items-start gap-2 ${compact ? 'text-xs' : 'text-sm'}`}
          style={{ color: ownerTheme.text }}
        >
          <span
            className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: ownerTheme.accent }}
            aria-hidden
          />
          <span>{fillPlanLimitTokens(t(key), tier)}</span>
        </li>
      ))}
    </ul>
  );
}

function PlanPriceBlock({
  listEur,
  saleEur,
  loading,
  perMonthLabel,
}: {
  listEur: number;
  saleEur: number | null;
  loading: boolean;
  perMonthLabel: string;
}) {
  const showStrike =
    saleEur != null && Number.isFinite(saleEur) && listEur > saleEur;
  return (
    <div className="shrink-0 text-right tabular-nums">
      {loading ? (
        <p
          className="text-base font-semibold"
          style={{ color: ownerTheme.text }}
        >
          …
        </p>
      ) : (
        <>
          {showStrike ? (
            <p
              className="text-xs font-medium line-through"
              style={{ color: ownerTheme.textSecondary }}
            >
              {formatMoney(listEur, 'EUR')}
            </p>
          ) : null}
          <p
            className="text-base font-semibold"
            style={{ color: ownerTheme.accent }}
          >
            {saleEur != null ? formatMoney(saleEur, 'EUR') : '—'}
          </p>
        </>
      )}
      <span
        className="mt-0.5 block text-[11px] font-medium"
        style={{ color: ownerTheme.textSecondary }}
      >
        {perMonthLabel}
      </span>
    </div>
  );
}

export default function SubscriptionSettingsPage() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const locale = (extractLocaleFromPath(pathname) ?? 'en') as Locale;

  const interval: CheckoutInterval = 'monthly';
  const [checkoutLoading, setCheckoutLoading] = useState<CheckoutPlan | null>(
    null,
  );
  const [switchingPlan, setSwitchingPlan] = useState<CheckoutPlan | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [banner, setBanner] = useState<{
    kind: 'ok' | 'err' | 'info';
    text: string;
  } | null>(null);
  const [syncingCheckout, setSyncingCheckout] = useState(false);
  const checkoutSyncKey = useRef<string | null>(null);
  const tRef = useRef(t);
  tRef.current = t;

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
  const isTrial = isStudioTrialSub(subQuery.data ?? null);
  const hasPlan = paidActive || isTrial || subQuery.data?.hasAccess === true;
  const activeTier = tierFromSub(subQuery.data ?? null);
  const provider = (subQuery.data?.billingProvider || 'NONE').toUpperCase();
  const periodLabel = formatPeriodEnd(subQuery.data?.currentPeriodEnd, locale);
  const trialDaysLeft = (() => {
    if (!isTrial || !subQuery.data?.currentPeriodEnd) return null;
    const end = new Date(subQuery.data.currentPeriodEnd).getTime();
    if (!Number.isFinite(end)) return null;
    const days = Math.ceil((end - Date.now()) / 86_400_000);
    return days > 0 ? days : null;
  })();
  const trialDaysLabel =
    trialDaysLeft == null
      ? t('owner.subscription.trialActive') || 'Trial period active'
      : (
          t('owner.subscription.trialDaysLeft') || '{{days}} days left in trial'
        ).replace('{{days}}', String(trialDaysLeft));
  const isStripe = provider === 'STRIPE';
  const isRevenueCat = provider === 'REVENUECAT';
  /** Portal CTA for any paid web plan; click fails cleanly if no Stripe customer. */
  const showManageBilling = paidActive && !isRevenueCat && !syncingCheckout;

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

  const checkout = searchParams.get('checkout');
  const sessionId = searchParams.get('session_id')?.trim() ?? '';

  useEffect(() => {
    if (checkout !== 'success' && checkout !== 'cancelled') return;

    const key = `${checkout}:${sessionId}`;
    if (checkoutSyncKey.current === key || startedCheckoutSync.has(key)) return;
    checkoutSyncKey.current = key;
    startedCheckoutSync.add(key);

    const translate = tRef.current;
    const toastId = CHECKOUT_TOAST_ID;
    const clearParams = () => {
      router.replace(`/${locale}/salon-info/subscription`);
    };
    const toastStyle = {
      borderRadius: '14px',
      border: '1px solid #F1E4DB',
      padding: '14px 16px',
      color: ownerTheme.text,
      fontWeight: 500,
    };

    if (checkout === 'cancelled') {
      toast(
        translate('owner.subscription.checkoutCancelled') ||
          'Checkout cancelled.',
        {
          id: toastId,
          icon: 'ⓘ',
          duration: 4000,
          style: toastStyle,
        },
      );
      clearParams();
      return;
    }

    if (!sessionId) {
      toast.error(
        translate('owner.subscription.checkoutError') ||
          'Failed to proceed to payment',
        { id: toastId },
      );
      clearParams();
      return;
    }

    setSyncingCheckout(true);
    toast.loading(
      translate('owner.subscription.activating') || 'Activating subscription…',
      { id: toastId, style: toastStyle },
    );
    void (async () => {
      try {
        const synced = await syncCheckoutSession(sessionId);
        if (synced) {
          queryClient.setQueryData(['owner-subscription'], synced);
        }
        void queryClient.invalidateQueries({
          queryKey: ['owner-subscription'],
        });
        void queryClient.invalidateQueries({ queryKey: ['owner-usage'] });
        toast.success(
          translate('owner.subscription.checkoutSuccess') ||
            'Subscription activated. Welcome aboard!',
          {
            id: toastId,
            duration: 5200,
            style: {
              borderRadius: '14px',
              border: `1px solid ${ownerTheme.accent}`,
              padding: '14px 18px',
              color: ownerTheme.text,
              fontWeight: 600,
              maxWidth: 420,
            },
          },
        );
      } catch (err) {
        toast.error(
          apiErrorMessage(
            err,
            translate('owner.subscription.checkoutError') ||
              'Failed to proceed to payment',
          ),
          { id: toastId, duration: 5000 },
        );
      } finally {
        setSyncingCheckout(false);
        clearParams();
      }
    })();
  }, [checkout, sessionId, locale, router, queryClient]);

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

  async function switchPaidPlan(plan: CheckoutPlan) {
    setSwitchingPlan(plan);
    setBanner(null);
    try {
      if (isStripe) {
        const updated = await changeSubscriptionPlan({ plan, interval });
        if (updated) {
          queryClient.setQueryData(
            ['owner-subscription'],
            (prev: OwnerSubscription | null | undefined) => ({
              ...(prev ?? {}),
              ...updated,
            }),
          );
        }
        await queryClient.invalidateQueries({
          queryKey: ['owner-subscription'],
        });
        await queryClient.invalidateQueries({ queryKey: ['owner-usage'] });
        const pending = (updated?.pendingType || '').toUpperCase();
        const current = (updated?.type || '').toUpperCase();
        if (pending && pending !== current) {
          const when =
            formatPeriodEnd(updated?.pendingEffectiveAt, locale) || '';
          const planName = planBadgeLabel({ type: pending });
          const template =
            t('owner.subscription.decreaseScheduled') ||
            '{{plan}} starts on {{date}}. Your current plan and limits stay until the next payment.';
          setBanner({
            kind: 'info',
            text: template
              .replace('{{plan}}', planName)
              .replace('{{date}}', when),
          });
        } else {
          setBanner({
            kind: 'ok',
            text:
              t('owner.subscription.switchSuccess') ||
              'Subscription plan updated successfully',
          });
        }
        return;
      }
      await startCheckout(plan);
    } catch (err) {
      const code = apiErrorCode(err);
      if (code === 'NO_STRIPE_SUBSCRIPTION' || code === 'STRIPE_ACTIVE') {
        await startCheckout(plan);
        return;
      }
      if (code === 'REVENUECAT_ACTIVE') {
        setBanner({
          kind: 'info',
          text:
            t('owner.subscription.manageInAppStore') ||
            'Active App Store / Google Play subscription. Manage billing in the store.',
        });
        return;
      }
      if (code === 'MANUAL_OVERRIDE') {
        setBanner({
          kind: 'info',
          text:
            t('owner.subscription.manualOverride') ||
            'Subscription is managed by support; contact Henzo.',
        });
        return;
      }
      setBanner({
        kind: 'err',
        text: apiErrorMessage(
          err,
          t('owner.subscription.switchError') ||
            'Failed to switch subscription plan',
        ),
      });
    } finally {
      setSwitchingPlan(null);
    }
  }

  async function handlePortal() {
    setPortalLoading(true);
    setBanner(null);
    try {
      const url = await openBillingPortal(returnUrl);
      window.location.href = url;
    } catch (err) {
      const code = apiErrorCode(err);
      setBanner({
        kind: code === 'NO_STRIPE_CUSTOMER' ? 'info' : 'err',
        text:
          code === 'NO_STRIPE_CUSTOMER'
            ? t('owner.subscription.noStripeBilling') ||
              'Billing portal is not available for this subscription yet. Use Upgrade or contact support.'
            : apiErrorMessage(
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
  const saleMonthly = (tier: CheckoutPlan): number | null => {
    const block = tier === 'enterprise' ? enterprisePrices : studioPrices;
    return block?.monthly ?? null;
  };
  const listMonthly = (tier: CheckoutPlan) =>
    tier === 'enterprise' ? PRICE_ENTERPRISE_MONTHLY_EUR : PRICE_MONTHLY_EUR;

  const busy =
    syncingCheckout || checkoutLoading != null || switchingPlan != null;
  const showCatalog = !paidActive && !syncingCheckout;
  // Studio → Enterprise for any paid Studio except App Store / Play
  const showStudioUpgrade =
    paidActive && activeTier === 'studio' && !isRevenueCat && !syncingCheckout;
  const showSoloDecrease =
    paidActive && activeTier !== 'solo' && !isRevenueCat && !syncingCheckout;
  const pendingType = (subQuery.data?.pendingType || '').toUpperCase();
  const pendingWhen = formatPeriodEnd(
    subQuery.data?.pendingEffectiveAt,
    locale,
  );
  const decreaseScheduledText = (() => {
    if (
      !pendingType ||
      pendingType === (subQuery.data?.type || '').toUpperCase()
    ) {
      return null;
    }
    const template =
      t('owner.subscription.decreaseScheduled') ||
      '{{plan}} starts on {{date}}. Your current plan and limits stay until the next payment.';
    return template
      .replace('{{plan}}', planBadgeLabel({ type: pendingType }))
      .replace('{{date}}', pendingWhen || '');
  })();
  const soloPrice = pricesQuery.data?.solo;
  const soloCurrency = parseStudioCurrency(soloPrice?.currency);

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

      {hasPlan ? (
        <>
          <div className="rounded-[14px] bg-white px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p
                  className="text-2xl font-bold"
                  style={{ color: ownerTheme.text }}
                >
                  {subQuery.isLoading && !subQuery.data
                    ? t('owner.subscription.loading') || 'Loading…'
                    : plan}
                </p>
                <p
                  className="mt-1 text-sm"
                  style={{ color: ownerTheme.textSecondary }}
                >
                  {isTrial
                    ? t('owner.subscription.trialActive') ||
                      'Trial period active'
                    : activeTier === 'enterprise'
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
                {isTrial
                  ? t('owner.subscription.trialBadge') || 'TRIAL'
                  : t('owner.subscription.activeBadge') || 'ACTIVE'}
              </span>
            </div>
            <div className="mt-5 flex gap-4 border-t border-[#F1E4DB] pt-4">
              <div className="min-w-0 flex-1">
                <p
                  className="text-xl font-extrabold tabular-nums"
                  style={{ color: ownerTheme.accent }}
                >
                  {isTrial
                    ? t('owner.subscription.trialPrice') || 'Free'
                    : pricesQuery.isLoading
                      ? '…'
                      : (() => {
                          const amount = saleMonthly(
                            activeTier === 'enterprise'
                              ? 'enterprise'
                              : 'studio',
                          );
                          return amount != null
                            ? formatMoney(amount, 'EUR')
                            : '—';
                        })()}
                </p>
                <p
                  className="text-sm"
                  style={{ color: ownerTheme.textSecondary }}
                >
                  {isTrial
                    ? trialDaysLabel
                    : t('owner.subscription.perOneMonth') || 'per month'}
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
                  {isTrial
                    ? t('owner.subscription.trialEnds') || 'Active until'
                    : t('owner.subscription.nextPayment') || 'Next payment'}
                </p>
                <p
                  className="text-base font-bold"
                  style={{ color: ownerTheme.text }}
                >
                  {periodLabel || '—'}
                </p>
              </div>
            </div>
            {decreaseScheduledText ? (
              <p
                className="mt-4 text-sm"
                style={{ color: ownerTheme.textSecondary }}
              >
                {decreaseScheduledText}
              </p>
            ) : null}
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
            <div className="flex gap-2">
              <OwnerUsageChip
                label="Classes this month"
                used={usage.classesUsed ?? 0}
                limit={usage.classesLimit}
                icon={<UsageCalendarIcon />}
              />
              <OwnerUsageChip
                label="Trainers"
                used={usage.trainersUsed ?? 0}
                limit={usage.trainersLimit}
                icon={<UsagePeopleIcon />}
              />
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
                <PlanPriceBlock
                  listEur={listMonthly('enterprise')}
                  saleEur={saleMonthly('enterprise')}
                  loading={pricesQuery.isLoading}
                  perMonthLabel={t('owner.subscription.perMonth') || 'month'}
                />
              </div>
              <PlanFeatureList tier="enterprise" t={t} />
              <button
                type="button"
                disabled={busy || !origin}
                onClick={() => void switchPaidPlan('enterprise')}
                className="mt-4 w-full rounded-[12px] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: ownerTheme.accent }}
              >
                {switchingPlan === 'enterprise' ||
                checkoutLoading === 'enterprise'
                  ? t('owner.subscription.switching') || 'Switching...'
                  : t('owner.subscription.upgradeToEnterpriseBtn') ||
                    'Upgrade to Enterprise'}
              </button>
            </div>
          ) : null}

          {showSoloDecrease ? (
            <div className="rounded-[14px] bg-white px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
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
                    {t('owner.subscription.soloTagline') ||
                      'For independent trainers'}
                  </p>
                </div>
                <div className="shrink-0 text-right tabular-nums">
                  <p
                    className="text-base font-semibold"
                    style={{ color: ownerTheme.accent }}
                  >
                    {pricesQuery.isLoading
                      ? '…'
                      : formatMoney(soloPrice?.monthly ?? 7.99, soloCurrency)}
                  </p>
                  <span
                    className="mt-0.5 block text-[11px] font-medium"
                    style={{ color: ownerTheme.textSecondary }}
                  >
                    {t('owner.subscription.perMonth') || 'month'}
                  </span>
                </div>
              </div>
              <PlanFeatureList tier="solo" t={t} />
              <button
                type="button"
                disabled={busy || !origin || pendingType === 'SOLO'}
                onClick={() => void switchPaidPlan('solo')}
                className="mt-4 w-full rounded-[12px] border px-4 py-3 text-sm font-semibold disabled:opacity-60"
                style={{
                  borderColor: ownerTheme.accent,
                  color: ownerTheme.accent,
                  backgroundColor: 'transparent',
                }}
              >
                {switchingPlan === 'solo' || checkoutLoading === 'solo'
                  ? t('owner.subscription.switching') || 'Switching...'
                  : pendingType === 'SOLO'
                    ? t('owner.subscription.decreaseScheduledBtn') ||
                      'Scheduled for the next payment'
                    : t('owner.subscription.decreaseToSoloBtn') ||
                      'Decrease to Solo'}
              </button>
            </div>
          ) : null}

          {showManageBilling ? (
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
                {t('owner.subscription.soloTagline') ||
                  'For independent trainers'}
              </p>
            </div>
            <p
              className="mt-3 text-xl font-extrabold"
              style={{ color: ownerTheme.accent }}
            >
              {formatMoney(soloPrice?.monthly ?? 7.99, soloCurrency)}
              <span
                className="ml-1 text-sm font-medium"
                style={{ color: ownerTheme.textSecondary }}
              >
                / {t('owner.subscription.perMonth') || 'month'}
              </span>
            </p>
            <PlanFeatureList tier="solo" t={t} />
            <button
              type="button"
              disabled={busy || !origin}
              onClick={() => void startCheckout('solo')}
              className="mt-4 w-full rounded-[12px] px-2 py-2.5 text-xs font-semibold text-white disabled:opacity-60 sm:px-4 sm:py-3 sm:text-sm"
              style={{ backgroundColor: ownerTheme.accent }}
            >
              {checkoutLoading === 'solo'
                ? t('owner.subscription.switching') || 'Redirecting…'
                : t('owner.subscription.subscribeToSoloBtn') ||
                  'Subscribe to Solo'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {(['studio', 'enterprise'] as const).map((tier) => (
              <div
                key={tier}
                className="flex min-w-0 flex-col rounded-[14px] bg-white px-3 py-4 sm:px-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p
                      className="text-sm font-bold sm:text-base"
                      style={{ color: ownerTheme.text }}
                    >
                      {tier === 'studio'
                        ? t('owner.subscription.studioTitle') || 'Studio'
                        : t('owner.subscription.enterpriseTitle') ||
                          'Enterprise'}
                    </p>
                    <p
                      className="mt-1 text-xs sm:text-sm"
                      style={{ color: ownerTheme.textSecondary }}
                    >
                      {tier === 'studio'
                        ? t('owner.subscription.studioTagline')
                        : t('owner.subscription.enterpriseTagline')}
                    </p>
                  </div>
                  <PlanPriceBlock
                    listEur={listMonthly(tier)}
                    saleEur={saleMonthly(tier)}
                    loading={pricesQuery.isLoading}
                    perMonthLabel={t('owner.subscription.perMonth') || 'month'}
                  />
                </div>
                <PlanFeatureList tier={tier} t={t} compact />
                <button
                  type="button"
                  disabled={busy || !origin}
                  onClick={() => void startCheckout(tier)}
                  className="mt-4 w-full rounded-[12px] px-2 py-2.5 text-xs font-semibold text-white disabled:opacity-60 sm:px-4 sm:py-3 sm:text-sm"
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
          </div>

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
