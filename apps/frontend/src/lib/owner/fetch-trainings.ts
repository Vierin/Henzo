import { apiClient } from '@/lib/api-client';
import type { OwnerTraining } from './types';

export async function fetchTrainings(
  studioId: string,
): Promise<OwnerTraining[]> {
  const res = await apiClient.get<OwnerTraining[]>(
    `/trainings?studioId=${encodeURIComponent(studioId)}`,
  );
  return Array.isArray(res) ? res : [];
}

export async function createTraining(body: {
  name: string;
  duration: number;
  price: number;
  studioId: string;
  description?: string;
  trainingCategoryId?: number;
}): Promise<OwnerTraining> {
  return apiClient.post<OwnerTraining>('/trainings', body);
}

export async function updateTraining(
  id: string,
  body: {
    name?: string;
    duration?: number;
    price?: number;
    description?: string;
    trainingCategoryId?: number;
  },
): Promise<OwnerTraining> {
  return apiClient.put<OwnerTraining>(`/trainings/${id}`, body);
}
