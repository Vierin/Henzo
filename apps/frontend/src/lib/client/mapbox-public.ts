import { resolvePopularStudiosApiBases } from '@/lib/client/fetch-popular-studios';

export type CitySuggestion = {
  id: string;
  label: string;
  city: string;
  country?: string | null;
  lat: number;
  lng: number;
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

async function fetchJson(path: string): Promise<unknown | null> {
  for (const base of resolvePopularStudiosApiBases()) {
    try {
      const res = await fetch(`${base}${path}`);
      if (res.ok) return await res.json();
    } catch {
      // try next
    }
  }
  return null;
}

function parseSuggestion(raw: unknown): CitySuggestion | null {
  const m = asRecord(raw);
  if (!m) return null;
  const lat = Number(m.lat);
  const lng = Number(m.lon ?? m.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const city =
    String(m.city ?? '').trim() ||
    String(m.address ?? '')
      .split(',')[0]
      ?.trim() ||
    '';
  if (!city) return null;

  const address = String(m.address ?? city).trim();
  const countryRaw = String(m.country ?? '')
    .trim()
    .toUpperCase();
  const country = countryRaw.length >= 2 ? countryRaw.slice(0, 2) : null;

  return {
    id: String(m.id ?? `${city}-${lat}-${lng}`),
    label: address || city,
    city,
    country,
    lat,
    lng,
  };
}

/** City search via backend Mapbox proxy (worldwide places). */
export async function fetchCityAutocomplete(
  query: string,
  limit = 8,
): Promise<CitySuggestion[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const params = new URLSearchParams({
    q,
    country: 'all',
    limit: String(limit),
    types: 'place',
  });
  const raw = await fetchJson(`/mapbox/autocomplete?${params.toString()}`);
  if (!Array.isArray(raw)) return [];

  const seen = new Set<string>();
  const out: CitySuggestion[] = [];
  for (const item of raw) {
    const s = parseSuggestion(item);
    if (!s) continue;
    const key = `${s.city.toLowerCase()}|${(s.country ?? '').toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

export async function reverseGeocodeCity(
  lat: number,
  lng: number,
): Promise<{ city: string; country?: string | null } | null> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
  });
  const raw = await fetchJson(`/mapbox/reverse-geocode?${params.toString()}`);
  const m = asRecord(raw);
  if (!m) return null;

  const address = String(m.address ?? '').trim();
  const cityFromField = String(m.city ?? '').trim();
  const city = cityFromField || address.split(',')[0]?.trim() || '';
  if (!city) return null;

  const countryRaw = String(m.country ?? '')
    .trim()
    .toUpperCase();
  return {
    city,
    country: countryRaw.length >= 2 ? countryRaw.slice(0, 2) : null,
  };
}
