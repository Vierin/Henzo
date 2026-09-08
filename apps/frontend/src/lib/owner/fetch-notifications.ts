import { apiClient } from '@/lib/api-client';

export type OwnerNotification = {
  id: string;
  title: string;
  body: string;
  createdAt: Date;
  read: boolean;
  data: Record<string, string>;
};

export type OwnerNotificationKind =
  | 'booking'
  | 'bookingCancelled'
  | 'review'
  | 'system';

export type OwnerNotificationFilter = 'all' | 'bookings' | 'reviews';

type InboxApiItem = {
  id?: unknown;
  type?: unknown;
  title?: unknown;
  body?: unknown;
  createdAt?: unknown;
  read?: unknown;
  data?: unknown;
};

function asDataMap(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    out[k] = v == null ? '' : String(v);
  }
  return out;
}

function parseItem(raw: InboxApiItem): OwnerNotification | null {
  const id = String(raw.id ?? '').trim();
  if (!id) return null;
  const data = asDataMap(raw.data);
  const type = String(raw.type ?? '').trim();
  if (type) data.type = data.type || type;
  const created = new Date(String(raw.createdAt ?? ''));
  return {
    id,
    title: String(raw.title ?? ''),
    body: String(raw.body ?? ''),
    createdAt: Number.isNaN(created.getTime()) ? new Date() : created,
    read: Boolean(raw.read),
    data,
  };
}

export async function fetchOwnerNotificationsInbox(): Promise<
  OwnerNotification[]
> {
  const res = await apiClient.get<{
    success?: boolean;
    items?: InboxApiItem[];
  }>('/notifications/inbox?limit=100');
  const items = Array.isArray(res?.items) ? res.items : [];
  return items
    .map((item) => parseItem(item))
    .filter((n): n is OwnerNotification => Boolean(n))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/** Empty body = mark all unread for current user (mobile parity). */
export async function markOwnerNotificationsRead(
  ids?: string[],
): Promise<void> {
  await apiClient.patch('/notifications/inbox/read', ids ? { ids } : {});
}

export function isReminderNotification(n: OwnerNotification): boolean {
  const type = (n.data.type ?? n.data.eventType ?? '').toLowerCase();
  const text = `${n.title} ${n.body}`.toLowerCase();
  return type.includes('reminder') || text.includes('reminder');
}

/** Owner inbox hides reminder/client pre-class noise. */
export function ownerVisibleNotifications(
  items: OwnerNotification[],
): OwnerNotification[] {
  return items.filter((n) => !isReminderNotification(n));
}

export function ownerUnreadCount(items: OwnerNotification[]): number {
  return ownerVisibleNotifications(items).filter((n) => !n.read).length;
}

export function notificationKind(n: OwnerNotification): OwnerNotificationKind {
  const type = (n.data.type ?? n.data.eventType ?? '').toLowerCase();
  const text = `${n.title} ${n.body}`.toLowerCase();

  if (type.includes('review') || text.includes('review')) return 'review';
  if (
    type.includes('booking_cancelled') ||
    (type.includes('cancelled') && type.includes('booking'))
  ) {
    return 'bookingCancelled';
  }
  if (
    type.includes('booking') ||
    type.includes('booked') ||
    type.includes('reserve') ||
    type.includes('reservation') ||
    text.includes('booking') ||
    text.includes('booked') ||
    text.includes('reserve') ||
    text.includes('reservation') ||
    text.includes('cancelled')
  ) {
    if (text.includes('cancel') || type.includes('cancel')) {
      return 'bookingCancelled';
    }
    return 'booking';
  }
  return 'system';
}

export function isBookingFilterKind(kind: OwnerNotificationKind): boolean {
  return kind === 'booking' || kind === 'bookingCancelled';
}

export function matchesNotificationFilter(
  n: OwnerNotification,
  filter: OwnerNotificationFilter,
): boolean {
  const kind = notificationKind(n);
  if (filter === 'all') return true;
  if (filter === 'bookings') return isBookingFilterKind(kind);
  return kind === 'review';
}

export function typeLabel(kind: OwnerNotificationKind): string {
  switch (kind) {
    case 'booking':
      return 'BOOKING';
    case 'bookingCancelled':
      return 'BOOKING CANCELLED';
    case 'review':
      return 'REVIEW';
    default:
      return 'ANNOUNCEMENT';
  }
}

export function kindAccent(kind: OwnerNotificationKind): string {
  switch (kind) {
    case 'review':
      return '#9C27B0';
    case 'system':
      return '#6B7280';
    default:
      return '#F15942';
  }
}

export function formatNotificationTime(date: Date): string {
  const now = new Date();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  yesterday.setDate(yesterday.getDate() - 1);
  const pad = (n: number) => String(n).padStart(2, '0');
  const hm = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  if (date >= yesterday) return hm;
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${String(
    date.getFullYear(),
  ).slice(2)} ${hm}`;
}

export function bookingSessionParts(n: OwnerNotification): {
  time: string;
  date: string;
} | null {
  const raw = (n.data.dateTime || n.data.startsAt || '').trim();
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (x: number) => String(x).padStart(2, '0');
  return {
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    date: `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${String(
      d.getFullYear(),
    ).slice(2)}`,
  };
}

export function notificationMessage(n: OwnerNotification): {
  lead?: string;
  rest: string;
} {
  const lead = n.data.clientName?.trim();
  const body = n.body.trim() || n.title.trim();
  if (lead && body.startsWith(lead)) {
    return { lead, rest: body.slice(lead.length) };
  }
  if (lead) {
    const kind = notificationKind(n);
    const service =
      n.data.trainingName?.trim() || n.data.serviceName?.trim() || 'class';
    if (kind === 'review') {
      const rating = n.data.rating?.trim();
      return {
        lead,
        rest: rating ? ` left a ${rating}★ review` : ' left a review',
      };
    }
    if (kind === 'bookingCancelled') {
      return { lead, rest: ` cancelled ${service}` };
    }
    if (kind === 'booking') {
      return { lead, rest: ` booked ${service}` };
    }
  }
  return { rest: body };
}

export const OWNER_NOTIFICATIONS_QUERY_KEY = [
  'owner-notifications-inbox',
] as const;
