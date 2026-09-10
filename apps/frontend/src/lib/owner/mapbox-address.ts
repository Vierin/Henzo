import { apiClient } from '@/lib/api-client';

export type OwnerAddressSuggestion = {
  id: string;
  address: string;
  lat: number;
  lon: number;
};

export async function fetchOwnerAddressSuggestions(
  query: string,
): Promise<OwnerAddressSuggestion[]> {
  const q = new URLSearchParams({
    q: query,
    country: 'VN',
    limit: '5',
    types: 'address,poi',
  });
  return apiClient.get<OwnerAddressSuggestion[]>(`/mapbox/autocomplete?${q}`);
}

export async function reverseGeocodeOwnerAddress(
  lat: number,
  lon: number,
): Promise<{ address: string; lat: number; lon: number } | null> {
  const q = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
  });
  return apiClient.get<{ address: string; lat: number; lon: number } | null>(
    `/mapbox/reverse-geocode?${q}`,
  );
}

export const DEFAULT_MAP_CENTER = {
  lat: 21.0285,
  lon: 105.8542,
} as const;
