import { apiClient } from '@/lib/api-client';

export type ClientScheduleItem = {
  enrollmentId: string | null;
  bookingId?: string | null;
  id?: string | null;
  bookedAt?: string;
  sessionId: string;
  bookingStatus: string;
  waitlisted: boolean;
  startsAt: string;
  endsAt?: string;
  sessionStatus?: string;
  capacity?: number;
  bookedCount?: number;
  locationName?: string | null;
  hasReview?: boolean;
  training: {
    id?: string;
    name: string;
    duration?: number;
    price?: number;
    language?: string | null;
    displayColor?: string | null;
  } | null;
  trainer: { id?: string; name: string } | null;
  studio: {
    id: string;
    name: string;
    address?: string | null;
    slug?: string | null;
  } | null;
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function parseItem(raw: unknown): ClientScheduleItem | null {
  const m = asRecord(raw);
  if (!m) return null;
  const sessionId = String(m.sessionId ?? m.session_id ?? '').trim();
  const startsAt = String(m.startsAt ?? m.starts_at ?? '').trim();
  if (!sessionId || !startsAt) return null;

  const training = asRecord(m.training) ?? asRecord(m.Training);
  const trainer = asRecord(m.trainer) ?? asRecord(m.Trainer);
  const studio = asRecord(m.studio) ?? asRecord(m.Studio);

  return {
    enrollmentId: m.enrollmentId
      ? String(m.enrollmentId)
      : m.enrollment_id
        ? String(m.enrollment_id)
        : null,
    bookingId: m.bookingId
      ? String(m.bookingId)
      : m.booking_id
        ? String(m.booking_id)
        : null,
    id: m.id ? String(m.id) : null,
    bookedAt: m.bookedAt ? String(m.bookedAt) : undefined,
    sessionId,
    bookingStatus: String(m.bookingStatus ?? m.booking_status ?? 'ACTIVE'),
    waitlisted: Boolean(m.waitlisted),
    startsAt,
    endsAt: m.endsAt ? String(m.endsAt) : undefined,
    sessionStatus: m.sessionStatus ? String(m.sessionStatus) : undefined,
    capacity: Number(m.capacity ?? 0) || undefined,
    bookedCount: Number(m.bookedCount ?? m.booked_count ?? 0) || undefined,
    locationName: m.locationName
      ? String(m.locationName)
      : m.location_name
        ? String(m.location_name)
        : null,
    hasReview: Boolean(m.hasReview ?? m.has_review),
    training: training
      ? {
          id: training.id ? String(training.id) : undefined,
          name: String(training.name ?? 'Class'),
          duration: Number(training.duration ?? 0) || undefined,
          price: Number(training.price ?? 0) || undefined,
          language: training.language
            ? String(training.language).trim() || null
            : null,
          displayColor: training.displayColor
            ? String(training.displayColor)
            : training.display_color
              ? String(training.display_color)
              : null,
        }
      : null,
    trainer: trainer
      ? {
          id: trainer.id ? String(trainer.id) : undefined,
          name: String(trainer.name ?? '').trim() || 'Trainer',
        }
      : null,
    studio: studio?.id
      ? {
          id: String(studio.id),
          name: String(studio.name ?? 'Studio'),
          address: studio.address ? String(studio.address) : null,
          slug: studio.slug ? String(studio.slug) : null,
        }
      : null,
  };
}

export async function fetchClientSchedule(params?: {
  from?: string;
  to?: string;
}): Promise<ClientScheduleItem[]> {
  const q = new URLSearchParams();
  if (params?.from) q.set('from', params.from);
  if (params?.to) q.set('to', params.to);
  const suffix = q.toString() ? `?${q.toString()}` : '';
  const raw = await apiClient.get<unknown>(`/fitness/client/schedule${suffix}`);
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(asRecord(raw)?.data)
      ? (asRecord(raw)!.data as unknown[])
      : [];
  return list
    .map(parseItem)
    .filter((x): x is ClientScheduleItem => x != null)
    .sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );
}

export function splitSchedule(items: ClientScheduleItem[]) {
  const now = Date.now() - 60_000;
  const upcoming: ClientScheduleItem[] = [];
  const past: ClientScheduleItem[] = [];
  for (const item of items) {
    const t = new Date(item.startsAt).getTime();
    if (Number.isNaN(t)) continue;
    if (t >= now && item.bookingStatus !== 'CANCELLED') {
      upcoming.push(item);
    } else {
      past.push(item);
    }
  }
  past.reverse();
  return { upcoming, past };
}

export function cancelTargetId(item: ClientScheduleItem): string | null {
  return item.enrollmentId || item.bookingId || item.id || null;
}

export async function cancelClientEnrollment(enrollmentId: string) {
  await apiClient.put(
    `/fitness/client/enrollments/${encodeURIComponent(enrollmentId)}/cancel`,
    {},
  );
}
