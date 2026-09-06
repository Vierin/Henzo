import { apiClient } from '@/lib/api-client';
import type { OwnerTrainingSession } from './types';

export async function fetchOwnerSessions(params: {
  from: string;
  to: string;
}): Promise<OwnerTrainingSession[]> {
  const q = new URLSearchParams({
    from: params.from,
    to: params.to,
  });
  const res = await apiClient.get<OwnerTrainingSession[]>(
    `/fitness/owner/training-sessions?${q.toString()}`,
  );
  return Array.isArray(res) ? res : [];
}

export function dayBoundsIso(date: Date): { from: string; to: string } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { from: start.toISOString(), to: end.toISOString() };
}
