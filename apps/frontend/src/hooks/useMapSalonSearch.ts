import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { SearchResponse } from '@/hooks/useSalonSearch';
import type { MapBounds } from '@/utils/mapUtils';

export interface UseMapSalonSearchParams {
	mapBounds: MapBounds | null;
	/** Comma-separated main category slugs (backend `categories` query) */
	categories?: string;
	enabled?: boolean;
}

function boundsReady(b: MapBounds | null): b is MapBounds {
	if (!b) return false;
	return [b.north, b.south, b.east, b.west].every((n) => Number.isFinite(n));
}

/**
 * Map viewport search: bbox + optional category slugs, fixed page/limit/sort for listing UX.
 */
export function useMapSalonSearch(params: UseMapSalonSearchParams) {
	const { mapBounds, categories, enabled = true } = params;
	const ready = boundsReady(mapBounds);

	return useQuery({
		queryKey: [
			'salons',
			'search',
			'map',
			{
				north: mapBounds?.north,
				south: mapBounds?.south,
				east: mapBounds?.east,
				west: mapBounds?.west,
				categories: categories || '',
			},
		],
		queryFn: async (): Promise<SearchResponse & { success?: boolean }> => {
			if (!mapBounds || !ready) {
				throw new Error('Map bounds required');
			}
			const searchParams = new URLSearchParams();
			searchParams.set('page', '1');
			searchParams.set('limit', '50');
			searchParams.set('sortBy', 'rating');
			searchParams.set('north', String(mapBounds.north));
			searchParams.set('south', String(mapBounds.south));
			searchParams.set('east', String(mapBounds.east));
			searchParams.set('west', String(mapBounds.west));
			if (categories?.trim()) {
				searchParams.set('categories', categories.trim());
			}
			return apiClient.get(
				`/salons/search?${searchParams.toString()}`
			);
		},
		enabled: enabled && ready,
		staleTime: 10 * 60 * 1000,
		gcTime: 30 * 60 * 1000,
		refetchOnWindowFocus: false,
	});
}
