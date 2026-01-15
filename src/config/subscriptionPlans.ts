/**
 * Subscription plan configuration
 * Centralized constants for subscription plans and pricing
 */

export type SubscriptionPlanType = 'FREEMIUM' | 'BASIC' | 'ENTERPRISE';

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
	FREEMIUM: 0,
	BASIC: 390000,
	ENTERPRISE: 0, // TODO: Set enterprise price
} as const;

/**
 * Subscription plan configuration
 */
export const SUBSCRIPTION_PLANS: Record<SubscriptionPlanType, SubscriptionPlanConfig> = {
	FREEMIUM: {
		id: 'FREEMIUM',
		name: 'Freemium',
		price: SUBSCRIPTION_PRICES.FREEMIUM,
	},
	BASIC: {
		id: 'BASIC',
		name: 'Basic',
		price: SUBSCRIPTION_PRICES.BASIC,
		isRecommended: true,
	},
	ENTERPRISE: {
		id: 'ENTERPRISE',
		name: 'Enterprise',
		price: SUBSCRIPTION_PRICES.ENTERPRISE,
	},
} as const;

