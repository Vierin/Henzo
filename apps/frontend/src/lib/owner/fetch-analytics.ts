import { apiClient } from '@/lib/api-client';

export type StudioAnalytics = {
  revenueTotal: number;
  bookingCount: number;
  noshowCount: number;
  enrollmentsActive: number;
  averageUtilization: number;
  clientsTotal: number;
  isPro: boolean;
};

type AnalyticsPayload = {
  revenueTotal?: number;
  bookingCount?: number;
  noshowCount?: number;
  enrollmentsActive?: number;
  averageUtilization?: number;
  clients?: { total?: number };
  isPro?: boolean;
  analyticsTier?: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : null;
}

function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function parseStudioAnalytics(raw: unknown): StudioAnalytics | null {
  const root = asRecord(raw);
  const data = (asRecord(root?.data) ?? root) as AnalyticsPayload | null;
  if (!data || typeof data.revenueTotal !== 'number') return null;
  const tier = String(data.analyticsTier ?? '').toUpperCase();
  const isPro =
    data.isPro === true || tier === 'STUDIO' || tier === 'ENTERPRISE';
  return {
    revenueTotal: num(data.revenueTotal),
    bookingCount: num(data.bookingCount),
    noshowCount: num(data.noshowCount),
    enrollmentsActive: num(data.enrollmentsActive),
    averageUtilization: num(data.averageUtilization),
    clientsTotal: num(data.clients?.total),
    isPro,
  };
}

export async function fetchStudioAnalytics(
  fromIso: string,
  toIso: string,
): Promise<StudioAnalytics | null> {
  const params = new URLSearchParams({ from: fromIso, to: toIso });
  const raw = await apiClient.get<unknown>(
    `/fitness/studios/current/analytics?${params.toString()}`,
  );
  return parseStudioAnalytics(raw);
}

export function ownerPlanHasAnalytics(
  sub: {
    type?: string | null;
    tier?: string | null;
    status?: string | null;
  } | null,
): boolean {
  const type = (sub?.type ?? sub?.tier ?? '').toUpperCase();
  const status = (sub?.status ?? '').toUpperCase();
  return (
    (type === 'STUDIO' || type === 'ENTERPRISE' || type === 'PRO') &&
    status === 'ACTIVE'
  );
}

export function isoLocalDayStart(day: Date): string {
  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
  ).toISOString();
}

export function isoLocalDayEnd(day: Date): string {
  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    23,
    59,
    59,
  ).toISOString();
}

export function analyticsRange(days: number): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
  );
  const start = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  start.setDate(start.getDate() - (days - 1));
  return { start, end };
}
