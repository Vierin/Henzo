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

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Drop studios outside the requested radius, including a featured fallback with no distance. */
function studiosWithinRadius(
  studios: PublicStudioPreview[],
  origin: Pick<ClientLocation, 'lat' | 'lng'>,
  radiusKm: number,
): PublicStudioPreview[] {
  return studios.filter((studio) => {
    let distance = studio.distanceKm;
    if (
      (distance == null || !Number.isFinite(distance)) &&
      studio.lat != null &&
      studio.lng != null
    ) {
      distance = haversineKm(origin.lat, origin.lng, studio.lat, studio.lng);
    }
    return (
      distance != null && Number.isFinite(distance) && distance <= radiusKm
    );
  });
}

function nearbyPath(
  lat: number,
  lng: number,
  limit: number,
  radius = 50,
  strict = false,
) {
  const strictQuery = strict ? '&strict=true' : '';
  return `/studios/nearby?lat=${lat}&lng=${lng}&limit=${limit}&radius=${radius}${strictQuery}`;
}

async function loadPopularStudios(
  limit: number,
  coords: Pick<ClientLocation, 'lat' | 'lng'> = DEFAULT_CLIENT_LOCATION,
  radius = 50,
  strict = false,
): Promise<PublicStudioPreview[]> {
  const nearbyRaw = await fetchPublicApiJson(
    nearbyPath(coords.lat, coords.lng, limit, radius, strict),
  );
  const nearby = strict
    ? studiosWithinRadius(parseStudiosList(nearbyRaw), coords, radius)
    : parseStudiosList(nearbyRaw);
  if (nearby.length > 0) return nearby;
  if (strict) return [];

  const featuredRaw = await fetchPublicApiJson(
    `/studios/featured?limit=${limit}`,
  );
  return parseStudiosList(featuredRaw);
}

/** Server-side fetch (RSC) — default Da Nang until client hydrates stored location. */
export async function fetchPopularStudios(
  limit = 8,
  coords?: Pick<ClientLocation, 'lat' | 'lng'>,
  radius = 50,
  strict = false,
): Promise<PublicStudioPreview[]> {
  return loadPopularStudios(
    limit,
    coords ?? DEFAULT_CLIENT_LOCATION,
    radius,
    strict,
  );
}

/** Client-side fetch with explicit coordinates. */
export async function fetchPopularStudiosClient(
  limit = 8,
  coords: Pick<ClientLocation, 'lat' | 'lng'> = DEFAULT_CLIENT_LOCATION,
  radius = 50,
  strict = false,
): Promise<PublicStudioPreview[]> {
  const path = nearbyPath(coords.lat, coords.lng, limit, radius, strict);

  for (const base of resolvePopularStudiosApiBases()) {
    try {
      const nearbyRes = await fetch(`${base}${path}`);
      if (nearbyRes.ok) {
        const nearby = strict
          ? studiosWithinRadius(
              parseStudiosList(await nearbyRes.json()),
              coords,
              radius,
            )
          : parseStudiosList(await nearbyRes.json());
        if (nearby.length > 0) return nearby;
      }

      if (strict) return [];

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
