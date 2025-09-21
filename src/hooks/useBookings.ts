import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import {
	BookingResponseDto,
	BookingWithDetailsDto,
	CreateBookingDto,
	UpdateBookingDto,
} from '@/types/dto/booking.dto';
import { toast } from 'react-hot-toast';

// Query keys
export const bookingKeys = {
	all: ['bookings'] as const,
	lists: () => [...bookingKeys.all, 'list'] as const,
	list: (filters: Record<string, any>) =>
		[...bookingKeys.lists(), filters] as const,
	details: () => [...bookingKeys.all, 'detail'] as const,
	detail: (id: string) => [...bookingKeys.details(), id] as const,
	user: () => [...bookingKeys.all, 'user'] as const,
	userList: (filters: Record<string, any>) =>
		[...bookingKeys.user(), 'list', filters] as const,
};

// Get all bookings for current user (owner/admin)
export const useBookings = (filters?: { status?: string; date?: string }) => {
	return useQuery({
		queryKey: bookingKeys.list(filters || {}),
		queryFn: async (): Promise<BookingWithDetailsDto[]> => {
			const params = new URLSearchParams();
			if (filters?.status) params.append('status', filters.status);
			if (filters?.date) params.append('date', filters.date);

			const queryString = params.toString();
			const endpoint = queryString
				? `/appointments?${queryString}`
				: '/appointments';

			const response = await apiClient.get<{
				appointments: BookingWithDetailsDto[];
			}>(endpoint);
			return response.appointments || [];
		},
		staleTime: 2 * 60 * 1000, // 2 minutes (bookings change frequently)
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
				? `/user/bookings?${queryString}`
				: '/user/bookings';

			const response = await apiClient.get<{
				bookings: BookingWithDetailsDto[];
			}>(endpoint);
			return response.bookings || [];
		},
		staleTime: 2 * 60 * 1000, // 2 minutes
	});
};

// Get single booking
export const useBooking = (id: string) => {
	return useQuery({
		queryKey: bookingKeys.detail(id),
		queryFn: async (): Promise<BookingWithDetailsDto> => {
			const response = await apiClient.get<{ booking: BookingWithDetailsDto }>(
				`/appointments/${id}`
			);
			return response.booking;
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
