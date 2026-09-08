/**
 * Shorten a full address to district + city for browse cards.
 * Works on comma-separated VN/intl addresses from Mapbox / studio profiles.
 */
export function formatBrowseDistrictCity(
  address: string | null | undefined,
): string | null {
  const raw = String(address ?? '').trim();
  if (!raw || raw === '—') return null;

  const countryRe =
    /^(vietnam|viet nam|việt nam|vn|czechia|czech republic|poland|russia|russian federation)$/i;
  const postalRe = /^\d{4,6}(-\d+)?$/;

  const parts = raw
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((p) => !countryRe.test(p))
    .filter((p) => !postalRe.test(p));

  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0]!;
  if (parts.length === 2) return `${parts[0]}, ${parts[1]}`;

  // Prefer last two meaningful segments (district/area, city).
  const city = parts[parts.length - 1]!;
  const district = parts[parts.length - 2]!;
  if (district.toLowerCase() === city.toLowerCase()) return city;
  return `${district}, ${city}`;
}
