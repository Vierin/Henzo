import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

interface SalonStats {
	salonId: string;
	salonName: string;
	rating: number;
	reviewCount: number;
	serviceCount: number;
}

export function useSalonStats(salonId: string) {
	return useQuery({
		queryKey: ['salons', 'stats', salonId],
		queryFn: async (): Promise<SalonStats> => {
			const response = await apiClient.get<SalonStats>(
				`/salons/${salonId}/stats`
			);
			return response;
		},
		enabled: !!salonId,
		staleTime: 10 * 60 * 1000, // Важно: 10 minutes - статистика меняется редко
		gcTime: 30 * 60 * 1000, // 30 минут в кэше
	});
}
