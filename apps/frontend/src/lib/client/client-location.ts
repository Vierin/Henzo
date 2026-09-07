export const CLIENT_LOCATION_STORAGE_KEY = 'henzo-client-location-v1';

export type ClientLocation = {
  city: string;
  country?: string | null;
  lat: number;
  lng: number;
};

/** Default until user picks / GPS — Da Nang (same as prior static home). */
export const DEFAULT_CLIENT_LOCATION: ClientLocation = {
  city: 'Da Nang',
  country: 'VN',
  lat: 16.0544,
  lng: 108.2022,
};

export const QUICK_CITIES: ClientLocation[] = [
  DEFAULT_CLIENT_LOCATION,
  { city: 'Ho Chi Minh City', country: 'VN', lat: 10.8231, lng: 106.6297 },
  { city: 'Hanoi', country: 'VN', lat: 21.0285, lng: 105.8542 },
  { city: 'Prague', country: 'CZ', lat: 50.0755, lng: 14.4378 },
  { city: 'Warsaw', country: 'PL', lat: 52.2297, lng: 21.0122 },
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
