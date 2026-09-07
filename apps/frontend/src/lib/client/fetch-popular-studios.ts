import {
  DEFAULT_CLIENT_LOCATION,
  type ClientLocation,
} from '@/lib/client/client-location';
import {
  extractStudiosListFromNearby,
  parsePublicStudioPreview,
  type PublicStudioPreview,
} from '@/lib/client/studio-preview';

/** @deprecated use DEFAULT_CLIENT_LOCATION — kept for callers */
export const DEFAULT_LAT = DEFAULT_CLIENT_LOCATION.lat;
export const DEFAULT_LNG = DEFAULT_CLIENT_LOCATION.lng;

function normalizeApiBase(url: string): string {
  return url.replace(/\/$/, '');
}

/** Single API base from env — do not mix local + prod (causes slug 404s). */
export function resolvePopularStudiosApiBases(): string[] {
  return [
    normalizeApiBase(
      process.env.NEXT_PUBLIC_API_URL || 'https://api.henzo.app',
    ),
  ];
}

function parseStudiosList(raw: unknown): PublicStudioPreview[] {
  return extractStudiosListFromNearby(raw)
    .map((item) => parsePublicStudioPreview(item))
    .filter((s): s is PublicStudioPreview => s != null);
}

async function fetchPublicApiJson(
  path: string,
  revalidate = 120,
): Promise<unknown | null> {
  for (const base of resolvePopularStudiosApiBases()) {
    try {
      const res = await fetch(`${base}${path}`, {
        next: { revalidate },
      });
      if (res.ok) return await res.json();
    } catch {
      // try next base
    }
  }
  return null;
}

function nearbyPath(lat: number, lng: number, limit: number, radius = 50) {
  return `/studios/nearby?lat=${lat}&lng=${lng}&limit=${limit}&radius=${radius}`;
}

async function loadPopularStudios(
  limit: number,
  coords: Pick<ClientLocation, 'lat' | 'lng'> = DEFAULT_CLIENT_LOCATION,
): Promise<PublicStudioPreview[]> {
  const nearbyRaw = await fetchPublicApiJson(
    nearbyPath(coords.lat, coords.lng, limit),
  );
  const nearby = parseStudiosList(nearbyRaw);
  if (nearby.length > 0) return nearby;

  const featuredRaw = await fetchPublicApiJson(
    `/studios/featured?limit=${limit}`,
  );
  return parseStudiosList(featuredRaw);
}

/** Server-side fetch (RSC) — default Da Nang until client hydrates stored location. */
export async function fetchPopularStudios(
  limit = 8,
  coords?: Pick<ClientLocation, 'lat' | 'lng'>,
): Promise<PublicStudioPreview[]> {
  return loadPopularStudios(limit, coords ?? DEFAULT_CLIENT_LOCATION);
}

/** Client-side fetch with explicit coordinates. */
export async function fetchPopularStudiosClient(
  limit = 8,
  coords: Pick<ClientLocation, 'lat' | 'lng'> = DEFAULT_CLIENT_LOCATION,
): Promise<PublicStudioPreview[]> {
  const path = nearbyPath(coords.lat, coords.lng, limit);

  for (const base of resolvePopularStudiosApiBases()) {
    try {
      const nearbyRes = await fetch(`${base}${path}`);
      if (nearbyRes.ok) {
        const nearby = parseStudiosList(await nearbyRes.json());
        if (nearby.length > 0) return nearby;
      }

      const featuredRes = await fetch(
        `${base}/studios/featured?limit=${limit}`,
      );
      if (featuredRes.ok) {
        const featured = parseStudiosList(await featuredRes.json());
        if (featured.length > 0) return featured;
      }
    } catch {
      // try next base
    }
  }

  return [];
}

export { fetchPublicApiJson };
