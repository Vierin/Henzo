import { apiClient } from '@/lib/api-client';
import type { OwnerSessionEnrollment, OwnerTrainingSession } from './types';

export async function fetchSessionEnrollments(
  sessionId: string,
): Promise<OwnerSessionEnrollment[]> {
  const res = await apiClient.get<OwnerSessionEnrollment[]>(
    `/fitness/owner/training-sessions/${sessionId}/enrollments`,
  );
  return Array.isArray(res) ? res : [];
}

export async function updateEnrollmentStatus(
  enrollmentId: string,
  status: 'ACTIVE' | 'NO_SHOW' | 'CANCELLED',
): Promise<void> {
  await apiClient.patch(`/fitness/owner/enrollments/${enrollmentId}/status`, {
    status,
  });
}

export async function updateOwnerSessionStatus(
  sessionId: string,
  status: 'ACTIVE' | 'CANCELLED' | 'COMPLETED',
  note?: string,
): Promise<void> {
  await apiClient.put(`/fitness/owner/training-sessions/${sessionId}/status`, {
    status,
    ...(note ? { note } : {}),
  });
}

export async function patchOwnerTrainingSession(
  sessionId: string,
  body: {
    startsAt?: string;
    trainerId?: string | null;
    locationId?: string | null;
    applyToFollowing?: boolean;
    status?: 'ACTIVE' | 'CANCELLED' | 'COMPLETED';
    note?: string;
  },
): Promise<void> {
  await apiClient.patch(
    `/fitness/owner/training-sessions/${encodeURIComponent(sessionId)}`,
    body,
  );
}

export async function fetchOwnerSessionById(
  sessionId: string,
  from: string,
  to: string,
): Promise<OwnerTrainingSession | null> {
  const list = await apiClient.get<OwnerTrainingSession[]>(
    `/fitness/owner/training-sessions?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
  );
  if (!Array.isArray(list)) return null;
  return list.find((s) => s.sessionId === sessionId) ?? null;
}
