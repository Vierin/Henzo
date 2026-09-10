import { apiClient } from '@/lib/api-client';

export type MyEnrollmentStatus = {
  enrolled: boolean;
  enrollmentId: string | null;
  status: 'ACTIVE' | 'PENDING' | null;
  waitlisted: boolean;
};

export type BookSessionResult = {
  success: boolean;
  alreadyBooked?: boolean;
  enrollmentId?: string;
  booking?: {
    sessionId: string;
    status: string;
    startsAt?: string;
    endsAt?: string;
    bookedCount?: number;
    capacity?: number;
  };
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

export async function fetchMyEnrollment(
  sessionId: string,
): Promise<MyEnrollmentStatus> {
  try {
    const raw = await apiClient.get<unknown>(
      `/studios/sessions/${encodeURIComponent(sessionId)}/my-enrollment`,
    );
    const m = asRecord(raw);
    const statusRaw = String(m?.status ?? '')
      .trim()
      .toUpperCase();
    const status =
      statusRaw === 'ACTIVE' || statusRaw === 'PENDING'
        ? (statusRaw as 'ACTIVE' | 'PENDING')
        : null;
    return {
      enrolled: Boolean(m?.enrolled),
      enrollmentId: m?.enrollmentId ? String(m.enrollmentId) : null,
      status,
      waitlisted: Boolean(m?.waitlisted),
    };
  } catch (err) {
    const status = (err as { status?: number })?.status;
    if (status === 401) {
      return {
        enrolled: false,
        enrollmentId: null,
        status: null,
        waitlisted: false,
      };
    }
    throw err;
  }
}

export async function bookPublicSession(
  sessionId: string,
): Promise<BookSessionResult> {
  const raw = await apiClient.post<unknown>(
    `/studios/sessions/${encodeURIComponent(sessionId)}/book`,
    {},
  );
  const m = asRecord(raw);
  const booking = asRecord(m?.booking);
  return {
    success: Boolean(m?.success ?? true),
    alreadyBooked: Boolean(m?.alreadyBooked),
    enrollmentId: m?.enrollmentId ? String(m.enrollmentId) : undefined,
    booking: booking
      ? {
          sessionId: String(booking.sessionId ?? sessionId),
          status: String(booking.status ?? 'ACTIVE'),
          startsAt: booking.startsAt ? String(booking.startsAt) : undefined,
          endsAt: booking.endsAt ? String(booking.endsAt) : undefined,
          bookedCount:
            typeof booking.bookedCount === 'number'
              ? booking.bookedCount
              : undefined,
          capacity:
            typeof booking.capacity === 'number' ? booking.capacity : undefined,
        }
      : undefined,
  };
}

export async function joinSessionWaitlist(sessionId: string): Promise<void> {
  await apiClient.post(
    `/studios/sessions/${encodeURIComponent(sessionId)}/waitlist`,
    {},
  );
}

export async function leaveSessionWaitlist(sessionId: string): Promise<void> {
  await apiClient.delete(
    `/studios/sessions/${encodeURIComponent(sessionId)}/waitlist`,
  );
}

/** Safe same-origin relative path for post-login redirect. */
export function safeInternalNext(
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    decoded = raw;
  }
  if (!decoded.startsWith('/') || decoded.startsWith('//')) return null;
  if (decoded.includes('://')) return null;
  return decoded;
}
