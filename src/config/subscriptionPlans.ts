/**
 * Subscription plan configuration
 * Prices in Vietnamese dong (VND).
 */

export type SubscriptionInterval = 'monthly' | 'annual';

export interface SubscriptionPlanConfig {
	id: SubscriptionInterval;
	nameKey: string;
	priceVnd: number;
	priceLabelKey: string;
	saveAmountVnd?: number; // economy when choosing annual vs 12× monthly
}

/** Prices in VND. Monthly 390k, Annual 3150k. */
export const PRICE_MONTHLY_VND = 390_000;
export const PRICE_ANNUAL_VND = 3_150_000;
/** Regular price for 12 months (monthly × 12). Used for strikethrough on annual plan. */
export const PRICE_12_MONTHS_VND = PRICE_MONTHLY_VND * 12;
export const SAVE_ANNUAL_VND = PRICE_12_MONTHS_VND - PRICE_ANNUAL_VND; // 1 530 000
/** Savings for annual vs 12× monthly, in percent (rounded). */
export const SAVE_ANNUAL_PERCENT = Math.round(
	(SAVE_ANNUAL_VND / PRICE_12_MONTHS_VND) * 100
);

export const SUBSCRIPTION_PLANS: SubscriptionPlanConfig[] = [
	{
		id: 'monthly',
		nameKey: 'owner.subscription.monthly',
		priceVnd: PRICE_MONTHLY_VND,
		priceLabelKey: 'owner.subscription.perMonth',
	},
	{
		id: 'annual',
		nameKey: 'owner.subscription.annual',
		priceVnd: PRICE_ANNUAL_VND,
		priceLabelKey: 'owner.subscription.perYear',
		saveAmountVnd: SAVE_ANNUAL_VND,
	},
] as const;

/** Format VND for display (e.g. 390 000 ₫ or 3 150 000 ₫) */
export function formatVnd(amount: number): string {
	const s = amount.toLocaleString('vi-VN'); // "390.000" or "3.150.000"
	return `${s.replace(/\./g, ' ')} ₫`;
}

/** Legacy single plan (STARTER) for API compatibility. */
export type SubscriptionPlanType = 'STARTER';
export const SUBSCRIPTION_PLANS_LEGACY: Record<
	SubscriptionPlanType,
	{ id: SubscriptionPlanType; name: string; price: number }
> = {
	STARTER: { id: 'STARTER', name: 'Starter', price: 390000 },
};
