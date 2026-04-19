import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

interface SalonPreview {
	id: string;
	name: string;
	address: string;
	phone?: string;
	logo: string;
	photos: string[];
	avgRating?: number;
	categoryIds?: number[];
	/** Main salon category ids (1–6), same as /salons/categories */
	mainCategoryIds?: number[];
	/** Leaf service category names from API (often English) */
	categories?: string[];
	_count: {
		reviews: number;
		services: number;
	};
}

interface PreviewParams {
	limit?: number;
	page?: number;
	location?: string;
	featured?: boolean;
}

interface PreviewResponse {
	data: SalonPreview[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
		hasNextPage: boolean;
		hasPreviousPage: boolean;
	};
}

export function useSalonPreview(params: PreviewParams = {}) {
	return useQuery({
		queryKey: ['salons', 'preview', params],
		queryFn: async (): Promise<PreviewResponse> => {
			const searchParams = new URLSearchParams();

			if (params.limit) searchParams.append('limit', params.limit.toString());
			if (params.page) searchParams.append('page', params.page.toString());
			if (params.location) searchParams.append('location', params.location);
			if (params.featured) searchParams.append('featured', 'true');

			const response = await apiClient.get<PreviewResponse>(
				`/salons/preview?${searchParams.toString()}`
			);
			return response;
		},
		staleTime: 3 * 60 * 1000,
		gcTime: 15 * 60 * 1000,
	});
}

export function useFeaturedSalons(limit: number = 6) {
	return useQuery({
		queryKey: ['salons', 'featured', limit],
		queryFn: async (): Promise<SalonPreview[]> => {
			const response = await apiClient.get<SalonPreview[]>(
				`/salons/featured?limit=${limit}`
			);
			return response;
		},
		// Was 24h + no refetch on mount — salon photos/updates never appeared on homepage cards.
		staleTime: 2 * 60 * 1000,
		gcTime: 15 * 60 * 1000,
	});
}

export function useNearbySalons(params: {
	lat?: number;
	lng?: number;
	radius?: number;
	limit?: number;
}) {
	return useQuery({
		queryKey: ['salons', 'nearby', params],
		queryFn: async (): Promise<SalonPreview[]> => {
			const searchParams = new URLSearchParams();

			if (params.lat) searchParams.append('lat', params.lat.toString());
			if (params.lng) searchParams.append('lng', params.lng.toString());
			if (params.radius)
				searchParams.append('radius', params.radius.toString());
			if (params.limit) searchParams.append('limit', params.limit.toString());

			const response = await apiClient.get<SalonPreview[]>(
				`/salons/nearby?${searchParams.toString()}`
			);
			return response;
		},
		staleTime: 5 * 60 * 1000, // 5 minutes - location-based results
		gcTime: 15 * 60 * 1000, // 15 minutes
		enabled: !!(params.lat && params.lng), // Only run when we have coordinates
	});
}
