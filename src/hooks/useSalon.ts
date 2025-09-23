import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Salon } from '@/types';

export const useSalon = () => {
	return useQuery<Salon>({
		queryKey: ['salon', 'current'],
		queryFn: async () => {
			const response = await apiClient.get<{ salon: Salon }>('/salons/current');
			// API возвращает { salon: {...} }, извлекаем салон
			return response.salon || response;
		},
		staleTime: 5 * 60 * 1000, // 5 минут
		gcTime: 10 * 60 * 1000, // 10 минут (gcTime вместо cacheTime)
		retry: 2,
		retryDelay: 1000,
	});
};

export const useSalonId = () => {
	const { data: salon, isLoading, error } = useSalon();

	return {
		salonId: (salon as Salon)?.id || null,
		salon: salon as Salon,
		isLoading,
		error,
		hasSalon: !!(salon as Salon)?.id,
	};
};

export const useSalonById = (id: string) => {
	return useQuery<Salon>({
		queryKey: ['salon', id],
		queryFn: async () => {
			const response = await apiClient.get<{ salon: Salon }>(`/salons/${id}`);
			return response.salon || response;
		},
		staleTime: 5 * 60 * 1000,
		gcTime: 10 * 60 * 1000,
		retry: 2,
		retryDelay: 1000,
		enabled: !!id,
	});
};
