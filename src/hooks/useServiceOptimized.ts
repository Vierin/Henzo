import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { ServiceResponseDto } from '@/types/dto/service.dto';

export function usePopularServices(limit: number = 10) {
	return useQuery({
		queryKey: ['services', 'popular', limit],
		queryFn: async (): Promise<ServiceResponseDto[]> => {
			const response = await apiClient.get<ServiceResponseDto[]>(
				`/services/popular?limit=${limit}`
			);
			return response;
		},
		staleTime: 15 * 60 * 1000, // 15 minutes - popular services change rarely
		cacheTime: 60 * 60 * 1000, // 1 hour
	});
}

export function useTrendingServices(limit: number = 8) {
	return useQuery({
		queryKey: ['services', 'trending', limit],
		queryFn: async (): Promise<ServiceResponseDto[]> => {
			const response = await apiClient.get<ServiceResponseDto[]>(
				`/services/trending?limit=${limit}`
			);
			return response;
		},
		staleTime: 10 * 60 * 1000, // 10 minutes - trending changes more frequently
		cacheTime: 30 * 60 * 1000, // 30 minutes
	});
}

export function useServiceCategories() {
	return useQuery({
		queryKey: ['services', 'categories'],
		queryFn: async () => {
			const response = await apiClient.get('/services/categories');
			return response;
		},
		staleTime: 24 * 60 * 60 * 1000, // 24 hours - categories are static
		cacheTime: 7 * 24 * 60 * 60 * 1000, // 7 days
	});
}
