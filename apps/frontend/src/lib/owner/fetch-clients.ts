import { apiClient } from '@/lib/api-client';
import type { OwnerStudioClient } from './types';

export async function fetchStudioClients(): Promise<OwnerStudioClient[]> {
  const res = await apiClient.get<OwnerStudioClient[]>(
    '/fitness/owner/studio-clients',
  );
  return Array.isArray(res) ? res : [];
}

export async function searchStudioClients(
  q: string,
): Promise<OwnerStudioClient[]> {
  if (q.trim().length < 2) return [];
  const res = await apiClient.get<OwnerStudioClient[]>(
    `/fitness/owner/studio-clients/search?q=${encodeURIComponent(q.trim())}`,
  );
  return Array.isArray(res) ? res : [];
}
