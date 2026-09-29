import {
  SubscriptionBillingProvider,
  SubscriptionStatus,
  SubscriptionType,
} from '@prisma/client';

type AccessRow = {
  type: SubscriptionType | string;
  status: SubscriptionStatus | string;
  billingProvider?: SubscriptionBillingProvider | string | null;
  currentPeriodEnd?: Date | null;
  cancelAtPeriodEnd?: boolean | null;
};

function endMs(sub: AccessRow): number | null {
  const end = sub.currentPeriodEnd;
  if (!end) return null;
  const ms = new Date(end).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/** Unpaid 3-month Studio grant: no store billing, period still open. */
export function isActiveStudioTrial(
  sub: AccessRow | null | undefined,
): boolean {
  if (!sub) return false;
  const provider = String(sub.billingProvider ?? 'NONE').toUpperCase();
  if (provider !== 'NONE') return false;
  if (String(sub.type).toUpperCase() !== 'STUDIO') return false;
  if (String(sub.status).toUpperCase() !== 'ACTIVE') return false;
  const end = endMs(sub);
  return end != null && end > Date.now();
}

/**
 * Owner can run the studio: paid store plan, active Studio trial,
 * or a legacy row with no period end (studios created before the trial).
 */
export function hasSubscriptionAccess(
  sub: AccessRow | null | undefined,
): boolean {
  if (!sub) return false;
  const provider = String(sub.billingProvider ?? 'NONE').toUpperCase();
  const status = String(sub.status).toUpperCase();
  const type = String(sub.type).toUpperCase();
  const end = endMs(sub);
  const endInFuture = end != null && end > Date.now();
  const store = provider === 'STRIPE' || provider === 'REVENUECAT';
  if (
    store &&
    (status === 'ACTIVE' || (sub.cancelAtPeriodEnd && endInFuture))
  ) {
    return true;
  }
  if (isActiveStudioTrial(sub)) return true;
  if (
    provider === 'NONE' &&
    status === 'ACTIVE' &&
    end == null &&
    (type === 'SOLO' || type === 'STUDIO' || type === 'ENTERPRISE')
  ) {
    return true;
  }
  return false;
}

/** Test studios: direct link still works, they stay out of search, map, and nearby. */
const DIRECTORY_HIDDEN_STUDIO_NAMES = ['Review studio'];

export function directoryHiddenStudioWhere() {
  return {
    NOT: {
      OR: DIRECTORY_HIDDEN_STUDIO_NAMES.map((name) => ({
        name: { equals: name, mode: 'insensitive' as const },
      })),
    },
  };
}

/** Prisma filter: studio is visible in the public marketplace. */
export function listedSubscriptionWhere(now = new Date()) {
  return {
    OR: [
      {
        billingProvider: {
          in: [
            SubscriptionBillingProvider.STRIPE,
            SubscriptionBillingProvider.REVENUECAT,
          ],
        },
        status: SubscriptionStatus.ACTIVE,
      },
      {
        billingProvider: {
          in: [
            SubscriptionBillingProvider.STRIPE,
            SubscriptionBillingProvider.REVENUECAT,
          ],
        },
        cancelAtPeriodEnd: true,
        currentPeriodEnd: { gt: now },
      },
      {
        billingProvider: SubscriptionBillingProvider.NONE,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: null,
      },
      {
        billingProvider: SubscriptionBillingProvider.NONE,
        status: SubscriptionStatus.ACTIVE,
        type: SubscriptionType.STUDIO,
        currentPeriodEnd: { gt: now },
      },
    ],
  };
}
