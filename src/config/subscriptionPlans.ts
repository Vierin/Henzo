/**
 * Subscription plan configuration
 * Centralized constants for subscription plans and pricing
 */

export type SubscriptionPlanType = 'BASIC';

export interface SubscriptionPlanConfig {
	id: SubscriptionPlanType;
	name: string;
	price: number;
	isRecommended?: boolean;
}

/**
 * Subscription plan prices (in VND)
 */
export const SUBSCRIPTION_PRICES: Record<SubscriptionPlanType, number> = {
	BASIC: 390000,
} as const;

/**
 * Subscription plan configuration
 */
export const SUBSCRIPTION_PLANS: Record<SubscriptionPlanType, SubscriptionPlanConfig> = {
	BASIC: {
		id: 'BASIC',
		name: 'Basic',
		price: SUBSCRIPTION_PRICES.BASIC,
		isRecommended: true,
	},
} as const;

