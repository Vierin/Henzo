import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Salon } from '@/types';
import { useAuth } from '@/lib/auth-unified';
import { salonKeys } from './useSalons';

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
