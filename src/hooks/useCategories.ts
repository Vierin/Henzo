import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

interface SalonCategory {
	id: number;
	name: string;
}

export function useCategories() {
	return useQuery<SalonCategory[]>({
		queryKey: ['salon-categories'],
		queryFn: async (): Promise<SalonCategory[]> => {
			const response = await apiClient.get('/salons/categories');

			// Проверяем, что response - это массив или объект с data
			let categoriesData: SalonCategory[] = [];
			if (Array.isArray(response)) {
				categoriesData = response;
			} else if (
				response &&
				typeof response === 'object' &&
				(response as any).data
			) {
				categoriesData = (response as any).data;
			} else if (response && typeof response === 'object') {
				categoriesData = response as SalonCategory[];
			}

			return categoriesData;
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
		cacheTime: 10 * 60 * 1000, // 10 minutes
		retry: 2,
		fallbackData: [
			{ id: 1, name: 'Hair and Barber' },
			{ id: 2, name: 'Tattoo and Piercing' },
			{ id: 3, name: 'Massage and Spa' },
			{ id: 4, name: 'Manicure and Pedicure' },
			{ id: 5, name: 'Cosmetic Medicine' },
			{ id: 6, name: 'Other Services' },
		],
	});
}
