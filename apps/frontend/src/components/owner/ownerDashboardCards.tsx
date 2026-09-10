'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { MapPin, Pencil } from 'lucide-react';
import type { OwnerTrainingSession } from '@/lib/owner/types';
import { ownerTheme } from '@/lib/owner/owner-theme';
import { formatOwnerTime24h } from '@/lib/owner/format-time';
import {
  OwnerSessionCard,
  OwnerScheduleEmptyCard,
} from '@/components/owner/ownerSessionCard';
import {
  OwnerSessionEditScopeModal,
  type OwnerSessionEditScope,
} from '@/components/owner/ownerSessionEditScopeModal';
import { extractLocaleFromPath, withLocale, type Locale } from '@/i18n/routing';

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function OwnerDashboardStatCards({
  classesToday,
  bookingsToday,
  waitlistToday,
}: {
  classesToday: number;
  bookingsToday: number;
  waitlistToday: number;
}) {
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3">
      <StatCard
        value={classesToday}
        label="Classes today"
        background={classesToday > 0 ? ownerTheme.statLime : ownerTheme.accent}
        color={classesToday > 0 ? ownerTheme.text : '#FFFFFF'}
      />
      <StatCard
        value={bookingsToday}
        label="Bookings"
        background={ownerTheme.statSalmon}
        color={ownerTheme.text}
      />
      <StatCard
        value={waitlistToday}
        label="Waitlist"
        background="#FFFFFF"
        color={ownerTheme.text}
      />
    </div>
  );
}

function StatCard({
  value,
  label,
  background,
  color,
}: {
  value: number;
  label: string;
  background: string;
  color: string;
}) {
  return (
    <div
      className="flex min-h-[130px] flex-col rounded-[18px] px-4 py-2 pt-3 sm:min-h-[96px] justify-between"
      style={{ backgroundColor: background, color }}
    >
      <div className="text-[28px] font-medium leading-none tabular-nums sm:text-[30px]">
        {value}
      </div>
      <div className="min-w-0 text-[13px] leading-snug sm:text-sm">{label}</div>
    </div>
  );
}

export function OwnerFeaturedSessionCard({
  session,
  href,
}: {
  session: OwnerTrainingSession;
  href: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const locale = (extractLocaleFromPath(pathname) ?? 'en') as Locale;
  const [editScopeOpen, setEditScopeOpen] = useState(false);

  const now = new Date();
  const starts = new Date(session.startsAt);
  const today = isSameDay(starts, now);
  const capacity = session.capacity || 0;
  const enrolled = session.enrolledCount || 0;
  const ratio = capacity > 0 ? Math.min(1, enrolled / capacity) : 0;
  const pct = Math.round(ratio * 100);

  const whenLabel = today
    ? 'TODAY'
    : `NEXT · ${new Intl.DateTimeFormat('en', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      }).format(starts)}`;

  const onPickEditScope = (scope: OwnerSessionEditScope) => {
    setEditScopeOpen(false);
    const q = new URLSearchParams({
      applyToFollowing: scope === 'following' ? '1' : '0',
    });
    router.push(
      withLocale(
        `/calendar/session/${encodeURIComponent(session.sessionId)}/edit?${q}`,
        locale,
      ),
    );
  };

  return (
    <>
      <article
        className="relative overflow-hidden rounded-[22px] p-4 text-white sm:p-5"
        style={{ backgroundColor: ownerTheme.accent }}
      >
        {/* Concentric rings — mobile parity (_RingsPainter), top-right only */}
        <svg
          className="pointer-events-none absolute -right-[85px] -top-[85px] h-[200px] w-[200px] opacity-[0.18]"
          viewBox="0 0 200 200"
          fill="none"
          aria-hidden
        >
          {[10, 36, 62, 88, 114].map((r) => (
            <circle
              key={r}
              cx="100"
              cy="100"
              r={r}
              stroke="#FFFFFF"
              strokeWidth="1.4"
            />
          ))}
        </svg>

        <div className="relative flex items-start justify-between gap-3">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/90">
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            {whenLabel}
          </div>
          <button
            type="button"
            onClick={() => setEditScopeOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white hover:bg-white/90"
            style={{ color: ownerTheme.accent }}
            aria-label="Edit session"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>

        <h2 className="relative mt-3 text-2xl font-medium leading-tight">
          {session.training?.name || 'Class'}
        </h2>
        <p className="relative mt-1.5 text-sm text-white/90">
          {formatOwnerTime24h(session.startsAt)}
          {session.endsAt ? ` - ${formatOwnerTime24h(session.endsAt)}` : ''}
          {session.trainer?.name ? ` · With ${session.trainer.name}` : ''}
        </p>

        <div className="relative mt-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative h-[54px] w-[54px]">
              <svg viewBox="0 0 54 54" className="h-full w-full -rotate-90">
                <circle
                  cx="27"
                  cy="27"
                  r="22"
                  fill="none"
                  stroke="rgba(255,255,255,0.25)"
                  strokeWidth="5"
                />
                <circle
                  cx="27"
                  cy="27"
                  r="22"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 22}`}
                  strokeDashoffset={`${2 * Math.PI * 22 * (1 - ratio)}`}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold">
                {pct}%
              </span>
            </div>
            <div className="text-sm">
              <div className="font-semibold">
                {enrolled}/{capacity || '—'}
              </div>
              <div className="text-white/80">booked</div>
            </div>
          </div>
          <Link
            href={href}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold"
            style={{ color: ownerTheme.accent }}
          >
            Show more
          </Link>
        </div>
      </article>

      <OwnerSessionEditScopeModal
        open={editScopeOpen}
        onClose={() => setEditScopeOpen(false)}
        onSelect={onPickEditScope}
      />
    </>
  );
}

export function OwnerDailyScheduleBlock({
  sessions,
  localePath,
  bookingLink,
}: {
  sessions: OwnerTrainingSession[];
  localePath: (path: string) => string;
  bookingLink?: string;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2
          className="text-[13px] font-semibold uppercase tracking-[0.06em]"
          style={{ color: ownerTheme.text }}
        >
          Daily schedule
        </h2>
        <Link
          href={localePath('/calendar')}
          className="text-[11px] font-semibold uppercase tracking-wide"
          style={{ color: ownerTheme.accent }}
        >
          See all ›
        </Link>
      </div>

      {sessions.length === 0 ? (
        <OwnerScheduleEmptyCard
          title="No bookings yet"
          subtitle="Share your booking link to start receiving clients."
          bookingLink={bookingLink}
        />
      ) : (
        <ul className="space-y-2.5">
          {sessions.map((s) => (
            <li key={s.sessionId}>
              <OwnerSessionCard
                session={s}
                href={localePath(`/calendar/session/${s.sessionId}`)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
