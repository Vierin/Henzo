import { apiClient } from '@/lib/api-client';
import type {
	AdminOverview,
	AdminSettings,
	AdminStudioRow,
	Paginated,
} from './types';

type ApiWrap<T> = { data: T };

export async function fetchAdminOverview(): Promise<AdminOverview> {
	const res = await apiClient.get<ApiWrap<AdminOverview>>('/admin/overview');
	return res.data;
}

export async function fetchAdminStudios(params: {
	page?: number;
	limit?: number;
	status?: string;
	search?: string;
}): Promise<Paginated<AdminStudioRow>> {
	const q = new URLSearchParams();
	if (params.page) q.set('page', String(params.page));
	if (params.limit) q.set('limit', String(params.limit));
	if (params.status) q.set('status', params.status);
	if (params.search) q.set('search', params.search);
	const res = await apiClient.get<ApiWrap<Paginated<AdminStudioRow>>>(
		`/admin/studios?${q.toString()}`
	);
	return res.data;
}

export async function fetchAdminSubscriptions(params: {
	page?: number;
	limit?: number;
	status?: string;
	type?: string;
}): Promise<Paginated<Record<string, unknown>>> {
	const q = new URLSearchParams();
	if (params.page) q.set('page', String(params.page));
	if (params.limit) q.set('limit', String(params.limit));
	if (params.status) q.set('status', params.status);
	if (params.type) q.set('type', params.type);
	const res = await apiClient.get<ApiWrap<Paginated<Record<string, unknown>>>>(
		`/admin/subscriptions?${q.toString()}`
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
		`/admin/notifications?${q.toString()}`
	);
	return res.data;
}

export async function fetchAdminFeedback(params: {
	page?: number;
	limit?: number;
}): Promise<Paginated<Record<string, unknown>>> {
	const q = new URLSearchParams();
	if (params.page) q.set('page', String(params.page));
	if (params.limit) q.set('limit', String(params.limit));
	const res = await apiClient.get<ApiWrap<Paginated<Record<string, unknown>>>>(
		`/admin/feedback?${q.toString()}`
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
