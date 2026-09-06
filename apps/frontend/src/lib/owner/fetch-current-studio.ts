import { apiClient } from '@/lib/api-client';
import type { OwnerStudio } from './types';

type CurrentStudioResponse = {
  success?: boolean;
  data?: OwnerStudio | null;
  needsSetup?: boolean;
  message?: string;
};

export async function fetchCurrentStudio(): Promise<{
  studio: OwnerStudio | null;
  needsSetup: boolean;
}> {
  const res = await apiClient.get<CurrentStudioResponse>(
    '/fitness/studios/current',
  );
  return {
    studio: res.data ?? null,
    needsSetup: Boolean(res.needsSetup || !res.data),
  };
}

export async function createCurrentStudio(body: {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  timezone?: string;
}): Promise<OwnerStudio> {
  return apiClient.post<OwnerStudio>('/studios/current', body);
}
