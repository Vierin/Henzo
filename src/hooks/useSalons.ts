import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import {
	SalonResponseDto,
	SalonWithDetailsResponseDto,
	CreateSalonDto,
	UpdateSalonDto,
} from '@/types/dto/salon.dto';
import { toast } from 'react-hot-toast';

// Query keys
export const salonKeys = {
	all: ['salons'] as const,
	lists: () => [...salonKeys.all, 'list'] as const,
	list: (filters: Record<string, unknown>) =>
		[...salonKeys.lists(), filters] as const,
	details: () => [...salonKeys.all, 'detail'] as const,
	detail: (id: string) => [...salonKeys.details(), id] as const,
	withServices: () => [...salonKeys.all, 'with-services'] as const,
};

// Get all salons
export const useSalons = (filters?: { search?: string; category?: string }) => {
	return useQuery({
		queryKey: salonKeys.list(filters || {}),
		queryFn: async (): Promise<SalonResponseDto[]> => {
			const params = new URLSearchParams();
			if (filters?.search) params.append('search', filters.search);
			if (filters?.category) params.append('category', filters.category);

			const queryString = params.toString();
			const endpoint = queryString ? `/salons?${queryString}` : '/salons';

			const response = await apiClient.get<SalonResponseDto[]>(endpoint);
			return response || [];
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
	});
};

// Get salons with services
export const useSalonsWithServices = () => {
	return useQuery({
		queryKey: salonKeys.withServices(),
		queryFn: async (): Promise<SalonWithDetailsResponseDto[]> => {
			const response = await apiClient.get<SalonWithDetailsResponseDto[]>(
				'/salons/with-services'
			);
			return response || [];
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
	});
};

// Get single salon
export const useSalon = (id: string) => {
	return useQuery({
		queryKey: salonKeys.detail(id),
		queryFn: async (): Promise<SalonWithDetailsResponseDto> => {
			return apiClient.get<SalonWithDetailsResponseDto>(`/salons/${id}`);
		},
		enabled: !!id,
		staleTime: 5 * 60 * 1000, // 5 minutes
	});
};

// Get current user's salon
export const useCurrentUserSalon = () => {
	return useQuery({
		queryKey: [...salonKeys.all, 'current'],
		queryFn: async (): Promise<SalonWithDetailsResponseDto | null> => {
			const response = await apiClient.get<{
				success: boolean;
				data?: SalonWithDetailsResponseDto;
				message?: string;
			}>('/salons/current');
			if (response.success && response.data) {
				return response.data;
			}
			return null;
		},
		staleTime: 0, // Всегда считать данные устаревшими
		refetchOnMount: true, // Всегда перезагружать при монтировании
	});
};

// Create salon mutation
export const useCreateSalon = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: CreateSalonDto): Promise<SalonResponseDto> => {
			return apiClient.post<SalonResponseDto>('/salons/current', data);
		},
		onSuccess: () => {
			// Invalidate and refetch salons
			queryClient.invalidateQueries({ queryKey: salonKeys.all });
			toast.success('Salon created successfully!');
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Failed to create salon');
		},
	});
};

// Update salon mutation
export const useUpdateSalon = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: UpdateSalonDto): Promise<SalonResponseDto> => {
			return apiClient.put<SalonResponseDto>('/salons/current', data);
		},
		onSuccess: () => {
			// Invalidate current user salon and lists
			queryClient.invalidateQueries({
				queryKey: [...salonKeys.all, 'current'],
			});
			queryClient.invalidateQueries({ queryKey: salonKeys.lists() });
			toast.success('Salon updated successfully!');
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Failed to update salon');
		},
	});
};

// Delete salon mutation
export const useDeleteSalon = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string): Promise<void> => {
			await apiClient.delete(`/salons/${id}`);
		},
		onSuccess: (_, id) => {
			// Remove from cache
			queryClient.removeQueries({ queryKey: salonKeys.detail(id) });
			// Invalidate lists
			queryClient.invalidateQueries({ queryKey: salonKeys.lists() });
			toast.success('Salon deleted successfully!');
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Failed to delete salon');
		},
	});
};
