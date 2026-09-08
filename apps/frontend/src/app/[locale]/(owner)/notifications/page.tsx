'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Megaphone,
  Star,
  X,
} from 'lucide-react';
import { extractLocaleFromPath, withLocale, type Locale } from '@/i18n/routing';
import {
  OWNER_NOTIFICATIONS_QUERY_KEY,
  bookingSessionParts,
  fetchOwnerNotificationsInbox,
  formatNotificationTime,
  isBookingFilterKind,
  kindAccent,
  markOwnerNotificationsRead,
  matchesNotificationFilter,
  notificationKind,
  notificationMessage,
  ownerVisibleNotifications,
  type OwnerNotification,
  type OwnerNotificationFilter,
  type OwnerNotificationKind,
  typeLabel,
} from '@/lib/owner/fetch-notifications';
import { ownerTheme } from '@/lib/owner/owner-theme';

function SectionHeader({ label }: { label: string }) {
  return (
    <p
      className="px-1 text-[13px] font-bold uppercase tracking-[0.08em]"
      style={{ color: ownerTheme.text }}
    >
      {label}
    </p>
  );
}

function FilterPill({
  label,
  count,
  selected,
  onClick,
}: {
  label: string;
  count: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-1 items-center justify-center gap-1.5 rounded-full px-2 py-2.5 text-sm font-semibold transition"
      style={
        selected
          ? { backgroundColor: ownerTheme.accent, color: '#fff' }
          : { backgroundColor: '#fff', color: ownerTheme.text }
      }
    >
      <span>{label}</span>
      <span
        className="tabular-nums text-xs font-medium"
        style={{ color: selected ? 'rgba(255,255,255,0.65)' : '#9CA3AF' }}
      >
        {count}
      </span>
    </button>
  );
}

function TypeIcon({ kind }: { kind: OwnerNotificationKind }) {
  const accent = kindAccent(kind);
  const icon =
    kind === 'review' ? (
      <Star className="h-4 w-4" />
    ) : kind === 'bookingCancelled' ? (
      <X className="h-4 w-4" strokeWidth={2.5} />
    ) : kind === 'system' ? (
      <Megaphone className="h-4 w-4" />
    ) : (
      <Calendar className="h-4 w-4" />
    );
  return (
    <span
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white"
      style={{ backgroundColor: accent }}
    >
      {icon}
    </span>
  );
}

function groupByDay(items: OwnerNotification[]) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  const groups: { label: string; items: OwnerNotification[] }[] = [];
  const buckets = new Map<string, OwnerNotification[]>();

  for (const n of items) {
    let key: string;
    if (n.createdAt >= todayStart) key = 'TODAY';
    else if (n.createdAt >= yesterdayStart) key = 'YESTERDAY';
    else key = 'EARLIER';
    const list = buckets.get(key) ?? [];
    list.push(n);
    buckets.set(key, list);
  }

  for (const label of ['TODAY', 'YESTERDAY', 'EARLIER']) {
    const list = buckets.get(label);
    if (list?.length) groups.push({ label, items: list });
  }
  return groups;
}

function NotificationCard({
  n,
  onTap,
}: {
  n: OwnerNotification;
  onTap: () => void;
}) {
  const kind = notificationKind(n);
  const accent = kindAccent(kind);
  const msg = notificationMessage(n);
  const session = isBookingFilterKind(kind) ? bookingSessionParts(n) : null;
  const tappable = kind !== 'bookingCancelled';

  return (
    <button
      type="button"
      onClick={onTap}
      disabled={!tappable}
      className="flex w-full items-stretch gap-3 rounded-[14px] bg-white px-3.5 py-3.5 text-left disabled:cursor-default"
    >
      <TypeIcon kind={kind} />
      <div className="min-w-0 flex-1">
        <p
          className="text-[11px] font-bold tracking-wide"
          style={{ color: accent }}
        >
          • {typeLabel(kind)}
        </p>
        <p
          className="mt-1.5 text-sm leading-snug"
          style={{ color: ownerTheme.text }}
        >
          {msg.lead ? (
            <>
              <span className="font-bold">{msg.lead}</span>
              {msg.rest}
            </>
          ) : (
            msg.rest
          )}
        </p>
        {session ? (
          <div
            className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] font-medium"
            style={{ color: ownerTheme.text }}
          >
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {session.time}
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {session.date}
            </span>
          </div>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-col items-end justify-between">
        <span className="text-xs font-medium" style={{ color: '#9CA3AF' }}>
          {formatNotificationTime(n.createdAt)}
        </span>
        {tappable ? (
          <ChevronRight
            className="mt-auto h-4 w-4"
            style={{ color: '#9CA3AF' }}
          />
        ) : null}
      </div>
    </button>
  );
}

export default function OwnerNotificationsPage() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = (extractLocaleFromPath(pathname) ?? 'en') as Locale;
  const path = (p: string) => withLocale(p, locale);
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<OwnerNotificationFilter>('all');

  const inboxQuery = useQuery({
    queryKey: OWNER_NOTIFICATIONS_QUERY_KEY,
    queryFn: fetchOwnerNotificationsInbox,
    refetchOnWindowFocus: true,
  });

  const markAll = useMutation({
    mutationFn: () => markOwnerNotificationsRead(),
    onSuccess: async () => {
      queryClient.setQueryData<OwnerNotification[]>(
        OWNER_NOTIFICATIONS_QUERY_KEY,
        (prev) => (prev ?? []).map((n) => ({ ...n, read: true })),
      );
      await queryClient.invalidateQueries({
        queryKey: OWNER_NOTIFICATIONS_QUERY_KEY,
      });
    },
  });

  const markedRef = useRef(false);
  useEffect(() => {
    if (!inboxQuery.isSuccess || markedRef.current) return;
    markedRef.current = true;
    void markAll.mutateAsync().catch(() => {
      markedRef.current = false;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per mount after first fetch
  }, [inboxQuery.isSuccess]);

  const visible = useMemo(
    () => ownerVisibleNotifications(inboxQuery.data ?? []),
    [inboxQuery.data],
  );

  const filtered = useMemo(
    () => visible.filter((n) => matchesNotificationFilter(n, filter)),
    [visible, filter],
  );

  const bookingsCount = visible.filter((n) =>
    isBookingFilterKind(notificationKind(n)),
  ).length;
  const reviewsCount = visible.filter(
    (n) => notificationKind(n) === 'review',
  ).length;

  const groups = useMemo(() => groupByDay(filtered), [filtered]);

  function onTap(n: OwnerNotification) {
    const kind = notificationKind(n);
    if (kind === 'bookingCancelled') return;
    if (kind === 'review') {
      router.push(path('/salon-info/reviews'));
      return;
    }
    if (!isBookingFilterKind(kind)) return;
    const sessionId = (n.data.sessionId || '').trim();
    if (sessionId) {
      router.push(path(`/calendar/session/${sessionId}`));
      return;
    }
    router.push(path('/calendar'));
  }

  return (
    <div className="pb-8">
      <div className="mb-4 flex items-center gap-2">
        <Link
          href={path('/owner-dashboard')}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white"
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5" style={{ color: ownerTheme.text }} />
        </Link>
        <h1
          className="flex-1 text-center text-lg font-bold tracking-tight"
          style={{ color: ownerTheme.text }}
        >
          Notifications
        </h1>
        <span className="w-9" aria-hidden />
      </div>

      <div className="mb-4 flex gap-2">
        <FilterPill
          label="All"
          count={visible.length}
          selected={filter === 'all'}
          onClick={() => setFilter('all')}
        />
        <FilterPill
          label="Bookings"
          count={bookingsCount}
          selected={filter === 'bookings'}
          onClick={() => setFilter('bookings')}
        />
        <FilterPill
          label="Reviews"
          count={reviewsCount}
          selected={filter === 'reviews'}
          onClick={() => setFilter('reviews')}
        />
      </div>

      {inboxQuery.isLoading ? (
        <p
          className="py-16 text-center text-sm"
          style={{ color: ownerTheme.textSecondary }}
        >
          Loading…
        </p>
      ) : inboxQuery.isError ? (
        <div className="py-16 text-center">
          <p className="text-sm text-red-600">Failed to load notifications</p>
          <button
            type="button"
            className="mt-3 text-sm font-semibold"
            style={{ color: ownerTheme.accent }}
            onClick={() => void inboxQuery.refetch()}
          >
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Bell
            className="mb-3 h-8 w-8"
            style={{ color: ownerTheme.textSecondary }}
          />
          <p className="text-base font-bold" style={{ color: ownerTheme.text }}>
            {visible.length === 0 ? 'No notifications yet' : 'Nothing here'}
          </p>
          {visible.length === 0 ? (
            <p
              className="mt-1 max-w-xs text-sm"
              style={{ color: ownerTheme.textSecondary }}
            >
              New bookings and reviews will show up here.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <div key={g.label} className="space-y-2.5">
              <SectionHeader label={g.label} />
              {g.items.map((n) => (
                <NotificationCard key={n.id} n={n} onTap={() => onTap(n)} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
