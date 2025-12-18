import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import {
	SalonResponseDto,
	SalonWithDetailsResponseDto,
	CreateSalonDto,
	UpdateSalonDto,
} from '@/types/dto/salon.dto';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/lib/auth-unified';
import { Salon } from '@/types';
import { logger } from '@/lib/logger';

// Query keys
export const salonKeys = {
	all: ['salons'] as const,
	lists: () => [...salonKeys.all, 'list'] as const,
	list: (filters: Record<string, unknown>) =>
		[...salonKeys.lists(), filters] as const,
	details: () => [...salonKeys.all, 'detail'] as const,
	detail: (id: string) => [...salonKeys.details(), id] as const,
	withServices: () => [...salonKeys.all, 'with-services'] as const,
	current: () => [...salonKeys.all, 'current'] as const, // Единый ключ для текущего салона
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
		staleTime: 10 * 60 * 1000, // 10 minutes
		gcTime: 30 * 60 * 1000, // 30 minutes
	});
};

// Get salons with services
export const useSalonsWithServices = () => {
	return useQuery({
		queryKey: salonKeys.withServices(),
		queryFn: async (): Promise<SalonWithDetailsResponseDto[]> => {
			try {
				const response = await apiClient.get<SalonWithDetailsResponseDto[]>(
					'/salons/with-services'
				);
				return response || [];
			} catch (error) {
				logger.error('Error fetching salons with services:', error);
				// Return empty array on error to prevent UI crash
				return [];
			}
		},
		staleTime: 10 * 60 * 1000, // 10 minutes
		gcTime: 30 * 60 * 1000, // 30 minutes
		retry: 2, // Retry 2 times on failure
	});
};

// Get single salon by ID (renamed to avoid conflict with useSalon() for current user)
export const useSalonById = (id: string) => {
	return useQuery({
		queryKey: salonKeys.detail(id),
		queryFn: async (): Promise<SalonWithDetailsResponseDto> => {
			return apiClient.get<SalonWithDetailsResponseDto>(`/salons/${id}`);
		},
		enabled: !!id,
		staleTime: 10 * 60 * 1000, // 10 minutes
		gcTime: 30 * 60 * 1000, // 30 minutes
	});
};

// Get current user's salon with auth check (uses auth-unified)
// This is the main hook for owners to get their current salon
export const useSalon = () => {
	const { user, isLoading: authLoading, isOwner } = useAuth();

	return useQuery<Salon | null>({
		queryKey: salonKeys.current(),
		queryFn: async () => {
			if (!user || !isOwner()) {
				return null;
			}

			try {
				const response = await apiClient.get<{
					success: boolean;
					data?: Salon;
					message?: string;
				}>('/salons/current');
				// API возвращает { success: true, data: {...} }, извлекаем салон
				if (response.success && response.data) {
					return response.data;
				}
				// Если салона нет, возвращаем null вместо ошибки
				return null;
			} catch (error) {
				// Возвращаем null вместо выброса ошибки
				return null;
			}
		},
		enabled: !authLoading && !!user && isOwner(),
		staleTime: 5 * 60 * 1000, // 5 минут - данные салона меняются редко
		gcTime: 30 * 60 * 1000, // 30 минут в кеше
		retry: 1,
		retryDelay: 500,
		refetchOnMount: false, // Не перезагружать если данные свежие
		refetchOnWindowFocus: false, // Не перезагружать при фокусе окна
	});
};

// Get salon ID and additional info for current user's salon
export const useSalonId = () => {
	const { user, isLoading: authLoading, isOwner } = useAuth();
	const { data: salon, isLoading, error } = useSalon();

	// Если пользователь не аутентифицирован или не владелец, не показываем салон
	const isLoadingWithAuth = authLoading || isLoading;
	const hasSalon = !!user && isOwner() && !!salon?.id;

	return {
		salonId: salon?.id || null,
		salon: salon || null,
		isLoading: isLoadingWithAuth,
		error,
		hasSalon,
	};
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
				queryKey: salonKeys.current(),
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
