import {
  fetchPublicApiJson,
  resolvePopularStudiosApiBases,
} from '@/lib/client/fetch-popular-studios';

export type PublicStudioDetail = {
  id: string;
  slug?: string;
  name: string;
  description?: string;
  address?: string;
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
};

export type PublicScheduleSession = {
  id: string;
  startsAt: string;
  endsAt?: string;
  trainingName?: string;
  trainerName?: string;
  capacity?: number;
  enrolledCount?: number;
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

export function parsePublicStudioDetail(
  raw: unknown,
): PublicStudioDetail | null {
  const data = asRecord(raw);
  if (!data?.id) return null;

  const photos: string[] = [];
  if (Array.isArray(data.photos)) {
    for (const p of data.photos) {
      const url = String(p ?? '').trim();
      if (url) photos.push(url);
    }
  }
  const gallery = data.photoGallery;
  if (Array.isArray(gallery)) {
    for (const item of gallery) {
      const g = asRecord(item);
      const url = String(g?.heroUrl ?? g?.url ?? g?.cardUrl ?? '').trim();
      if (url && !photos.includes(url)) photos.push(url);
    }
  }

  const count = asRecord(data._count);

  return {
    id: String(data.id),
    slug: data.slug ? String(data.slug) : undefined,
    name: String(data.name ?? 'Studio').trim() || 'Studio',
    description:
      String(data.description ?? data.descriptionEn ?? '').trim() || undefined,
    address: String(data.address ?? '').trim() || undefined,
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
      undefined,
  };
}

export async function fetchPublicStudioBySlug(
  slug: string,
): Promise<PublicStudioDetail | null> {
  const encoded = encodeURIComponent(slug);
  const raw =
    (await fetchPublicApiJson(`/studios/public/by-slug/${encoded}`, 120)) ??
    (await fetchPublicApiJson(`/studios/by-slug/${encoded}`, 120));
  return parsePublicStudioDetail(raw);
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
              m.activeEnrollmentCount ??
              asRecord(m._count)?.SessionEnrollment ??
              0,
          ) || undefined,
      };
    })
    .filter((s): s is PublicScheduleSession => s != null);
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
