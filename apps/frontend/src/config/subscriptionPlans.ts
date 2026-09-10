/**
 * Subscription plan configuration (marketing / legacy helpers).
 * Live mobile prices come from RevenueCat; amounts here are EUR defaults.
 */

export type SubscriptionInterval = 'monthly' | 'annual';

export interface SubscriptionPlanConfig {
  id: SubscriptionInterval;
  nameKey: string;
  priceEur: number;
  priceLabelKey: string;
  saveAmountEur?: number;
}

/** EUR marketing defaults. Monthly ≈ Studio tier, annual = 12× with discount. */
export const PRICE_MONTHLY_EUR = 20.99;
export const PRICE_ANNUAL_EUR = 209.9;
export const PRICE_12_MONTHS_EUR = PRICE_MONTHLY_EUR * 12;
export const SAVE_ANNUAL_EUR = PRICE_12_MONTHS_EUR - PRICE_ANNUAL_EUR;
export const SAVE_ANNUAL_PERCENT = Math.round(
  (SAVE_ANNUAL_EUR / PRICE_12_MONTHS_EUR) * 100,
);

/** @deprecated use PRICE_MONTHLY_EUR */
export const PRICE_MONTHLY_VND = PRICE_MONTHLY_EUR;
/** @deprecated use PRICE_ANNUAL_EUR */
export const PRICE_ANNUAL_VND = PRICE_ANNUAL_EUR;
/** @deprecated */
export const PRICE_12_MONTHS_VND = PRICE_12_MONTHS_EUR;
/** @deprecated */
export const SAVE_ANNUAL_VND = SAVE_ANNUAL_EUR;

export const ANNUAL_LAUNCH_PROMO_PERCENT = 10;

export function annualPriceAfterPercentOff(
  baseAnnual: number,
  percentOff: number,
): number {
  if (!percentOff || percentOff <= 0 || percentOff >= 100) return baseAnnual;
  return Math.round(baseAnnual * (100 - percentOff) * 100) / 100;
}

export function annualPriceAfterLaunchPromo(
  baseAnnual: number = PRICE_ANNUAL_EUR,
): number {
  return annualPriceAfterPercentOff(baseAnnual, ANNUAL_LAUNCH_PROMO_PERCENT);
}

export const SUBSCRIPTION_PLANS: SubscriptionPlanConfig[] = [
  {
    id: 'monthly',
    nameKey: 'owner.subscription.monthly',
    priceEur: PRICE_MONTHLY_EUR,
    priceLabelKey: 'owner.subscription.perMonth',
  },
  {
    id: 'annual',
    nameKey: 'owner.subscription.annual',
    priceEur: PRICE_ANNUAL_EUR,
    priceLabelKey: 'owner.subscription.perYear',
    saveAmountEur: SAVE_ANNUAL_EUR,
  },
] as const;

/** Format EUR for display (legacy helper; prefer formatMoney). */
export function formatEur(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

/** @deprecated use formatEur / formatMoney */
export function formatVnd(amount: number): string {
  return formatEur(amount);
}
