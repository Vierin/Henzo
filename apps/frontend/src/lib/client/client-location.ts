export const CLIENT_LOCATION_STORAGE_KEY = 'henzo-client-location-v1';

export type ClientLocation = {
  city: string;
  country?: string | null;
  lat: number;
  lng: number;
};

/** Default until user picks / GPS. */
export const DEFAULT_CLIENT_LOCATION: ClientLocation = {
  city: 'Madrid',
  country: 'ES',
  lat: 40.4168,
  lng: -3.7038,
};

export const QUICK_CITIES: ClientLocation[] = [
  DEFAULT_CLIENT_LOCATION,
  { city: 'Barcelona', country: 'ES', lat: 41.3874, lng: 2.1686 },
  { city: 'Valencia', country: 'ES', lat: 39.4699, lng: -0.3763 },
];

export function readStoredClientLocation(): ClientLocation | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CLIENT_LOCATION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ClientLocation>;
    const city = String(parsed.city ?? '').trim();
    const lat = Number(parsed.lat);
    const lng = Number(parsed.lng);
    if (!city || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return {
      city,
      country: parsed.country ? String(parsed.country).trim() || null : null,
      lat,
      lng,
    };
  } catch {
    return null;
  }
}

export function writeStoredClientLocation(loc: ClientLocation) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(
    CLIENT_LOCATION_STORAGE_KEY,
    JSON.stringify({
      city: loc.city.trim(),
      country: loc.country ?? null,
      lat: loc.lat,
      lng: loc.lng,
    }),
  );
}

export function displayLocationLabel(
  loc: ClientLocation | null,
  fallback: string,
): string {
  if (!loc?.city?.trim()) return fallback;
  return loc.city.trim();
}
