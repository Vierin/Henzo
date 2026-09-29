/**
 * Web plan quotas. Enforcement lives in
 * `apps/backend/src/subscriptions/plan-limits.constants.ts`
 * and `apps/mobile/lib/config/plan_limits.dart` — keep those three in sync.
 */
export const PLAN_LIMITS = {
  solo: { trainers: 1, sessionsPerMonth: 50 },
  studio: { trainers: 5, sessionsPerMonth: 180 },
  enterprise: { trainers: null, sessionsPerMonth: null },
} as const;

export type PlanLimitTier = keyof typeof PLAN_LIMITS;

export function quotaForTier(tier: string | null | undefined) {
  const raw = (tier ?? '').toUpperCase();
  if (raw.includes('ENTERPRISE')) return PLAN_LIMITS.enterprise;
  if (raw.includes('STUDIO') || raw.includes('PRO')) return PLAN_LIMITS.studio;
  if (raw.includes('SOLO') || raw.includes('FREEMIUM') || raw === '') {
    return PLAN_LIMITS.solo;
  }
  return PLAN_LIMITS.enterprise;
}

/** Replaces `{sessions}` and `{trainers}` in plan copy. */
export function fillPlanLimitTokens(
  text: string,
  tier: string | null | undefined,
) {
  const quota = quotaForTier(tier);
  return text
    .replaceAll('{sessions}', String(quota.sessionsPerMonth ?? ''))
    .replaceAll('{trainers}', String(quota.trainers ?? ''));
}
