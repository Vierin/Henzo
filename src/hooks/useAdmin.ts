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
		type: 'FREEMIUM' | 'BASIC' | 'ENTERPRISE';
		status: string;
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

// Hook to get all salons
export function useAdminSalons() {
	return useQuery({
		queryKey: ['admin-salons'],
		queryFn: async (): Promise<AdminSalon[]> => {
			try {
				const response = await apiClient.get<AdminSalon[]>('/admin/salons');
				return response;
			} catch (error) {
				console.error('Error fetching admin salons:', error);
				throw error;
			}
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
	});
}

// Hook to get all bookings
export function useAdminBookings() {
	return useQuery({
		queryKey: ['admin-bookings'],
		queryFn: async (): Promise<AdminBooking[]> => {
			try {
				const response = await apiClient.get<
					| AdminBooking[]
					| { data: AdminBooking[]; pagination: any }
				>('/admin/bookings');
				// Handle both array response and paginated response
				if (Array.isArray(response)) {
					return response;
				}
				// Handle paginated response
				if (response && typeof response === 'object' && 'data' in response) {
					return Array.isArray(response.data) ? response.data : [];
				}
				return [];
			} catch (error) {
				console.error('Error fetching admin bookings:', error);
				throw error;
			}
		},
		staleTime: 1 * 60 * 1000, // 1 minute
	});
}

// Hook to get subscriptions
export function useAdminSubscriptions() {
	return useQuery({
		queryKey: ['admin-subscriptions'],
		queryFn: async () => {
			try {
				const response = await apiClient.get<any>('/admin/subscriptions');
				return response;
			} catch (error) {
				console.error('Error fetching admin subscriptions:', error);
				throw error;
			}
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
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

// Hook to get customers
export function useAdminCustomers() {
	return useQuery({
		queryKey: ['admin-customers'],
		queryFn: async () => {
			try {
				const response = await apiClient.get<any>('/admin/customers');
				return response;
			} catch (error) {
				console.error('Error fetching admin customers:', error);
				throw error;
			}
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
	});
}
