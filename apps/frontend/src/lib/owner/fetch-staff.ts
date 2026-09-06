import { apiClient } from '@/lib/api-client';
import type { OwnerStaffMember } from './types';

export async function fetchStaff(
  studioId: string,
): Promise<OwnerStaffMember[]> {
  const res = await apiClient.get<OwnerStaffMember[]>(
    `/trainers?studioId=${encodeURIComponent(studioId)}`,
  );
  return Array.isArray(res) ? res : [];
}

export async function createStaff(body: {
  name: string;
  studioId: string;
  accessLevel: 'ADMIN' | 'EMPLOYEE';
  email?: string;
  phone?: string;
}): Promise<OwnerStaffMember> {
  return apiClient.post<OwnerStaffMember>('/trainers', body);
}
