import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Salon } from '@/types';

export const useSalon = () => {
	return useQuery<Salon | null>({
		queryKey: ['salon', 'current'],
		queryFn: async () => {
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
		staleTime: 0, // Всегда считать данные устаревшими
		gcTime: 10 * 60 * 1000, // 10 минут (gcTime вместо cacheTime)
		retry: 1, // Одна попытка вместо двух
		retryDelay: 500,
		refetchOnMount: true, // Всегда перезагружать при монтировании
	});
};

export const useSalonId = () => {
	const { data: salon, isLoading, error } = useSalon();

	return {
		salonId: salon?.id || null,
		salon: salon || null,
		isLoading,
		error,
		hasSalon: !!salon?.id,
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
