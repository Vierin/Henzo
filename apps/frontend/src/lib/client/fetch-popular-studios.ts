import {
  extractStudiosListFromNearby,
  parsePublicStudioPreview,
  type PublicStudioPreview,
} from '@/lib/client/studio-preview';

/** Default map center — Da Nang (matches homepage location selector). */
export const DEFAULT_LAT = 16.0544;
export const DEFAULT_LNG = 108.2022;

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

async function loadPopularStudios(
  limit: number,
): Promise<PublicStudioPreview[]> {
  const nearbyPath = `/studios/nearby?lat=${DEFAULT_LAT}&lng=${DEFAULT_LNG}&limit=${limit}&radius=50`;
  const nearbyRaw = await fetchPublicApiJson(nearbyPath);
  const nearby = parseStudiosList(nearbyRaw);
  if (nearby.length > 0) return nearby;

  const featuredRaw = await fetchPublicApiJson(
    `/studios/featured?limit=${limit}`,
  );
  return parseStudiosList(featuredRaw);
}

/** Server-side fetch (RSC). */
export async function fetchPopularStudios(
  limit = 8,
): Promise<PublicStudioPreview[]> {
  return loadPopularStudios(limit);
}

/** Client-side fetch fallback when SSR returned no studios. */
export async function fetchPopularStudiosClient(
  limit = 8,
): Promise<PublicStudioPreview[]> {
  const nearbyPath = `/studios/nearby?lat=${DEFAULT_LAT}&lng=${DEFAULT_LNG}&limit=${limit}&radius=50`;

  for (const base of resolvePopularStudiosApiBases()) {
    try {
      const nearbyRes = await fetch(`${base}${nearbyPath}`);
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
