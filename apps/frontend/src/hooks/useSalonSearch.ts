import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Salon } from '@/types';

export interface SearchParams {
	page?: number;
	limit?: number;
	search?: string;
	location?: string;
	category?: string;
	/** Comma-separated main category slugs (map / multi-filter) */
	categories?: string;
	sortBy?: string;
	minRating?: number;
	isOpenNow?: boolean;
	date?: string; // YYYY-MM-DD
	time?: string; // e.g., 'morning' | 'afternoon' | 'evening' | 'any'
	accumulate?: boolean; // New parameter to control accumulation
	north?: number;
	south?: number;
	east?: number;
	west?: number;
}

export interface SearchResponse {
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
			categories: params.categories,
			sortBy: params.sortBy,
			minRating: params.minRating,
			isOpenNow: params.isOpenNow,
			date: params.date,
			time: params.time,
			north: params.north,
			south: params.south,
			east: params.east,
			west: params.west,
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
			if (params.categories)
				searchParams.append('categories', params.categories);
			if (params.sortBy) searchParams.append('sortBy', params.sortBy);
			if (params.minRating)
				searchParams.append('minRating', params.minRating.toString());
			if (params.isOpenNow) searchParams.append('isOpenNow', 'true');
			if (params.date) searchParams.append('date', params.date);
			if (params.time) searchParams.append('time', params.time);
			if (params.north !== undefined)
				searchParams.append('north', String(params.north));
			if (params.south !== undefined)
				searchParams.append('south', String(params.south));
			if (params.east !== undefined)
				searchParams.append('east', String(params.east));
			if (params.west !== undefined)
				searchParams.append('west', String(params.west));

			const response = await apiClient.get<SearchResponse>(
				`/salons/search?${searchParams.toString()}`
			);
			return response;
		},
		staleTime: 10 * 60 * 1000, // 10 minutes
		gcTime: 30 * 60 * 1000, // 30 minutes
		refetchOnWindowFocus: false, // Prevent unnecessary refetches
	});
}
