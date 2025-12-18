import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

interface ServiceCategory {
	id: number;
	nameEn: string;
	nameVn: string;
}

export function useServiceCategories() {
	return useQuery<ServiceCategory[]>({
		queryKey: ['service-categories'],
		queryFn: async (): Promise<ServiceCategory[]> => {
			const response = await apiClient.get('/search/categories?lang=en');

			// Проверяем, что response - это массив или объект с data
			let categoriesData: ServiceCategory[] = [];
			if (Array.isArray(response)) {
				categoriesData = response;
			} else if (
				response &&
				typeof response === 'object' &&
				(response as any).data
			) {
				categoriesData = (response as any).data;
			} else if (response && typeof response === 'object') {
				categoriesData = response as ServiceCategory[];
			}

			return categoriesData;
		},
		staleTime: 15 * 60 * 1000, // Важно: 15 minutes - категории статические данные
		gcTime: 60 * 60 * 1000, // 1 час в кэше
		retry: 2,
	});
}

// Хук для получения категорий конкретного салона (теперь использует ServiceCategory)
export function useCategoriesBySalon(salonId: string) {
	return useQuery<{ id: number; name: string }[]>({
		queryKey: ['service-categories', salonId],
		queryFn: async (): Promise<{ id: number; name: string }[]> => {
			if (!salonId) {
				return [];
			}

			try {
				// Получаем эталонные категории услуг из нашей новой системы
				const response = await apiClient.get('/search/categories?q=&lang=en');

				// Преобразуем в формат, ожидаемый компонентом
				if (response && Array.isArray(response)) {
					return response.map((cat: any) => ({
						id: cat.id,
						name: cat.nameEn,
					}));
				}

				return [];
			} catch (error) {
				console.error('Error fetching service categories:', error);
				return [];
			}
		},
		enabled: !!salonId,
		staleTime: 15 * 60 * 1000, // Важно: 15 minutes - категории статические данные
		gcTime: 60 * 60 * 1000, // 1 час в кэше
		retry: 2,
	});
}
