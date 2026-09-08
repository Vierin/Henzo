import { apiClient } from '@/lib/api-client';

export type OwnerSubscription = {
  plan?: string | null;
  status?: string | null;
  tier?: string | null;
  name?: string | null;
};

export type OwnerUsage = {
  tier?: string;
  /** Sessions / classes created this month */
  classesUsed: number;
  classesLimit: number | null;
  trainersUsed: number;
  trainersLimit: number | null;
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function asNum(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function fetchOwnerSubscription(): Promise<OwnerSubscription | null> {
  try {
    const raw = await apiClient.get<unknown>('/subscriptions/current');
    const root = asRecord(raw);
    const data = asRecord(root?.data) ?? root;
    if (!data) return null;
    return {
      plan: data.plan
        ? String(data.plan)
        : data.tier
          ? String(data.tier)
          : null,
      status: data.status ? String(data.status) : null,
      tier: data.tier ? String(data.tier) : null,
      name: data.name ? String(data.name) : null,
    };
  } catch {
    return null;
  }
}

/** GET /subscriptions/usage — backend: sessionsUsed/sessionsLimit + trainers*. */
export async function fetchOwnerUsage(): Promise<OwnerUsage | null> {
  try {
    const raw = await apiClient.get<unknown>('/subscriptions/usage');
    const root = asRecord(raw);
    const data = asRecord(root?.data) ?? root;
    if (!data) return null;

    const classesUsed =
      asNum(data.sessionsUsed) ??
      asNum(data.classesUsed) ??
      asNum(data.monthlySessionsCount) ??
      0;
    const classesLimit =
      asNum(data.sessionsLimit) ??
      asNum(data.classesLimit) ??
      asNum(data.sessionLimit);
    const trainersUsed =
      asNum(data.trainersUsed) ??
      asNum(data.trainerCount) ??
      asNum(data.usedTrainers) ??
      0;
    const trainersLimit = asNum(data.trainersLimit) ?? asNum(data.trainerLimit);

    return {
      tier: data.tier ? String(data.tier) : undefined,
      classesUsed,
      classesLimit,
      trainersUsed,
      trainersLimit,
    };
  } catch {
    return null;
  }
}

export function planBadgeLabel(sub: OwnerSubscription | null): string {
  const raw = (sub?.name || sub?.plan || sub?.tier || 'Solo').toString();
  const lower = raw.toLowerCase();
  if (lower.includes('enterprise')) return 'Enterprise';
  if (lower.includes('studio') || lower.includes('pro')) return 'Studio';
  if (
    lower.includes('solo') ||
    lower.includes('free') ||
    lower.includes('basic')
  )
    return 'Solo';
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}
