/** Matches Prisma `SubscriptionType` enum values. */
export type SubscriptionTier = 'SOLO' | 'STUDIO' | 'ENTERPRISE';

export function isSoloSubscriptionType(
  type: SubscriptionTier | null | undefined,
): boolean {
  return type == null || type === 'SOLO';
}

export function isPaidSubscriptionType(
  type: SubscriptionTier | null | undefined,
): boolean {
  return type === 'STUDIO' || type === 'ENTERPRISE';
}
