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
	list: (filters: Record<string, any>) =>
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
				salon: SalonWithDetailsResponseDto | null;
			}>('/salons/current');
			return response.salon;
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
	});
};

// Create salon mutation
export const useCreateSalon = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: CreateSalonDto): Promise<SalonResponseDto> => {
			const response = await apiClient.post<{ salon: SalonResponseDto }>(
				'/salons',
				data
			);
			return response.salon;
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
		mutationFn: async ({
			id,
			data,
		}: {
			id: string;
			data: UpdateSalonDto;
		}): Promise<SalonResponseDto> => {
			const response = await apiClient.put<{ salon: SalonResponseDto }>(
				`/salons/${id}`,
				data
			);
			return response.salon;
		},
		onSuccess: (data, variables) => {
			// Update the specific salon in cache
			queryClient.setQueryData(salonKeys.detail(variables.id), data);
			// Invalidate lists
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
