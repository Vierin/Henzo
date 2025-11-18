import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from 'react-hot-toast';

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
				return (response as any) || [];
			} catch (error) {
				return [];
			}
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
		refetchOnMount: false, // Не перезапрашивать если данные свежие
		refetchOnWindowFocus: false, // Не перезапрашивать при фокусе окна
	});
}

// Hook to get user's reviews
export function useUserReviews(enabled: boolean = true) {
	return useQuery({
		queryKey: ['user-reviews'],
		queryFn: async (): Promise<ClientReview[]> => {
			try {
				const response = await apiClient.get('/reviews/user');
				return (response as any) || [];
			} catch (error) {
				return [];
			}
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
		refetchOnMount: false, // Не перезапрашивать если данные свежие
		refetchOnWindowFocus: false, // Не перезапрашивать при фокусе окна
		enabled,
	});
}

// Hook to get upcoming bookings
export function useUpcomingBookings(enabled: boolean = true) {
	return useQuery({
		queryKey: ['upcoming-bookings'],
		queryFn: async (): Promise<ClientBooking[]> => {
			try {
				const response = await apiClient.get('/bookings/user/upcoming');
				return (response as any) || [];
			} catch (error) {
				return [];
			}
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
		refetchOnMount: false, // Не перезапрашивать если данные свежие
		refetchOnWindowFocus: false, // Не перезапрашивать при фокусе окна
		enabled,
	});
}

// Hook to get completed bookings (for reviews)
export function useCompletedBookings() {
	return useQuery({
		queryKey: ['completed-bookings'],
		queryFn: async (): Promise<ClientBooking[]> => {
			try {
				const response = await apiClient.get('/bookings/user/completed');
				return (response as any) || [];
			} catch (error) {
				return [];
			}
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
		refetchOnMount: false, // Не перезапрашивать если данные свежие
		refetchOnWindowFocus: false, // Не перезапрашивать при фокусе окна
	});
}

// Hook to cancel a booking
export function useCancelBooking() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (bookingId: string) => {
			const response = await apiClient.put(`/bookings/${bookingId}/cancel`);
			return response;
		},
		onSuccess: () => {
			// Invalidate and refetch bookings
			queryClient.invalidateQueries({ queryKey: ['user-bookings'] });
			queryClient.invalidateQueries({ queryKey: ['upcoming-bookings'] });
			queryClient.invalidateQueries({ queryKey: ['completed-bookings'] });
		},
	});
}

// Hook to create a review
export function useCreateReview() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: {
			salonId: string;
			bookingId?: string;
			rating: number;
			comment?: string;
		}) => {
			const response = await apiClient.post('/reviews', data);
			return response;
		},
		onSuccess: () => {
			// Invalidate and refetch reviews
			queryClient.invalidateQueries({ queryKey: ['user-reviews'] });
			queryClient.invalidateQueries({ queryKey: ['completed-bookings'] });
			toast.success('Review submitted successfully!');
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Failed to submit review');
		},
	});
}
