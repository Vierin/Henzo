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
		staleTime: 5 * 60 * 1000, // 5 minutes - stats change moderately
		gcTime: 15 * 60 * 1000, // 15 minutes
	});
}
