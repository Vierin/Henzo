import { apiClient } from '@/lib/api-client';
import { quotaForTier } from '@/config/planLimits';

export type BillingProvider = 'NONE' | 'STRIPE' | 'REVENUECAT' | string;

export type OwnerSubscription = {
  plan?: string | null;
  status?: string | null;
  tier?: string | null;
  name?: string | null;
  type?: string | null;
  currentPeriodEnd?: string | null;
  billingProvider?: BillingProvider | null;
  cancelAtPeriodEnd?: boolean;
  hasStripeCustomer?: boolean;
  isTrial?: boolean;
  hasAccess?: boolean;
  /** Lower plan that starts at `pendingEffectiveAt`. Current type stays until then. */
  pendingType?: string | null;
  pendingEffectiveAt?: string | null;
};

export type OwnerUsage = {
  tier?: string;
  /** Sessions / classes created this month */
  classesUsed: number;
  classesLimit: number | null;
  trainersUsed: number;
  trainersLimit: number | null;
};

export type TierPrices = {
  monthly: number;
  annual: number;
  twelveMonthsCompare: number;
  annualSavePercent: number;
};

export type ProPrices = TierPrices & {
  currency: 'EUR' | string;
  source?: string;
  studio: TierPrices;
  enterprise: TierPrices;
  solo?: { monthly: number; currency: string };
};

export type CheckoutPlan = 'solo' | 'studio' | 'enterprise';
export type CheckoutInterval = 'monthly' | 'annual';

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function asNum(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function asTierPrices(
  raw: unknown,
  fallbackMonthly: number,
  fallbackAnnual: number,
): TierPrices {
  const o = asRecord(raw);
  const monthly = asNum(o?.monthly) ?? asNum(o?.monthlyEur) ?? fallbackMonthly;
  const annual = asNum(o?.annual) ?? asNum(o?.annualEur) ?? fallbackAnnual;
  const twelve =
    asNum(o?.twelveMonthsCompare) ??
    asNum(o?.twelveMonthsCompareEur) ??
    Math.round(monthly * 12 * 100) / 100;
  const annualSavePercent =
    asNum(o?.annualSavePercent) ??
    (twelve > annual ? Math.round(((twelve - annual) / twelve) * 100) : 0);
  return {
    monthly,
    annual,
    twelveMonthsCompare: twelve,
    annualSavePercent,
  };
}

export async function fetchOwnerSubscription(): Promise<OwnerSubscription | null> {
  try {
    const raw = await apiClient.get<unknown>('/subscriptions/current');
    const root = asRecord(raw);
    const data = asRecord(root?.data) ?? root;
    if (!data) return null;
    const type = data.type ? String(data.type) : null;
    return {
      plan: data.plan
        ? String(data.plan)
        : data.tier
          ? String(data.tier)
          : type,
      status: data.status ? String(data.status) : null,
      tier: data.tier ? String(data.tier) : type,
      type,
      name: data.name ? String(data.name) : null,
      currentPeriodEnd: data.currentPeriodEnd
        ? String(data.currentPeriodEnd)
        : null,
      billingProvider: data.billingProvider
        ? String(data.billingProvider)
        : null,
      cancelAtPeriodEnd: Boolean(data.cancelAtPeriodEnd),
      hasStripeCustomer: Boolean(data.hasStripeCustomer),
      isTrial: data.isTrial === true,
      hasAccess:
        data.hasAccess === false
          ? false
          : data.hasAccess === true
            ? true
            : undefined,
      pendingType: data.pendingType ? String(data.pendingType) : null,
      pendingEffectiveAt: data.pendingEffectiveAt
        ? String(data.pendingEffectiveAt)
        : null,
    };
  } catch {
    return null;
  }
}

/** GET /subscriptions/usage — backend: sessionsUsed/sessionsLimit + trainers*. */
export async function fetchOwnerUsage(): Promise<OwnerUsage | null> {
  try {
    const raw = await apiClient.get<unknown>('/subscriptions/usage');
    const root = asRecord(raw);
    const data = asRecord(root?.data) ?? root;
    if (!data) return null;

    const classesUsed =
      asNum(data.sessionsUsed) ??
      asNum(data.classesUsed) ??
      asNum(data.monthlySessionsCount) ??
      0;
    const apiClassesLimit =
      asNum(data.sessionsLimit) ??
      asNum(data.classesLimit) ??
      asNum(data.sessionLimit);
    const trainersUsed =
      asNum(data.trainersUsed) ??
      asNum(data.trainerCount) ??
      asNum(data.usedTrainers) ??
      0;
    const apiTrainersLimit =
      asNum(data.trainersLimit) ?? asNum(data.trainerLimit);
    const quota = data.tier ? quotaForTier(String(data.tier)) : null;
    const classesLimit = quota ? quota.sessionsPerMonth : apiClassesLimit;
    const trainersLimit = quota ? quota.trainers : apiTrainersLimit;

    return {
      tier: data.tier ? String(data.tier) : undefined,
      classesUsed,
      classesLimit,
      trainersUsed,
      trainersLimit,
    };
  } catch {
    return null;
  }
}

export async function fetchProPrices(): Promise<ProPrices | null> {
  try {
    const raw = await apiClient.get<unknown>('/subscriptions/pro-prices');
    const root = asRecord(raw);
    const data = asRecord(root?.data) ?? root;
    if (!data) return null;
    const monthly = asNum(data.monthly) ?? 22.99;
    const annual = asNum(data.annual) ?? 229.9;
    const studio = asTierPrices(data.studio, monthly, annual);
    const enterprise = asTierPrices(data.enterprise, 69.99, 699.9);
    const soloRaw = asRecord(data.solo);
    const soloMonthly = asNum(soloRaw?.monthly) ?? 7.99;
    return {
      currency: data.currency ? String(data.currency).toUpperCase() : 'EUR',
      monthly: studio.monthly,
      annual: studio.annual,
      twelveMonthsCompare: studio.twelveMonthsCompare,
      annualSavePercent: studio.annualSavePercent,
      source: data.source ? String(data.source) : undefined,
      studio,
      enterprise,
      solo: {
        monthly: soloMonthly,
        currency: soloRaw?.currency
          ? String(soloRaw.currency).toUpperCase()
          : 'EUR',
      },
    };
  } catch {
    return null;
  }
}

export async function createCheckoutSession(params: {
  plan: CheckoutPlan;
  interval: CheckoutInterval;
  successUrl: string;
  cancelUrl: string;
}): Promise<string> {
  const raw = await apiClient.post<unknown>(
    '/subscriptions/create-checkout-session',
    params,
  );
  const root = asRecord(raw);
  const url = root?.url ? String(root.url) : '';
  if (!url) throw new Error('Checkout URL missing');
  return url;
}

export async function syncCheckoutSession(
  sessionId: string,
): Promise<OwnerSubscription | null> {
  const raw = await apiClient.post<unknown>(
    '/subscriptions/sync-checkout-session',
    {
      sessionId,
    },
  );
  const root = asRecord(raw);
  const data = asRecord(root?.data) ?? root;
  if (!data) return null;
  const type = data.type ? String(data.type) : null;
  return {
    plan: type,
    type,
    tier: type,
    status: data.status ? String(data.status) : null,
    currentPeriodEnd: data.currentPeriodEnd
      ? String(data.currentPeriodEnd)
      : null,
    billingProvider: data.billingProvider ? String(data.billingProvider) : null,
    cancelAtPeriodEnd: Boolean(data.cancelAtPeriodEnd),
    hasStripeCustomer: Boolean(data.hasStripeCustomer),
  };
}

export async function openBillingPortal(returnUrl: string): Promise<string> {
  const raw = await apiClient.post<unknown>('/subscriptions/billing-portal', {
    returnUrl,
  });
  const root = asRecord(raw);
  const url = root?.url ? String(root.url) : '';
  if (!url) throw new Error('Billing portal URL missing');
  return url;
}

export async function changeSubscriptionPlan(params: {
  plan: CheckoutPlan;
  interval: CheckoutInterval;
}): Promise<OwnerSubscription | null> {
  const raw = await apiClient.post<unknown>(
    '/subscriptions/change-plan',
    params,
  );
  const root = asRecord(raw);
  const data = asRecord(root?.data) ?? root;
  if (!data) return null;
  const type = data.type ? String(data.type) : null;
  return {
    plan: type,
    type,
    tier: type,
    status: data.status ? String(data.status) : null,
    currentPeriodEnd: data.currentPeriodEnd
      ? String(data.currentPeriodEnd)
      : null,
    billingProvider: data.billingProvider ? String(data.billingProvider) : null,
    cancelAtPeriodEnd: Boolean(data.cancelAtPeriodEnd),
    hasStripeCustomer: Boolean(data.hasStripeCustomer),
    pendingType: data.pendingType ? String(data.pendingType) : null,
    pendingEffectiveAt: data.pendingEffectiveAt
      ? String(data.pendingEffectiveAt)
      : null,
  };
}

export function planBadgeLabel(sub: OwnerSubscription | null): string {
  const raw = (
    sub?.type ||
    sub?.name ||
    sub?.plan ||
    sub?.tier ||
    'Solo'
  ).toString();
  const lower = raw.toLowerCase();
  if (lower.includes('enterprise')) return 'Enterprise';
  if (lower.includes('studio') || lower.includes('pro')) return 'Studio';
  if (
    lower.includes('solo') ||
    lower.includes('free') ||
    lower.includes('basic')
  )
    return 'Solo';
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function isPaidActiveSubscription(
  sub: OwnerSubscription | null,
): boolean {
  if (!sub) return false;
  const provider = (sub.billingProvider || '').toUpperCase();
  if (provider !== 'STRIPE' && provider !== 'REVENUECAT') return false;
  const type = (sub.type || sub.tier || sub.plan || '').toUpperCase();
  if (type !== 'SOLO' && type !== 'STUDIO' && type !== 'ENTERPRISE') {
    return false;
  }
  const status = (sub.status || '').toUpperCase();
  return status === 'ACTIVE' || Boolean(sub.cancelAtPeriodEnd);
}

export function apiErrorCode(err: unknown): string | null {
  if (!err || typeof err !== 'object') return null;
  const anyErr = err as {
    code?: unknown;
    errorData?: { code?: unknown; message?: unknown };
  };
  if (typeof anyErr.code === 'string') return anyErr.code;
  const data = anyErr.errorData;
  if (data && typeof data.code === 'string') return data.code;
  const msg = data?.message;
  if (msg && typeof msg === 'object' && !Array.isArray(msg)) {
    const code = (msg as { code?: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return null;
}

export function apiErrorMessage(err: unknown, fallback: string): string {
  if (!err || typeof err !== 'object') return fallback;
  const anyErr = err as {
    message?: unknown;
    errorData?: { message?: unknown };
  };
  const nested = anyErr.errorData?.message;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    const m = (nested as { message?: unknown }).message;
    if (typeof m === 'string' && m.trim()) return m.trim();
  }
  if (typeof nested === 'string' && nested.trim()) return nested.trim();
  if (typeof anyErr.message === 'string' && anyErr.message.trim()) {
    return anyErr.message.trim();
  }
  return fallback;
}
