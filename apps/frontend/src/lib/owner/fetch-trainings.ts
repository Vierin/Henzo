import { apiClient } from '@/lib/api-client';
import type { OwnerTraining } from './types';

export async function fetchTrainings(
  studioId: string,
): Promise<OwnerTraining[]> {
  const res = await apiClient.get<OwnerTraining[] | { data?: OwnerTraining[] }>(
    `/trainings?studioId=${encodeURIComponent(studioId)}`,
  );
  if (Array.isArray(res)) return res;
  if (res && typeof res === 'object' && Array.isArray(res.data))
    return res.data;
  return [];
}

export async function createTraining(body: {
  name: string;
  duration: number;
  price: number;
  studioId: string;
  description?: string;
  language?: string;
  trainingCategoryId?: number;
  trainerIds?: string[];
}): Promise<OwnerTraining> {
  const res = await apiClient.post<OwnerTraining | { data?: OwnerTraining }>(
    '/trainings',
    body,
  );
  if (res && typeof res === 'object' && 'id' in res && res.id) {
    return res as OwnerTraining;
  }
  const nested = (res as { data?: OwnerTraining })?.data;
  if (nested?.id) return nested;
  throw new Error('Invalid create training response');
}

export async function updateTraining(
  id: string,
  body: {
    name?: string;
    duration?: number;
    price?: number;
    description?: string;
    language?: string;
    trainingCategoryId?: number | null;
  },
): Promise<OwnerTraining> {
  return apiClient.put<OwnerTraining>(`/trainings/${id}`, body);
}

export async function updateTrainingSchedule(
  id: string,
  body: {
    slots: { day: number; startTime: string }[];
    effectiveFrom: string;
    capacity?: number;
    locationId?: string;
  },
): Promise<{
  createdCount?: number;
  removedCount?: number;
  skippedBookedCount?: number;
  skippedConflicts?: number;
}> {
  const res = await apiClient.patch<
    | {
        createdCount?: number;
        removedCount?: number;
        skippedBookedCount?: number;
        skippedConflicts?: number;
        data?: {
          createdCount?: number;
          removedCount?: number;
          skippedBookedCount?: number;
          skippedConflicts?: number;
        };
      }
    | undefined
  >(`/trainings/${id}/schedule`, body);
  if (res && typeof res === 'object' && res.data) return res.data;
  return res ?? {};
}

export async function updateTrainingSessionDefaults(
  id: string,
  body: { capacity?: number; locationId?: string },
): Promise<void> {
  await apiClient.patch(`/trainings/${id}/session-defaults`, body);
}
