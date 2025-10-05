import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

interface SalonAvailability {
	salonId: string;
	date: string;
	isOpen: boolean;
	workingHours: any;
	availableSlots: string[];
	message: string;
}

export function useSalonAvailability(
	salonId: string,
	date?: string,
	serviceId?: string
) {
	return useQuery({
		queryKey: ['salons', 'availability', salonId, date, serviceId],
		queryFn: async (): Promise<SalonAvailability> => {
			const searchParams = new URLSearchParams();

			if (date) searchParams.append('date', date);
			if (serviceId) searchParams.append('serviceId', serviceId);

			const response = await apiClient.get<SalonAvailability>(
				`/salons/${salonId}/availability?${searchParams.toString()}`
			);
			return response;
		},
		enabled: !!salonId,
		staleTime: 2 * 60 * 1000, // 2 minutes - availability changes frequently
		cacheTime: 5 * 60 * 1000, // 5 minutes
	});
}
