import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

// Types for client data
export interface ClientBooking {
	id: string;
	salonId: string;
	serviceId: string;
	staffId?: string;
	time: string;
	status: 'PENDING' | 'CONFIRMED' | 'CANCELED';
	notes?: string;
	createdAt: string;
	service: {
		id: string;
		name: string;
		description?: string;
		duration: number;
		price: number;
	};
	staff?: {
		id: string;
		name: string;
	};
	salon: {
		id: string;
		name: string;
		address?: string;
		phone?: string;
		logo?: string;
		photos: string[];
	};
}

export interface ClientReview {
	id: string;
	salonId: string;
	bookingId?: string;
	rating: number;
	comment?: string;
	createdAt: string;
	salon: {
		id: string;
		name: string;
		logo?: string;
	};
	booking?: {
		id: string;
		service: {
			name: string;
		};
		time: string;
	};
}

// Hook to get user's bookings
export function useUserBookings() {
	return useQuery({
		queryKey: ['user-bookings'],
		queryFn: async (): Promise<ClientBooking[]> => {
			try {
				const response = await apiClient.get('/bookings/user');
				return (response as any).data || [];
			} catch (error) {
				console.error('Error fetching user bookings:', error);
				return [];
			}
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
	});
}

// Hook to get user's reviews
export function useUserReviews() {
	return useQuery({
		queryKey: ['user-reviews'],
		queryFn: async (): Promise<ClientReview[]> => {
			try {
				const response = await apiClient.get('/reviews/user');
				return (response as any).data || [];
			} catch (error) {
				console.error('Error fetching user reviews:', error);
				return [];
			}
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
	});
}

// Hook to get upcoming bookings
export function useUpcomingBookings() {
	return useQuery({
		queryKey: ['upcoming-bookings'],
		queryFn: async (): Promise<ClientBooking[]> => {
			try {
				const response = await apiClient.get('/bookings/user/upcoming');
				return (response as any).data || [];
			} catch (error) {
				console.error('Error fetching upcoming bookings:', error);
				return [];
			}
		},
		staleTime: 2 * 60 * 1000, // 2 minutes
	});
}

// Hook to get completed bookings (for reviews)
export function useCompletedBookings() {
	return useQuery({
		queryKey: ['completed-bookings'],
		queryFn: async (): Promise<ClientBooking[]> => {
			try {
				const response = await apiClient.get('/bookings/user/completed');
				return (response as any).data || [];
			} catch (error) {
				console.error('Error fetching completed bookings:', error);
				return [];
			}
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
	});
}
