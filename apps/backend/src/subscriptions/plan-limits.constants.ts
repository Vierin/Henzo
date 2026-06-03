import type { SubscriptionTier } from './subscription-tier.util';

export const SOLO_TRAINER_LIMIT = 1;
export const SOLO_SESSIONS_PER_MONTH = 12;

export const STUDIO_TRAINER_LIMIT = 4;
export const STUDIO_SESSIONS_PER_MONTH = 100;

export type PlanQuota = {
  trainerLimit: number;
  sessionsPerMonth: number;
};

export function planQuotaForType(
  type: SubscriptionTier | null | undefined,
): PlanQuota | null {
  if (type == null || type === 'SOLO') {
    return {
      trainerLimit: SOLO_TRAINER_LIMIT,
      sessionsPerMonth: SOLO_SESSIONS_PER_MONTH,
    };
  }
  if (type === 'STUDIO') {
    return {
      trainerLimit: STUDIO_TRAINER_LIMIT,
      sessionsPerMonth: STUDIO_SESSIONS_PER_MONTH,
    };
  }
  return null;
}
