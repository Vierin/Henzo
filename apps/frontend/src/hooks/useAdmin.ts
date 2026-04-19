import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

// Dashboard data types
export interface DashboardData {
	overview: {
		newSalons: number;
		totalSalons: number;
	};
	bookingStats: {
		totalBookings: number;
		changePercent: number;
		trends: Array<{
			date: string;
			count: number;
		}>;
	};
	subscriptions: Array<{
		salon: string;
		subscriptionType: string;
		status: string;
		nextPaymentDate: string;
	}>;
	smsUsage: {
		sent: number;
		balance: number;
	};
	customers: Array<{
		salon: string;
		totalCustomers: number;
	}>;
}

// Salon data types
export interface AdminSalon {
	id: string;
	name: string;
	description?: string;
	address?: string;
	phone?: string;
	email?: string;
	website?: string;
	instagram?: string;
	logo?: string;
	photos: string[];
	workingHours?: any;
	owner: {
		id: string;
		name?: string;
		email: string;
	};
	_count: {
		bookings: number;
		reviews: number;
		staff: number;
		services: number;
	};
	subscription?: {
		type: 'TRIAL' | 'STARTER';
		status: string;
		startDate?: string;
		endDate?: string;
		trialEndDate?: string;
		nextPaymentDate?: string;
		amount?: number;
	};
	createdAt: string;
}

// Booking data types
export interface AdminBooking {
	id: string;
	time: string;
	status: string;
	notes?: string;
	createdAt: string;
	salon: {
		id: string;
		name: string;
	};
	user: {
		id: string;
		name?: string;
		email: string;
	};
	service: {
		id: string;
		name: string;
		price: number;
	};
	staff?: {
		id: string;
		name: string;
	};
}

// Hook to get dashboard data
export function useAdminDashboard() {
	return useQuery({
		queryKey: ['admin-dashboard'],
		queryFn: async (): Promise<DashboardData> => {
			try {
				const response = await apiClient.get<DashboardData>('/admin/dashboard');
				return response;
			} catch (error) {
				console.error('Error fetching admin dashboard:', error);
				throw error;
			}
		},
		staleTime: 2 * 60 * 1000, // 2 minutes
	});
}

export interface PaginationMeta {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
	hasNextPage: boolean;
	hasPreviousPage: boolean;
}

// Hook to get all salons (paginated)
export function useAdminSalons(params?: { page?: number; limit?: number }) {
	const page = params?.page ?? 1;
	const limit = params?.limit ?? 50;
	return useQuery({
		queryKey: ['admin-salons', page, limit],
		queryFn: async (): Promise<{
			data: AdminSalon[];
			pagination: PaginationMeta;
		}> => {
			const response = await apiClient.get<{
				data: AdminSalon[];
				pagination: PaginationMeta;
			}>(`/admin/salons?page=${page}&limit=${limit}`);
			return Array.isArray(response)
				? {
						data: response,
						pagination: {
							page: 1,
							limit: response.length,
							total: response.length,
							totalPages: 1,
							hasNextPage: false,
							hasPreviousPage: false,
						},
					}
				: response;
		},
		staleTime: 5 * 60 * 1000,
	});
}

// Hook to get all bookings (paginated)
export function useAdminBookings(params?: {
	page?: number;
	limit?: number;
	status?: string;
	search?: string;
	sortBy?: string;
	sortOrder?: 'asc' | 'desc';
}) {
	const {
		page = 1,
		limit = 20,
		status,
		search,
		sortBy,
		sortOrder,
	} = params ?? {};
	const query = new URLSearchParams({
		page: String(page),
		limit: String(limit),
	});
	if (status) query.set('status', status);
	if (search) query.set('search', search);
	if (sortBy) query.set('sortBy', sortBy);
	if (sortOrder) query.set('sortOrder', sortOrder);
	return useQuery({
		queryKey: [
			'admin-bookings',
			page,
			limit,
			status,
			search,
			sortBy,
			sortOrder,
		],
		queryFn: async (): Promise<{
			data: AdminBooking[];
			pagination: PaginationMeta;
		}> => {
			const response = await apiClient.get<
				{ data: AdminBooking[]; pagination: PaginationMeta } | AdminBooking[]
			>(`/admin/bookings?${query}`);
			if (Array.isArray(response)) {
				return {
					data: response,
					pagination: {
						page: 1,
						limit: response.length,
						total: response.length,
						totalPages: 1,
						hasNextPage: false,
						hasPreviousPage: false,
					},
				};
			}
			return response as { data: AdminBooking[]; pagination: PaginationMeta };
		},
		staleTime: 1 * 60 * 1000,
	});
}

// Hook to get subscriptions (paginated)
export function useAdminSubscriptions(params?: {
	page?: number;
	limit?: number;
}) {
	const page = params?.page ?? 1;
	const limit = params?.limit ?? 50;
	return useQuery({
		queryKey: ['admin-subscriptions', page, limit],
		queryFn: async (): Promise<{ data: any[]; pagination: PaginationMeta }> => {
			const response = await apiClient.get<{
				data: any[];
				pagination: PaginationMeta;
			}>(`/admin/subscriptions?page=${page}&limit=${limit}`);
			return Array.isArray(response)
				? {
						data: response,
						pagination: {
							page: 1,
							limit: response.length,
							total: response.length,
							totalPages: 1,
							hasNextPage: false,
							hasPreviousPage: false,
						},
					}
				: response;
		},
		staleTime: 5 * 60 * 1000,
	});
}

// Hook to get SMS usage
export function useAdminSmsUsage() {
	return useQuery({
		queryKey: ['admin-sms-usage'],
		queryFn: async () => {
			try {
				const response = await apiClient.get<any>('/admin/sms-usage');
				return response;
			} catch (error) {
				console.error('Error fetching admin SMS usage:', error);
				throw error;
			}
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
	});
}

// Hook to get customers (paginated)
export function useAdminCustomers(params?: { page?: number; limit?: number }) {
	const page = params?.page ?? 1;
	const limit = params?.limit ?? 50;
	return useQuery({
		queryKey: ['admin-customers', page, limit],
		queryFn: async (): Promise<{
			data: Array<{ salon: string; totalCustomers: number }>;
			pagination: PaginationMeta;
		}> => {
			const response = await apiClient.get<{
				data: any[];
				pagination: PaginationMeta;
			}>(`/admin/customers?page=${page}&limit=${limit}`);
			return Array.isArray(response)
				? {
						data: response,
						pagination: {
							page: 1,
							limit: response.length,
							total: response.length,
							totalPages: 1,
							hasNextPage: false,
							hasPreviousPage: false,
						},
					}
				: response;
		},
		staleTime: 5 * 60 * 1000,
	});
}
