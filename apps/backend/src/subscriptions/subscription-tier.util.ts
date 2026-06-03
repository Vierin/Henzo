import { SubscriptionType } from '@prisma/client';

export function isSoloSubscriptionType(
  type: SubscriptionType | null | undefined,
): boolean {
  return type == null || type === SubscriptionType.SOLO;
}

export function isPaidSubscriptionType(
  type: SubscriptionType | null | undefined,
): boolean {
  return (
    type === SubscriptionType.STUDIO || type === SubscriptionType.ENTERPRISE
  );
}
