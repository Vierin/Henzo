import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Salon } from '@/types';

// Query keys
export const salonKeys = {
	all: ['salon'] as const,
	details: () => [...salonKeys.all, 'detail'] as const,
	detail: (id: string) => [...salonKeys.details(), id] as const,
};

// Get single salon by ID
export const useSalon = (id: string) => {
	return useQuery({
		queryKey: salonKeys.detail(id),
		queryFn: async (): Promise<Salon> => {
			return apiClient.get<Salon>(`/salons/${id}`);
		},
		enabled: !!id,
		staleTime: 5 * 60 * 1000, // 5 minutes
	});
};
