import {
  extractStudiosListFromNearby,
  parsePublicStudioPreview,
  type PublicStudioPreview,
} from '@/lib/client/studio-preview';
import {
  fetchPublicApiJson,
  resolvePopularStudiosApiBases,
} from '@/lib/client/fetch-popular-studios';

export type StudioSearchResult = {
  items: PublicStudioPreview[];
  total: number;
  page: number;
  limit: number;
};

function buildSearchPath(params: {
  search?: string;
  category?: string;
  location?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
}): string {
  const q = new URLSearchParams();
  q.set('page', String(params.page ?? 1));
  q.set('limit', String(params.limit ?? 24));
  if (params.search?.trim()) q.set('search', params.search.trim());
  if (params.category?.trim() && params.category !== 'all') {
    q.set('category', params.category.trim());
  }
  if (params.location?.trim()) q.set('location', params.location.trim());
  if (params.sortBy?.trim()) q.set('sortBy', params.sortBy.trim());
  return `/studios/search?${q.toString()}`;
}

function parseSearchPayload(raw: unknown): StudioSearchResult {
  const items = extractStudiosListFromNearby(raw)
    .map((item) => parsePublicStudioPreview(item))
    .filter((s): s is PublicStudioPreview => s != null);

  const map =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const data =
    map.data && typeof map.data === 'object'
      ? (map.data as Record<string, unknown>)
      : map;

  return {
    items,
    total: Number(data.total ?? map.total ?? items.length) || items.length,
    page: Number(data.page ?? map.page ?? 1) || 1,
    limit: Number(data.limit ?? map.limit ?? items.length) || items.length,
  };
}

export async function fetchStudiosSearch(
  params: {
    search?: string;
    category?: string;
    location?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
  } = {},
): Promise<StudioSearchResult> {
  const raw = await fetchPublicApiJson(buildSearchPath(params), 60);
  if (!raw) return { items: [], total: 0, page: 1, limit: params.limit ?? 24 };
  return parseSearchPayload(raw);
}

export async function fetchStudiosSearchClient(
  params: {
    search?: string;
    category?: string;
    location?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
  } = {},
): Promise<StudioSearchResult> {
  const path = buildSearchPath(params);
  for (const base of resolvePopularStudiosApiBases()) {
    try {
      const res = await fetch(`${base}${path}`);
      if (!res.ok) continue;
      return parseSearchPayload(await res.json());
    } catch {
      // try next
    }
  }
  return { items: [], total: 0, page: 1, limit: params.limit ?? 24 };
}
