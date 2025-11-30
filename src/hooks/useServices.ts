import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import {
	ServiceResponseDto,
	CreateServiceDto,
	UpdateServiceDto,
} from '@/types/dto/service.dto';
import { toast } from 'react-hot-toast';

// Query keys
export const serviceKeys = {
	all: ['services'] as const,
	lists: () => [...serviceKeys.all, 'list'] as const,
	list: (filters: Record<string, unknown>) =>
		[...serviceKeys.lists(), filters] as const,
	details: () => [...serviceKeys.all, 'detail'] as const,
	detail: (id: string) => [...serviceKeys.details(), id] as const,
	public: () => [...serviceKeys.all, 'public'] as const,
	bySalon: (salonId: string) => [...serviceKeys.all, 'salon', salonId] as const,
};

// Get all services for current user's salon
export const useServices = (
	salonId: string,
	filters?: { search?: string; sortBy?: string }
) => {
	return useQuery({
		queryKey: serviceKeys.list({ salonId, ...filters }),
		queryFn: async (): Promise<ServiceResponseDto[]> => {
			const params = new URLSearchParams();
			params.append('salonId', salonId);
			if (filters?.search) params.append('search', filters.search);
			if (filters?.sortBy) params.append('sortBy', filters.sortBy);

			const queryString = params.toString();
			const endpoint = `/services?${queryString}`;

			const response = await apiClient.get<ServiceResponseDto[]>(endpoint);
			return response || [];
		},
		enabled: !!salonId,
		staleTime: 5 * 60 * 1000, // 5 minutes
		refetchOnMount: 'always', // Перезапрашивать при монтировании если данные устарели
		refetchOnWindowFocus: false, // Не перезапрашивать при фокусе окна
	});
};

// Get public services (all services from all salons)
export const usePublicServices = () => {
	return useQuery({
		queryKey: serviceKeys.public(),
		queryFn: async (): Promise<ServiceResponseDto[]> => {
			const response =
				await apiClient.get<ServiceResponseDto[]>('/services/public');
			return response || [];
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
	});
};

// Get single service
export const useService = (id: string) => {
	return useQuery({
		queryKey: serviceKeys.detail(id),
		queryFn: async (): Promise<ServiceResponseDto> => {
			return apiClient.get<ServiceResponseDto>(`/services/${id}`);
		},
		enabled: !!id,
		staleTime: 5 * 60 * 1000, // 5 minutes
	});
};

// Create service mutation
export const useCreateService = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: CreateServiceDto): Promise<ServiceResponseDto> => {
			return apiClient.post<ServiceResponseDto>('/services', data);
		},
		onSuccess: (data) => {
			// Optimistically update the cache
			if (data.salonId) {
				const bySalonKey = serviceKeys.bySalon(data.salonId);
				const existingServices = queryClient.getQueryData<ServiceResponseDto[]>(bySalonKey) || [];
				queryClient.setQueryData<ServiceResponseDto[]>(bySalonKey, [...existingServices, data]);
				
				// Also update list queries
				const listKey = serviceKeys.list({ salonId: data.salonId });
				const existingListServices = queryClient.getQueryData<ServiceResponseDto[]>(listKey) || [];
				queryClient.setQueryData<ServiceResponseDto[]>(listKey, [...existingListServices, data]);
			}
			
			// Invalidate and refetch to ensure we have the latest data
			if (data.salonId) {
				queryClient.invalidateQueries({
					queryKey: serviceKeys.bySalon(data.salonId),
				});
				queryClient.refetchQueries({
					queryKey: serviceKeys.bySalon(data.salonId),
				});
			}
			// Also invalidate all service lists to be safe
			queryClient.invalidateQueries({
				queryKey: serviceKeys.lists(),
			});
			toast.success('Service created successfully!');
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Failed to create service');
		},
	});
};

// Update service mutation
export const useUpdateService = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			id,
			data,
		}: {
			id: string;
			data: UpdateServiceDto;
		}): Promise<ServiceResponseDto> => {
			const response = await apiClient.put<ServiceResponseDto>(
				`/services/${id}`,
				data
			);
			return response;
		},
		onSuccess: (data, variables) => {
			// Update the specific service in cache
			queryClient.setQueryData(serviceKeys.detail(variables.id), data);
			// Invalidate lists
			queryClient.invalidateQueries({ queryKey: serviceKeys.lists() });
			toast.success('Service updated successfully!');
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Failed to update service');
		},
	});
};

// Delete service mutation
export const useDeleteService = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string): Promise<void> => {
			await apiClient.delete(`/services/${id}`);
		},
		onSuccess: (_, id) => {
			// Remove from cache
			queryClient.removeQueries({ queryKey: serviceKeys.detail(id) });
			// Invalidate lists
			queryClient.invalidateQueries({ queryKey: serviceKeys.lists() });
			toast.success('Service deleted successfully!');
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Failed to delete service');
		},
	});
};
