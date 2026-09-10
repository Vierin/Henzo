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
  accessLevel?: 'ADMIN' | 'EMPLOYEE';
  email?: string;
  phone?: string;
}): Promise<OwnerStaffMember> {
  const res = await apiClient.post<
    OwnerStaffMember | { data?: OwnerStaffMember }
  >('/trainers', {
    accessLevel: 'EMPLOYEE',
    ...body,
  });
  if (res && typeof res === 'object' && 'id' in res && res.id) {
    return res as OwnerStaffMember;
  }
  const nested = (res as { data?: OwnerStaffMember })?.data;
  if (nested?.id) return nested;
  throw new Error('Invalid create trainer response');
}

export async function updateStaff(
  id: string,
  body: { name?: string; email?: string | null; phone?: string | null },
): Promise<OwnerStaffMember> {
  return apiClient.put<OwnerStaffMember>(`/trainers/${id}`, body);
}

export async function deleteStaff(id: string): Promise<void> {
  await apiClient.delete(`/trainers/${id}`);
}

export type TrainerInviteResult = {
  success?: boolean;
  inviteUrl?: string;
  token?: string;
  expiresAt?: string;
};

/** POST /trainers/:id/invite — optional email sends transactional invite. */
export async function generateTrainerInvite(
  trainerId: string,
  sendToEmail?: string,
): Promise<TrainerInviteResult> {
  const body =
    sendToEmail && sendToEmail.trim()
      ? { sendToEmail: sendToEmail.trim() }
      : {};
  return apiClient.post<TrainerInviteResult>(
    `/trainers/${trainerId}/invite`,
    body,
  );
}

export function isTrainerPlanLimitError(err: unknown): boolean {
  const code =
    err && typeof err === 'object' && 'code' in err
      ? String((err as { code?: unknown }).code ?? '')
      : '';
  const msg = err instanceof Error ? err.message : String(err ?? '');
  return (
    code.includes('TRAINER_LIMIT') ||
    /SOLO_TRAINER_LIMIT|STUDIO_TRAINER_LIMIT|trainer limit/i.test(
      `${code} ${msg}`,
    )
  );
}

export function staffHasLinkedAccount(m: OwnerStaffMember): boolean {
  return Boolean(m.userId && String(m.userId).trim());
}
