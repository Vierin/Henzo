import { parseStudioCurrency, type StudioCurrency } from '@/lib/format-money';

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
  /** Display labels (names). */
  categories: string[];
  /** Training category IDs from backend nearby/search payloads. */
  categoryIds: number[];
  rating: number;
  reviewCount: number;
  address: string;
  /** Branch / venue label from reminderSettings (browse cards). */
  locationName?: string;
  distanceKm?: number;
  lat?: number;
  lng?: number;
  photoUrl?: string;
  currency?: StudioCurrency;
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
      if (typeof c === 'string' && !/^\d+$/.test(c.trim())) add(c);
      else if (c && typeof c === 'object') {
        const m = c as Record<string, unknown>;
        const label = String(m.nameEn ?? m.name ?? m.label ?? '').trim();
        if (label) add(label);
      }
    }
  }
  return out;
}

/** Same fields as mobile `extractStudioTrainingCategoryIds`. */
export function extractStudioTrainingCategoryIds(
  data: Record<string, unknown>,
): number[] {
  const ids = new Set<number>();

  const addId = (raw: unknown) => {
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      ids.add(Math.trunc(raw));
      return;
    }
    if (typeof raw === 'string' && /^\d+$/.test(raw.trim())) {
      ids.add(parseInt(raw.trim(), 10));
    }
  };

  for (const field of ['trainingCategoryIds', 'categoryIds', 'categories']) {
    const raw = data[field];
    if (!Array.isArray(raw)) continue;
    for (const e of raw) addId(e);
  }

  for (const listKey of ['Training', 'training', 'services', 'Service']) {
    const raw = data[listKey];
    if (!Array.isArray(raw)) continue;
    for (const item of raw) {
      const m = asRecord(item);
      if (!m) continue;
      addId(m.trainingCategoryId ?? m.training_category_id);
      const tc = asRecord(m.trainingCategory ?? m.training_category);
      if (tc) addId(tc.id);
    }
  }

  return [...ids];
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

  const locationName = String(
    data.locationName ?? data.location_name ?? '',
  ).trim();

  return {
    id: String(data.id),
    slug: data.slug ? String(data.slug) : undefined,
    studioName: studioName || 'Studio',
    categories: extractCategoryLabels(data),
    categoryIds: extractStudioTrainingCategoryIds(data),
    rating:
      Number(data.avgRating ?? data.averageRating ?? data.rating ?? 0) || 0,
    reviewCount,
    address: String(data.address ?? '').trim() || '—',
    locationName: locationName || undefined,
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
    currency: parseStudioCurrency(data.currency),
  };
}

export function formatCategoryPreview(categories: string[], maxVisible = 3) {
  if (categories.length === 0) {
    return { visible: [] as string[], moreCount: 0 };
  }

  const rest: string[] = [];
  const other: string[] = [];
  for (const name of categories) {
    if (name.trim().toLowerCase() === 'other') other.push(name);
    else rest.push(name);
  }
  const sorted = [...rest, ...other];
  const visible = sorted.slice(0, maxVisible);
  return {
    visible,
    moreCount: Math.max(0, sorted.length - visible.length),
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
