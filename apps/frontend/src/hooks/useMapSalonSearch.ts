import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import type { SearchResponse } from '@/hooks/useSalonSearch';
import {
	type MapBounds,
	boundsReady,
	expandBounds,
	isViewportContainedIn,
} from '@/utils/mapUtils';

export interface UseMapSalonSearchParams {
	mapBounds: MapBounds | null;
	/** Comma-separated main category slugs (backend `categories` query) */
	categories?: string;
	enabled?: boolean;
}

/** Запас вокруг видимой области: пока центр не выходит за него — не дёргаем API. */
const FETCH_BOUNDS_PADDING = 0.1;

/**
 * Map viewport search: bbox + optional category slugs, fixed page/limit/sort for listing UX.
 * Не запрашивает заново, пока видимая область полностью внутри bbox последнего успешного ответа
 * (с запасом FETCH_BOUNDS_PADDING).
 */
export function useMapSalonSearch(params: UseMapSalonSearchParams) {
	const { mapBounds, categories, enabled = true } = params;
	const ready = boundsReady(mapBounds);
	const categoriesKey = categories?.trim() ?? '';

	const lastCoverBoundsRef = useRef<MapBounds | null>(null);
	const [fetchBounds, setFetchBounds] = useState<MapBounds | null>(null);

	useEffect(() => {
		lastCoverBoundsRef.current = null;
	}, [categoriesKey]);

	useEffect(() => {
		if (!ready || !mapBounds) return;
		const cover = lastCoverBoundsRef.current;
		const padded = expandBounds(mapBounds, FETCH_BOUNDS_PADDING);
		if (!cover) {
			setFetchBounds(padded);
			return;
		}
		if (isViewportContainedIn(mapBounds, cover)) {
			return;
		}
		setFetchBounds(padded);
	}, [mapBounds, ready, categoriesKey]);

	const fetchReady = boundsReady(fetchBounds);

	const query = useQuery({
		queryKey: [
			'salons',
			'search',
			'map',
			{
				north: fetchBounds?.north,
				south: fetchBounds?.south,
				east: fetchBounds?.east,
				west: fetchBounds?.west,
				categories: categoriesKey,
			},
		],
		queryFn: async (): Promise<SearchResponse & { success?: boolean }> => {
			if (!fetchBounds || !fetchReady) {
				throw new Error('Map bounds required');
			}
			const searchParams = new URLSearchParams();
			searchParams.set('page', '1');
			searchParams.set('limit', '50');
			searchParams.set('sortBy', 'rating');
			searchParams.set('north', String(fetchBounds.north));
			searchParams.set('south', String(fetchBounds.south));
			searchParams.set('east', String(fetchBounds.east));
			searchParams.set('west', String(fetchBounds.west));
			if (categoriesKey) {
				searchParams.set('categories', categoriesKey);
			}
			return apiClient.get(`/salons/search?${searchParams.toString()}`);
		},
		enabled: enabled && ready && fetchReady,
		staleTime: 10 * 60 * 1000,
		gcTime: 30 * 60 * 1000,
		refetchOnWindowFocus: false,
		placeholderData: (previousData) => previousData,
	});

	useEffect(() => {
		if (query.data && fetchBounds) {
			lastCoverBoundsRef.current = fetchBounds;
		}
	}, [query.data, fetchBounds]);

	return query;
}
