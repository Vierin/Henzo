import {
  fetchPublicApiJson,
  resolvePopularStudiosApiBases,
} from '@/lib/client/fetch-popular-studios';
import { extractStudioIdFromSlug, isValidStudioSlug } from '@/utils/slug';

export type PublicStudioReview = {
  id: string;
  rating: number;
  comment?: string;
  createdAt?: string;
  userName?: string;
};

export type PublicStudioDetail = {
  id: string;
  slug?: string;
  name: string;
  description?: string;
  address?: string;
  locationName?: string;
  phone?: string;
  email?: string;
  website?: string;
  instagram?: string;
  photos: string[];
  photoUrl?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  avgRating?: number;
  reviewCount?: number;
  categoryIds: number[];
  categoryLabels: {
    id: number;
    nameEn: string;
    nameRu?: string;
    nameVn?: string;
    chipBgHex?: string;
    chipFgHex?: string | null;
  }[];
  reviews: PublicStudioReview[];
};

export type PublicScheduleSession = {
  id: string;
  startsAt: string;
  endsAt?: string;
  trainingName?: string;
  trainerName?: string;
  capacity?: number;
  enrolledCount?: number;
  price?: number;
  durationMinutes?: number;
  locationName?: string;
  displayColor?: string;
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function resolveLocationName(
  data: Record<string, unknown>,
): string | undefined {
  const direct = String(data.locationName ?? data.location_name ?? '').trim();
  if (direct) return direct;
  const reminder = asRecord(data.reminderSettings);
  if (!reminder) return undefined;
  const custom = String(reminder.defaultLocationName ?? '').trim();
  if (custom) return custom;
  const locations = reminder.trainingLocations ?? reminder.locations;
  if (Array.isArray(locations) && locations.length > 0) {
    const first = asRecord(locations[0]);
    const name = String(first?.name ?? first?.label ?? '').trim();
    if (name) return name;
  }
  return undefined;
}

export function parsePublicStudioDetail(
  raw: unknown,
): PublicStudioDetail | null {
  const data = asRecord(raw);
  if (!data?.id) return null;

  const photos: string[] = [];
  const gallery = data.photoGallery;
  if (Array.isArray(gallery)) {
    for (const item of gallery) {
      const g = asRecord(item);
      const url = String(g?.heroUrl ?? g?.url ?? g?.cardUrl ?? '').trim();
      if (url && !photos.includes(url)) photos.push(url);
    }
  }
  if (Array.isArray(data.photos)) {
    for (const p of data.photos) {
      const url = String(p ?? '').trim();
      if (url && !photos.includes(url)) photos.push(url);
    }
  }

  const count = asRecord(data._count);

  const categoryIds: number[] = [];
  const categoryLabels: PublicStudioDetail['categoryLabels'] = [];
  const seenCat = new Set<number>();

  const services = Array.isArray(data.services)
    ? data.services
    : Array.isArray(data.Training)
      ? data.Training
      : [];

  for (const s of services) {
    const m = asRecord(s);
    if (!m) continue;
    const id = Number(m.trainingCategoryId ?? 0);
    if (!id || seenCat.has(id)) continue;
    seenCat.add(id);
    categoryIds.push(id);
    const tc = asRecord(m.trainingCategory);
    if (tc) {
      categoryLabels.push({
        id,
        nameEn: String(tc.nameEn ?? tc.name_en ?? 'Category'),
        nameRu: String(tc.nameRu ?? tc.name_ru ?? '') || undefined,
        nameVn: String(tc.nameVn ?? tc.name_vn ?? '') || undefined,
        chipBgHex:
          String(tc.chipBgHex ?? tc.chip_bg_hex ?? '').trim() || undefined,
        chipFgHex: String(tc.chipFgHex ?? tc.chip_fg_hex ?? '').trim() || null,
      });
    }
  }

  if (Array.isArray(data.categories)) {
    for (const c of data.categories) {
      if (typeof c === 'number' && !seenCat.has(c)) {
        seenCat.add(c);
        categoryIds.push(c);
      }
    }
  }

  const reviews: PublicStudioReview[] = [];
  if (Array.isArray(data.reviews)) {
    for (const r of data.reviews) {
      const m = asRecord(r);
      if (!m?.id) continue;
      const user = asRecord(m.user) ?? asRecord(m.User);
      reviews.push({
        id: String(m.id),
        rating: Number(m.rating ?? 0) || 0,
        comment: String(m.comment ?? '').trim() || undefined,
        createdAt: m.createdAt ? String(m.createdAt) : undefined,
        userName: String(user?.name ?? '').trim() || undefined,
      });
    }
    reviews.sort((a, b) => {
      const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
      const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
      return tb - ta;
    });
  }

  return {
    id: String(data.id),
    slug: data.slug ? String(data.slug) : undefined,
    name: String(data.name ?? 'Studio').trim() || 'Studio',
    description:
      String(data.description ?? data.descriptionEn ?? '').trim() || undefined,
    address: String(data.address ?? '').trim() || undefined,
    locationName: resolveLocationName(data),
    phone: String(data.phone ?? '').trim() || undefined,
    email: String(data.email ?? '').trim() || undefined,
    website: String(data.website ?? '').trim() || undefined,
    instagram: String(data.instagram ?? '').trim() || undefined,
    photos,
    photoUrl: photos[0],
    latitude: typeof data.latitude === 'number' ? data.latitude : undefined,
    longitude: typeof data.longitude === 'number' ? data.longitude : undefined,
    timezone: data.timezone ? String(data.timezone) : undefined,
    avgRating: Number(data.avgRating ?? data.averageRating ?? 0) || undefined,
    reviewCount:
      Number(data.reviewCount ?? count?.Review ?? count?.reviews ?? 0) ||
      reviews.length ||
      undefined,
    categoryIds,
    categoryLabels,
    reviews,
  };
}

async function fetchPublicStudioById(
  id: string,
): Promise<PublicStudioDetail | null> {
  const encoded = encodeURIComponent(id);
  const raw =
    (await fetchPublicApiJson(`/studios/${encoded}`, 120)) ??
    (await fetchPublicApiJson(`/studios/public/${encoded}`, 120));
  return parsePublicStudioDetail(raw);
}

/**
 * Resolve studio from SEO slug (`name-cuid`), stored DB slug, or bare id.
 */
export async function fetchPublicStudioBySlug(
  slug: string,
): Promise<PublicStudioDetail | null> {
  const trimmed = slug.trim();
  if (!trimmed) return null;

  const encoded = encodeURIComponent(trimmed);
  const bySlugRaw =
    (await fetchPublicApiJson(`/studios/public/by-slug/${encoded}`, 120)) ??
    (await fetchPublicApiJson(`/studios/by-slug/${encoded}`, 120));
  const bySlug = parsePublicStudioDetail(bySlugRaw);
  if (bySlug) return bySlug;

  const studioId = extractStudioIdFromSlug(trimmed);
  if (studioId && isValidStudioSlug(trimmed)) {
    return fetchPublicStudioById(studioId);
  }

  return null;
}

function parseScheduleSessions(raw: unknown): PublicScheduleSession[] {
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(asRecord(raw)?.data)
      ? (asRecord(raw)!.data as unknown[])
      : Array.isArray(asRecord(raw)?.sessions)
        ? (asRecord(raw)!.sessions as unknown[])
        : [];

  return list
    .map((item): PublicScheduleSession | null => {
      const m = asRecord(item);
      if (!m?.id || !m.startsAt) return null;
      const training = asRecord(m.Training) ?? asRecord(m.training);
      const trainer = asRecord(m.Trainer) ?? asRecord(m.trainer);
      const status = String(m.status ?? 'ACTIVE').toUpperCase();
      if (status && status !== 'ACTIVE') return null;
      return {
        id: String(m.id),
        startsAt: String(m.startsAt),
        endsAt: m.endsAt ? String(m.endsAt) : undefined,
        trainingName: String(
          m.trainingName ?? training?.name ?? 'Class',
        ).trim(),
        trainerName: trainer?.name ? String(trainer.name).trim() : undefined,
        capacity: Number(m.capacity ?? 0) || undefined,
        enrolledCount:
          Number(
            m.enrolledCount ??
              m.bookedCount ??
              m.activeEnrollmentCount ??
              asRecord(m._count)?.SessionEnrollment ??
              0,
          ) || undefined,
        price:
          Number(m.price ?? training?.price ?? 0) > 0
            ? Number(m.price ?? training?.price)
            : undefined,
        durationMinutes:
          Number(training?.duration ?? m.duration ?? 0) || undefined,
        locationName: String(m.locationName ?? '').trim() || undefined,
        displayColor:
          String(m.displayColor ?? training?.displayColor ?? '').trim() ||
          undefined,
      };
    })
    .filter((s): s is PublicScheduleSession => s != null)
    .sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );
}

export async function fetchPublicStudioSchedule(
  studioId: string,
): Promise<PublicScheduleSession[]> {
  const from = new Date().toISOString();
  const path = `/studios/${encodeURIComponent(studioId)}/schedule?from=${encodeURIComponent(from)}&limit=60`;
  const raw = await fetchPublicApiJson(path, 60);
  return parseScheduleSessions(raw);
}

export async function fetchPublicStudioScheduleClient(
  studioId: string,
): Promise<PublicScheduleSession[]> {
  const from = new Date().toISOString();
  const path = `/studios/${encodeURIComponent(studioId)}/schedule?from=${encodeURIComponent(from)}&limit=60`;
  for (const base of resolvePopularStudiosApiBases()) {
    try {
      const res = await fetch(`${base}${path}`);
      if (!res.ok) continue;
      return parseScheduleSessions(await res.json());
    } catch {
      // try next
    }
  }
  return [];
}
