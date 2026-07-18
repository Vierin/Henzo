import { apiClient } from '@/lib/api-client';
import type {
  AdminFeedbackRow,
  AdminOverview,
  AdminSettings,
  AdminStudioDetail,
  AdminStudioRow,
  AdminSubscription,
  AdminTrainer,
  AdminTraining,
  Paginated,
  StudioActivityResponse,
  StudioAnalyticsData,
} from './types';

type ApiWrap<T> = { data: T };

export async function verifyAdminSession(): Promise<{
  authenticated: true;
  email: string;
}> {
  const res =
    await apiClient.get<ApiWrap<{ authenticated: true; email: string }>>(
      '/admin/session',
    );
  return res.data;
}

export async function fetchAdminOverview(): Promise<AdminOverview> {
  const res = await apiClient.get<ApiWrap<AdminOverview>>('/admin/overview');
  return res.data;
}

export async function fetchAdminStudios(params: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  activityTier?: string;
}): Promise<Paginated<AdminStudioRow>> {
  const q = new URLSearchParams();
  if (params.page) q.set('page', String(params.page));
  if (params.limit) q.set('limit', String(params.limit));
  if (params.status) q.set('status', params.status);
  if (params.search) q.set('search', params.search);
  if (params.activityTier) q.set('activityTier', params.activityTier);
  const res = await apiClient.get<ApiWrap<Paginated<AdminStudioRow>>>(
    `/admin/studios?${q.toString()}`,
  );
  return res.data;
}

export async function fetchAdminStudioActivity(
  id: string,
): Promise<StudioActivityResponse> {
  const res = await apiClient.get<ApiWrap<StudioActivityResponse>>(
    `/admin/studios/${id}/activity`,
  );
  return res.data;
}

export async function fetchAdminStudio(id: string): Promise<AdminStudioDetail> {
  const res = await apiClient.get<ApiWrap<AdminStudioDetail>>(
    `/admin/studios/${id}`,
  );
  return res.data;
}

export async function fetchAdminStudioAnalytics(
  id: string,
  from: string,
  to: string,
): Promise<{ success: boolean; data: StudioAnalyticsData | null }> {
  const q = new URLSearchParams({ from, to });
  const res = await apiClient.get<
    ApiWrap<{ success: boolean; data: StudioAnalyticsData | null }>
  >(`/admin/studios/${id}/analytics?${q.toString()}`);
  return res.data;
}

export async function patchAdminStudioProfile(
  id: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  const res = await apiClient.patch<ApiWrap<unknown>>(
    `/admin/studios/${id}/profile`,
    body,
  );
  return res.data;
}

export async function fetchAdminStudioTrainings(
  studioId: string,
): Promise<AdminTraining[]> {
  const res = await apiClient.get<ApiWrap<AdminTraining[]>>(
    `/admin/studios/${studioId}/trainings`,
  );
  return res.data;
}

export async function createAdminStudioTraining(
  studioId: string,
  body: {
    name: string;
    duration: number;
    price: number;
    studioId: string;
    description?: string;
    trainingCategoryId?: number;
  },
): Promise<unknown> {
  const res = await apiClient.post<ApiWrap<unknown>>(
    `/admin/studios/${studioId}/trainings`,
    body,
  );
  return res.data;
}

export async function fetchAdminStudioTrainers(
  studioId: string,
): Promise<AdminTrainer[]> {
  const res = await apiClient.get<ApiWrap<AdminTrainer[]>>(
    `/admin/studios/${studioId}/trainers`,
  );
  return res.data;
}

export async function createAdminStudioTrainer(
  studioId: string,
  body: {
    name: string;
    email?: string;
    phone?: string;
    accessLevel: 'ADMIN' | 'EMPLOYEE';
  },
): Promise<unknown> {
  const res = await apiClient.post<ApiWrap<unknown>>(
    `/admin/studios/${studioId}/trainers`,
    body,
  );
  return res.data;
}

export async function updateAdminStudioTrainer(
  studioId: string,
  trainerId: string,
  body: {
    name?: string;
    email?: string;
    phone?: string;
    accessLevel?: 'ADMIN' | 'EMPLOYEE';
  },
): Promise<unknown> {
  const res = await apiClient.patch<ApiWrap<unknown>>(
    `/admin/studios/${studioId}/trainers/${trainerId}`,
    body,
  );
  return res.data;
}

export async function updateAdminStudioTraining(
  studioId: string,
  trainingId: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  const res = await apiClient.patch<ApiWrap<unknown>>(
    `/admin/studios/${studioId}/trainings/${trainingId}`,
    body,
  );
  return res.data;
}

export async function createAdminRecurringSessions(
  studioId: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  const res = await apiClient.post<ApiWrap<unknown>>(
    `/admin/studios/${studioId}/training-sessions/recurring`,
    body,
  );
  return res.data;
}

export async function fetchAdminSubscriptions(params: {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
}): Promise<Paginated<AdminSubscription>> {
  const q = new URLSearchParams();
  if (params.page) q.set('page', String(params.page));
  if (params.limit) q.set('limit', String(params.limit));
  if (params.status) q.set('status', params.status);
  if (params.type) q.set('type', params.type);
  const res = await apiClient.get<ApiWrap<Paginated<AdminSubscription>>>(
    `/admin/subscriptions?${q.toString()}`,
  );
  return res.data;
}

export async function patchAdminSubscription(
  id: string,
  body: {
    type?: string;
    status?: string;
    currentPeriodEnd?: string | null;
    manualOverride?: boolean;
  },
): Promise<AdminSubscription> {
  const res = await apiClient.patch<ApiWrap<AdminSubscription>>(
    `/admin/subscriptions/${id}`,
    body,
  );
  return res.data;
}

export async function fetchAdminNotifications(params: {
  page?: number;
  limit?: number;
  type?: string;
}): Promise<Paginated<Record<string, unknown>>> {
  const q = new URLSearchParams();
  if (params.page) q.set('page', String(params.page));
  if (params.limit) q.set('limit', String(params.limit));
  if (params.type) q.set('type', params.type);
  const res = await apiClient.get<ApiWrap<Paginated<Record<string, unknown>>>>(
    `/admin/notifications?${q.toString()}`,
  );
  return res.data;
}

export async function fetchAdminFeedback(params: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<Paginated<AdminFeedbackRow>> {
  const q = new URLSearchParams();
  if (params.page) q.set('page', String(params.page));
  if (params.limit) q.set('limit', String(params.limit));
  if (params.status) q.set('status', params.status);
  const res = await apiClient.get<ApiWrap<Paginated<AdminFeedbackRow>>>(
    `/admin/feedback?${q.toString()}`,
  );
  return res.data;
}

export async function patchAdminFeedback(
  id: string,
  body: { status?: string; adminNote?: string },
): Promise<AdminFeedbackRow> {
  const res = await apiClient.patch<ApiWrap<AdminFeedbackRow>>(
    `/admin/feedback/${id}`,
    body,
  );
  return res.data;
}

export async function fetchAdminSettings(): Promise<AdminSettings> {
  const res = await apiClient.get<ApiWrap<AdminSettings>>('/admin/settings');
  return res.data;
}

export async function fetchCurrentUserRole(): Promise<string | null> {
  const res = await apiClient.get<{ user: { role: string } }>('/auth/user');
  return res.user?.role ?? null;
}
