import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Salon } from '@/types';

interface SearchParams {
	page?: number;
	limit?: number;
	search?: string;
	location?: string;
	category?: string;
	sortBy?: string;
	minRating?: number;
	isOpenNow?: boolean;
	date?: string; // YYYY-MM-DD
	time?: string; // e.g., 'morning' | 'afternoon' | 'evening' | 'any'
	accumulate?: boolean; // New parameter to control accumulation
}

interface SearchResponse {
	data: Salon[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
		hasNextPage: boolean;
		hasPreviousPage: boolean;
	};
}

export function useSalonSearch(params: SearchParams) {
	// Create a stable query key that doesn't include function references
	const queryKey = [
		'salons',
		'search',
		{
			page: params.page,
			limit: params.limit,
			search: params.search,
			location: params.location,
			category: params.category,
			sortBy: params.sortBy,
			minRating: params.minRating,
			isOpenNow: params.isOpenNow,
			date: params.date,
			time: params.time,
		},
	];

	return useQuery({
		queryKey,
		queryFn: async (): Promise<SearchResponse> => {
			const searchParams = new URLSearchParams();

			if (params.page) searchParams.append('page', params.page.toString());
			if (params.limit) searchParams.append('limit', params.limit.toString());
			if (params.search) searchParams.append('search', params.search);
			if (params.location) searchParams.append('location', params.location);
			if (params.category) searchParams.append('category', params.category);
			if (params.sortBy) searchParams.append('sortBy', params.sortBy);
			if (params.minRating)
				searchParams.append('minRating', params.minRating.toString());
			if (params.isOpenNow) searchParams.append('isOpenNow', 'true');
			if (params.date) searchParams.append('date', params.date);
			if (params.time) searchParams.append('time', params.time);

			const response = await apiClient.get<SearchResponse>(
				`/salons/search?${searchParams.toString()}`
			);
			return response;
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
		refetchOnWindowFocus: false, // Prevent unnecessary refetches
	});
}
