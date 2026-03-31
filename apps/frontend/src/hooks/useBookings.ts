import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import {
	BookingResponseDto,
	BookingWithDetailsDto,
	CreateBookingDto,
	UpdateBookingDto,
} from '@/types/dto/booking.dto';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/lib/auth-unified';

// Query keys
export const bookingKeys = {
	all: ['bookings'] as const,
	lists: () => [...bookingKeys.all, 'list'] as const,
	list: (filters: Record<string, unknown>) =>
		[...bookingKeys.lists(), filters] as const,
	details: () => [...bookingKeys.all, 'detail'] as const,
	detail: (id: string) => [...bookingKeys.details(), id] as const,
	user: () => [...bookingKeys.all, 'user'] as const,
	userList: (filters: Record<string, unknown>) =>
		[...bookingKeys.user(), 'list', filters] as const,
};

// Get all bookings for current user (owner/admin)
export const useBookings = (filters?: { status?: string; date?: string; page?: number; limit?: number }) => {
	const { user, isLoading: authLoading, isOwner } = useAuth();

	return useQuery({
		queryKey: bookingKeys.list(filters || {}),
		queryFn: async (): Promise<BookingWithDetailsDto[]> => {
			if (!user || !isOwner()) {
				throw new Error(
					'Unauthorized: Only salon owners can access this endpoint'
				);
			}

			const params = new URLSearchParams();
			if (filters?.status) params.append('status', filters.status);
			if (filters?.date) params.append('date', filters.date);
			// P1: Добавляем пагинацию
			if (filters?.page) params.append('page', filters.page.toString());
			if (filters?.limit) params.append('limit', filters.limit.toString());

			const queryString = params.toString();
			const endpoint = queryString
				? `/bookings/owner?${queryString}`
				: '/bookings/owner';

			const response = await apiClient.get<BookingWithDetailsDto[]>(endpoint);
			return response || [];
		},
		enabled: !authLoading && !!user && isOwner(),
		staleTime: 10 * 60 * 1000, // P2: 10 minutes - увеличили для редко меняющихся данных
		gcTime: 30 * 60 * 1000, // P2: 30 minutes в кэше
		refetchOnMount: false, // Не перезапрашивать если данные свежие
		refetchOnWindowFocus: false, // Не перезапрашивать при фокусе окна
	});
};

// Get user's own bookings (for clients)
export const useUserBookings = (filters?: {
	status?: string;
	date?: string;
}) => {
	return useQuery({
		queryKey: bookingKeys.userList(filters || {}),
		queryFn: async (): Promise<BookingWithDetailsDto[]> => {
			const params = new URLSearchParams();
			if (filters?.status) params.append('status', filters.status);
			if (filters?.date) params.append('date', filters.date);

			const queryString = params.toString();
			const endpoint = queryString
				? `/bookings/user?${queryString}`
				: '/bookings/user';

			const response = await apiClient.get<BookingWithDetailsDto[]>(endpoint);
			return response || [];
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
		refetchOnMount: false, // Не перезапрашивать если данные свежие
		refetchOnWindowFocus: false, // Не перезапрашивать при фокусе окна
	});
};

// Get single booking
export const useBooking = (id: string) => {
	return useQuery({
		queryKey: bookingKeys.detail(id),
		queryFn: async (): Promise<BookingWithDetailsDto> => {
			const response = await apiClient.get<BookingWithDetailsDto>(
				`/bookings/${id}`
			);
			return response;
		},
		enabled: !!id,
		staleTime: 2 * 60 * 1000, // 2 minutes
	});
};

// Create booking mutation
export const useCreateBooking = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (
			data: CreateBookingDto
		): Promise<BookingWithDetailsDto> => {
			const response = await apiClient.post<{
				appointment: BookingWithDetailsDto;
			}>('/appointments', data);
			return response.appointment;
		},
		retry: false, // Don't retry critical booking operations
		onSuccess: () => {
			// Invalidate and refetch bookings
			queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
			queryClient.invalidateQueries({ queryKey: bookingKeys.user() });
			toast.success('Appointment booked successfully!');
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Failed to book appointment');
		},
	});
};

// Update booking mutation
export const useUpdateBooking = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			id,
			data,
		}: {
			id: string;
			data: UpdateBookingDto;
		}): Promise<BookingResponseDto> => {
			const response = await apiClient.put<{ booking: BookingResponseDto }>(
				`/appointments/${id}`,
				data
			);
			return response.booking;
		},
		retry: false, // Don't retry critical booking operations
		onSuccess: (data, variables) => {
			// Update the specific booking in cache
			queryClient.setQueryData(bookingKeys.detail(variables.id), data);
			// Invalidate lists
			queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
			queryClient.invalidateQueries({ queryKey: bookingKeys.user() });
			toast.success('Booking updated successfully!');
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Failed to update booking');
		},
	});
};

// Cancel booking mutation
export const useCancelBooking = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string): Promise<BookingResponseDto> => {
			const response = await apiClient.put<{ booking: BookingResponseDto }>(
				`/appointments/${id}`,
				{
					status: 'CANCELED',
				}
			);
			return response.booking;
		},
		retry: false, // Don't retry critical booking operations
		onSuccess: (data, id) => {
			// Update the specific booking in cache
			queryClient.setQueryData(bookingKeys.detail(id), data);
			// Invalidate lists
			queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
			queryClient.invalidateQueries({ queryKey: bookingKeys.user() });
			toast.success('Booking canceled successfully!');
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Failed to cancel booking');
		},
	});
};

// Delete booking mutation
export const useDeleteBooking = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string): Promise<void> => {
			await apiClient.delete(`/appointments/${id}`);
		},
		retry: false, // Don't retry critical booking operations
		onSuccess: (_, id) => {
			// Remove from cache
			queryClient.removeQueries({ queryKey: bookingKeys.detail(id) });
			// Invalidate lists
			queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
			queryClient.invalidateQueries({ queryKey: bookingKeys.user() });
			toast.success('Booking deleted successfully!');
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Failed to delete booking');
		},
	});
};
