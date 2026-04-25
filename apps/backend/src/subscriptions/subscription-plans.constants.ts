/**
 * Subscription plan configuration
 * Centralized constants for subscription plans and pricing
 */

export type SubscriptionPlanType = 'FREEMIUM' | 'PRO';

/**
 * Subscription plan prices (in VND)
 */
export const SUBSCRIPTION_PRICES: Record<SubscriptionPlanType, number> = {
  FREEMIUM: 0,
  PRO: 390000,
} as const;
