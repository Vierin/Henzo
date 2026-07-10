import { apiClient } from '@/lib/api-client';
import {
  parseAnalytics,
  parseClientBlock,
  parseEnrollment,
  parseNotification,
  parseOnboardingChecklist,
  parseOwnerClient,
  parseOwnerSession,
  parseReview,
  parseStaffMember,
  parseStudio,
  parseSubscription,
  parseTraining,
  parseTrainingCategory,
  unwrapData,
  unwrapList,
} from './parse';
import type {
  OwnerSessionEnrollment,
  OwnerStudioClient,
  OwnerTrainingSession,
  Studio,
  StudioAnalytics,
  StudioOnboardingChecklist,
  StudioReview,
  StaffMember,
  Subscription,
  Training,
  TrainingCategory,
  NotificationInboxItem,
  OwnerClientBlock,
} from './types';

type ApiWrap<T> = { data: T; success?: boolean };

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

export async function fetchCurrentUserRole(): Promise<string | null> {
  const res = await apiClient.get<{ user: { role: string } }>('/auth/user');
  return res.user?.role ?? null;
}

export async function requestOwnerRegistrationCode(body: {
  email: string;
  password: string;
  name?: string;
}): Promise<void> {
  await apiClient.post('/auth/register-owner/request-code', body);
}

export interface OwnerRegistrationVerifyResult {
  user: {
    id: string;
    email: string;
    name?: string | null;
    role: string;
  };
  session: {
    access_token?: string;
    refresh_token?: string;
  } | null;
}

export async function verifyOwnerRegistrationCode(body: {
  email: string;
  code: string;
}): Promise<OwnerRegistrationVerifyResult> {
  return apiClient.post<OwnerRegistrationVerifyResult>(
    '/auth/register-owner/verify-code',
    body,
  );
}

export async function fetchCurrentStudio(): Promise<Studio | null> {
  try {
    const body = await apiClient.get<unknown>('/fitness/studios/current');
    const rec = asRecord(body);
    if (!rec || rec.needsSetup === true) return null;
    const data = unwrapData<Record<string, unknown>>(body);
    if (data) return parseStudio(data);
    if (rec.id) return parseStudio(rec);
    if (rec.success === false) return null;
    return null;
  } catch {
    try {
      const legacy =
        await apiClient.get<Record<string, unknown>>('/salons/current');
      if (legacy?.id) return parseStudio(legacy);
    } catch {
      return null;
    }
    return null;
  }
}

export async function createCurrentStudio(
  payload: Record<string, unknown>,
): Promise<Studio> {
  const body = await apiClient.post<Record<string, unknown>>(
    '/studios/current',
    payload,
  );
  return parseStudio(body);
}

export async function updateCurrentStudio(
  payload: Record<string, unknown>,
): Promise<Studio> {
  const body = await apiClient.put<Record<string, unknown>>(
    '/studios/current',
    payload,
  );
  return parseStudio(body);
}

export async function fetchOnboardingChecklist(): Promise<StudioOnboardingChecklist | null> {
  try {
    const body = await apiClient.get<unknown>(
      '/studios/current/onboarding-checklist',
    );
    const data = unwrapData<Record<string, unknown>>(body);
    return data ? parseOnboardingChecklist(data) : null;
  } catch {
    return null;
  }
}

export async function publishStudio(studioId: string): Promise<void> {
  await apiClient.patch(`/studios/${studioId}/publish`);
}

export async function fetchOwnerTrainingSessions(
  from: string,
  to: string,
): Promise<OwnerTrainingSession[]> {
  const q = new URLSearchParams({ from, to });
  const body = await apiClient.get<unknown>(
    `/fitness/owner/training-sessions?${q.toString()}`,
  );
  return unwrapList(body)
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => item != null)
    .map(parseOwnerSession);
}

export async function updateOwnerSessionStatus(
  sessionId: string,
  status: string,
): Promise<void> {
  await apiClient.put(`/fitness/owner/training-sessions/${sessionId}/status`, {
    status,
  });
}

export async function fetchSessionEnrollments(
  sessionId: string,
): Promise<OwnerSessionEnrollment[]> {
  const body = await apiClient.get<unknown>(
    `/fitness/owner/training-sessions/${sessionId}/enrollments`,
  );
  return unwrapList(body)
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => item != null)
    .map(parseEnrollment);
}

export async function addSessionEnrollment(
  sessionId: string,
  userId: string,
): Promise<void> {
  await apiClient.post(
    `/fitness/owner/training-sessions/${sessionId}/enrollments`,
    { userId },
  );
}

export async function fetchOwnerStudioClients(): Promise<OwnerStudioClient[]> {
  const body = await apiClient.get<unknown>('/fitness/owner/studio-clients');
  return unwrapList(body)
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => item != null)
    .map(parseOwnerClient);
}

export async function searchOwnerStudioClients(
  q: string,
): Promise<OwnerStudioClient[]> {
  const body = await apiClient.get<unknown>(
    `/fitness/owner/studio-clients/search?${new URLSearchParams({ q }).toString()}`,
  );
  return unwrapList(body)
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => item != null)
    .map(parseOwnerClient);
}

export async function createOwnerStudioClient(body: {
  name: string;
  email?: string;
  phone?: string;
}): Promise<void> {
  await apiClient.post('/fitness/owner/studio-clients', body);
}

export async function fetchClientBlocklist(): Promise<OwnerClientBlock[]> {
  const body = await apiClient.get<unknown>('/fitness/owner/client-blocklist');
  return unwrapList(body)
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => item != null)
    .map(parseClientBlock);
}

export async function blockClient(userId: string): Promise<void> {
  await apiClient.put('/fitness/owner/client-blocklist/block', { userId });
}

export async function unblockClient(userId: string): Promise<void> {
  await apiClient.put('/fitness/owner/client-blocklist/unblock', { userId });
}

export async function createRecurringSessions(body: {
  studioId: string;
  trainingId: string;
  trainerId?: string;
  locationId?: string;
  capacity: number;
  daysOfWeek?: number[];
  startTime?: string;
  weeksCount?: number;
  startsFromDate?: string;
  endsOnDate?: string;
  timezone?: string;
}): Promise<void> {
  await apiClient.post('/fitness/training-sessions/recurring', body);
}

export async function patchOwnerTrainingSession(
  sessionId: string,
  body: Record<string, unknown>,
): Promise<void> {
  await apiClient.patch(`/fitness/owner/training-sessions/${sessionId}`, body);
}

export async function deleteOwnerEnrollment(
  enrollmentId: string,
): Promise<void> {
  await apiClient.delete(`/fitness/owner/enrollments/${enrollmentId}`);
}

export async function fetchTrainings(studioId: string): Promise<Training[]> {
  const body = await apiClient.get<unknown>(
    `/trainings?studioId=${encodeURIComponent(studioId)}`,
  );
  return unwrapList(body)
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => item != null)
    .map(parseTraining);
}

export async function fetchTrainingCategories(): Promise<TrainingCategory[]> {
  const body = await apiClient.get<unknown>('/trainings/categories');
  return unwrapList(body)
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => item != null)
    .map(parseTrainingCategory)
    .sort((a, b) => a.nameEn.localeCompare(b.nameEn));
}

export async function createTraining(
  payload: Record<string, unknown>,
): Promise<Training> {
  const body = await apiClient.post<Record<string, unknown>>(
    '/trainings',
    payload,
  );
  return parseTraining(body);
}

export async function updateTraining(
  id: string,
  payload: Record<string, unknown>,
): Promise<Training> {
  const body = await apiClient.put<Record<string, unknown>>(
    `/trainings/${id}`,
    payload,
  );
  return parseTraining(body);
}

export async function deleteTraining(id: string): Promise<void> {
  await apiClient.delete(`/trainings/${id}`);
}

export async function updateTrainingSchedule(
  id: string,
  body: {
    slots: Record<string, unknown>[];
    effectiveFrom: string;
    capacity?: number;
    locationId?: string;
  },
): Promise<void> {
  await apiClient.patch(`/trainings/${id}/schedule`, body);
}

export async function fetchTrainers(studioId: string): Promise<StaffMember[]> {
  const body = await apiClient.get<unknown>(
    `/trainers?studioId=${encodeURIComponent(studioId)}`,
  );
  const list = Array.isArray(body) ? body : unwrapList(body);
  return list
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => item != null)
    .map(parseStaffMember);
}

export async function createTrainer(
  payload: Record<string, unknown>,
): Promise<StaffMember> {
  const body = await apiClient.post<Record<string, unknown>>(
    '/trainers',
    payload,
  );
  return parseStaffMember(body);
}

export async function updateTrainer(
  id: string,
  payload: Record<string, unknown>,
): Promise<StaffMember> {
  const body = await apiClient.put<Record<string, unknown>>(
    `/trainers/${id}`,
    payload,
  );
  return parseStaffMember(body);
}

export async function deleteTrainer(id: string): Promise<void> {
  await apiClient.delete(`/trainers/${id}`);
}

export async function inviteTrainer(id: string): Promise<void> {
  await apiClient.post(`/trainers/${id}/invite`);
}

export async function fetchCurrentSubscription(): Promise<Subscription | null> {
  try {
    const body = await apiClient.get<unknown>('/subscriptions/current');
    const rec = asRecord(body);
    if (!rec || rec.needsSetup === true) return null;
    const data = unwrapData<Record<string, unknown>>(body);
    return data ? parseSubscription(data) : null;
  } catch {
    return null;
  }
}

export async function createStripeCheckoutSession(
  interval: 'monthly' | 'annual',
): Promise<string> {
  const res = await apiClient.post<{ url: string }>(
    '/subscriptions/create-checkout-session',
    { interval },
  );
  return res.url;
}

export async function syncStripeCheckoutSession(
  sessionId: string,
): Promise<void> {
  await apiClient.post('/subscriptions/sync-checkout-session', { sessionId });
}

export async function fetchProPrices(): Promise<{
  monthlyVnd?: number;
  annualVnd?: number;
}> {
  const body = await apiClient.get<ApiWrap<Record<string, unknown>>>(
    '/subscriptions/pro-prices',
  );
  const data = body.data ?? {};
  return {
    monthlyVnd: Number(data.monthlyVnd) || undefined,
    annualVnd: Number(data.annualVnd) || undefined,
  };
}

export async function fetchStudioAnalytics(
  from: string,
  to: string,
): Promise<StudioAnalytics | null> {
  try {
    const q = new URLSearchParams({ from, to });
    const body = await apiClient.get<unknown>(
      `/fitness/studios/current/analytics?${q.toString()}`,
    );
    const rec = asRecord(body);
    if (!rec || rec.needsSetup === true || rec.success === false) return null;
    const data = unwrapData<Record<string, unknown>>(body);
    return data ? parseAnalytics(data) : null;
  } catch {
    return null;
  }
}

export async function fetchNotificationsInbox(): Promise<
  NotificationInboxItem[]
> {
  const body = await apiClient.get<unknown>('/notifications/inbox');
  return unwrapList(body)
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => item != null)
    .map(parseNotification);
}

export async function markNotificationsRead(ids: string[]): Promise<void> {
  await apiClient.patch('/notifications/inbox/read', { ids });
}

export async function fetchStudioReviews(
  studioId: string,
): Promise<StudioReview[]> {
  const body = await apiClient.get<unknown>(`/studios/${studioId}`);
  const rec = asRecord(body);
  const reviews = rec?.reviews;
  if (!Array.isArray(reviews)) return [];
  return reviews
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => item != null)
    .map(parseReview);
}
