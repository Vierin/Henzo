import {
  fetchPublicApiJson,
  resolvePopularStudiosApiBases,
} from '@/lib/client/fetch-popular-studios';
import { readPublicTrainerName } from '@/lib/client/nearby-class-session';
import { extractStudioIdFromSlug, isValidStudioSlug } from '@/utils/slug';
import { parseStudioCurrency, type StudioCurrency } from '@/lib/format-money';

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
  /** Studio brand logo — omit UI badge when missing. */
  logoUrl?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  currency: StudioCurrency;
  /** Bookable window length in days (studio reminderSettings). */
  bookingPeriodDays: number;
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

const DEFAULT_BOOKING_PERIOD_DAYS = 28;
const MIN_BOOKING_PERIOD_DAYS = 1;
const MAX_BOOKING_PERIOD_DAYS = 60;

export function parseBookingPeriodDays(raw: unknown): number {
  let days = DEFAULT_BOOKING_PERIOD_DAYS;
  if (typeof raw === 'number' && Number.isFinite(raw)) days = Math.floor(raw);
  else if (typeof raw === 'string') {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n)) days = n;
  }
  return Math.max(
    MIN_BOOKING_PERIOD_DAYS,
    Math.min(MAX_BOOKING_PERIOD_DAYS, days),
  );
}

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
  description?: string;
  descriptionEn?: string;
  descriptionRu?: string;
  descriptionVi?: string;
  categoryName?: string;
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
    logoUrl: String(data.logoUrl ?? data.logo_url ?? '').trim() || undefined,
    latitude: typeof data.latitude === 'number' ? data.latitude : undefined,
    longitude: typeof data.longitude === 'number' ? data.longitude : undefined,
    timezone: data.timezone ? String(data.timezone) : undefined,
    currency: parseStudioCurrency(data.currency),
    bookingPeriodDays: parseBookingPeriodDays(
      asRecord(data.reminderSettings)?.bookingPeriodDays,
    ),
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

export async function fetchPublicStudioById(
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

  const parsed = list
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
        trainerName: readPublicTrainerName(trainer, m.trainerName) || undefined,
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
        description: (() => {
          const en = String(training?.descriptionEn ?? '').trim();
          const ru = String(training?.descriptionRu ?? '').trim();
          const vi = String(training?.descriptionVi ?? '').trim();
          const base = String(training?.description ?? '').trim();
          return en || base || ru || vi || undefined;
        })(),
        descriptionEn:
          String(training?.descriptionEn ?? '').trim() || undefined,
        descriptionRu:
          String(training?.descriptionRu ?? '').trim() || undefined,
        descriptionVi:
          String(training?.descriptionVi ?? '').trim() || undefined,
        categoryName: (() => {
          const cat =
            asRecord(training?.trainingCategory) ??
            asRecord(m.trainingCategory);
          if (!cat) return undefined;
          return (
            String(cat.name_en ?? cat.nameEn ?? '').trim() ||
            String(cat.name_ru ?? cat.nameRu ?? '').trim() ||
            String(cat.name_vn ?? cat.nameVn ?? '').trim() ||
            undefined
          );
        })(),
      };
    })
    .filter((s): s is PublicScheduleSession => s != null)
    .sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );

  const names = new Set(
    parsed
      .map((s) => s.trainerName?.trim() ?? '')
      .filter((name) => name.length > 0),
  );
  if (names.size !== 1) return parsed;
  const sole = [...names][0];
  return parsed.map((s) =>
    s.trainerName?.trim() ? s : { ...s, trainerName: sole },
  );
}

export type PublicScheduleFetchOpts = {
  from?: Date | string;
  to?: Date | string;
  limit?: number;
};

function buildSchedulePath(
  studioId: string,
  opts?: PublicScheduleFetchOpts,
): string {
  const from =
    opts?.from instanceof Date
      ? opts.from.toISOString()
      : opts?.from?.trim() || new Date().toISOString();
  const q = new URLSearchParams({
    from,
    limit: String(opts?.limit ?? 60),
  });
  if (opts?.to) {
    q.set(
      'to',
      opts.to instanceof Date ? opts.to.toISOString() : String(opts.to),
    );
  }
  return `/studios/${encodeURIComponent(studioId)}/schedule?${q.toString()}`;
}

export async function fetchPublicStudioSchedule(
  studioId: string,
  opts?: PublicScheduleFetchOpts,
): Promise<PublicScheduleSession[]> {
  const raw = await fetchPublicApiJson(buildSchedulePath(studioId, opts), 60);
  return parseScheduleSessions(raw);
}

export async function fetchPublicStudioScheduleClient(
  studioId: string,
  opts?: PublicScheduleFetchOpts,
): Promise<PublicScheduleSession[]> {
  const path = buildSchedulePath(studioId, opts);
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
