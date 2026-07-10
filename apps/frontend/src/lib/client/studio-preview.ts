export type StudioPhotoCropRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type PublicStudioPreview = {
  id: string;
  slug?: string;
  studioName: string;
  categories: string[];
  rating: number;
  reviewCount: number;
  address: string;
  distanceKm?: number;
  lat?: number;
  lng?: number;
  photoUrl?: string;
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

export function extractStudiosListFromNearby(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  const map = asRecord(raw);
  if (!map) return [];
  const data = map.data;
  if (Array.isArray(data)) return data;
  const dataMap = asRecord(data);
  if (dataMap && Array.isArray(dataMap.items)) return dataMap.items;
  if (Array.isArray(map.items)) return map.items;
  if (Array.isArray(map.results)) return map.results;
  if (Array.isArray(map.studios)) return map.studios;
  return [];
}

function extractCategoryLabels(data: Record<string, unknown>): string[] {
  const out: string[] = [];
  const add = (label: string) => {
    const t = label.trim();
    if (!t || out.includes(t)) return;
    out.push(t);
  };

  for (const field of ['categories', 'categoryNames']) {
    const raw = data[field];
    if (!Array.isArray(raw)) continue;
    for (const c of raw) {
      if (typeof c === 'string') add(c);
      else if (c && typeof c === 'object') {
        const m = c as Record<string, unknown>;
        const label = String(m.nameEn ?? m.name ?? m.label ?? '').trim();
        if (label) add(label);
      }
    }
  }
  return out;
}

function resolveStudioHomePhotoUrl(
  data: Record<string, unknown>,
): string | undefined {
  const gallery = data.photoGallery;
  if (Array.isArray(gallery) && gallery.length > 0) {
    const first = asRecord(gallery[0]);
    if (first) {
      const hero = String(first.heroUrl ?? first.url ?? '').trim();
      if (hero) return hero;
      const card = String(first.cardUrl ?? '').trim();
      if (card) return card;
    }
  }

  const photos = data.photos;
  if (Array.isArray(photos) && photos.length > 0) {
    const legacy = String(photos[0] ?? '').trim();
    if (legacy) return legacy;
  }

  const logo = String(data.logoUrl ?? '').trim();
  return logo || undefined;
}

export function parsePublicStudioPreview(
  raw: unknown,
): PublicStudioPreview | null {
  const data = asRecord(raw);
  if (!data?.id) return null;

  const count = asRecord(data._count);
  const reviewCount =
    Number(
      data.reviewCount ??
        data.review_count ??
        count?.Review ??
        count?.reviews ??
        0,
    ) || 0;

  const studioName = String(data.studioName ?? data.name ?? 'Studio').trim();

  return {
    id: String(data.id),
    slug: data.slug ? String(data.slug) : undefined,
    studioName: studioName || 'Studio',
    categories: extractCategoryLabels(data),
    rating: Number(data.avgRating ?? data.averageRating ?? 0) || 0,
    reviewCount,
    address: String(data.address ?? '').trim() || '—',
    distanceKm:
      typeof data.distance === 'number'
        ? data.distance
        : Number(data.distanceKm ?? data.distance_km) || undefined,
    lat:
      typeof data.lat === 'number'
        ? data.lat
        : typeof data.latitude === 'number'
          ? data.latitude
          : undefined,
    lng:
      typeof data.lng === 'number'
        ? data.lng
        : typeof data.longitude === 'number'
          ? data.longitude
          : undefined,
    photoUrl: resolveStudioHomePhotoUrl(data),
  };
}

export function formatCategoryPreview(categories: string[], maxVisible = 3) {
  if (categories.length === 0) {
    return { visible: [] as string[], moreCount: 0 };
  }
  const visible = categories.slice(0, maxVisible);
  return {
    visible,
    moreCount: Math.max(0, categories.length - visible.length),
  };
}

export function formatStudioDistanceLabel(
  distanceKm: number | undefined,
  templates: { meters: string; kilometers: string },
): string | null {
  if (distanceKm == null || Number.isNaN(distanceKm)) return null;
  if (distanceKm < 1) {
    const meters = Math.max(1, Math.round(distanceKm * 1000));
    return templates.meters.replace('{value}', String(meters));
  }
  const km = distanceKm.toFixed(1).replace(/\.0$/, '');
  return templates.kilometers.replace('{value}', km);
}
