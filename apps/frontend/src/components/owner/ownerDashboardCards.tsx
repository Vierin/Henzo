'use client';

import Link from 'next/link';
import { MapPin, Pencil } from 'lucide-react';
import type { OwnerTrainingSession } from '@/lib/owner/types';
import { ownerTheme } from '@/lib/owner/owner-theme';
import { formatOwnerTime24h } from '@/lib/owner/format-time';
import { OwnerSessionCard } from '@/components/owner/ownerSessionCard';

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

  return (
    <article
      className="relative overflow-hidden rounded-[22px] p-4 text-white sm:p-5"
      style={{ backgroundColor: ownerTheme.accent }}
    >
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full border-[18px] border-white/18"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-16 -left-8 h-36 w-36 rounded-full border-[14px] border-white/18"
        aria-hidden
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/90">
          <MapPin className="h-3.5 w-3.5" aria-hidden />
          {whenLabel}
        </div>
        <Link
          href={href}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 hover:bg-white/30"
          aria-label="Edit session"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Link>
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
  );
}

export function OwnerDailyScheduleBlock({
  sessions,
  localePath,
}: {
  sessions: OwnerTrainingSession[];
  localePath: (path: string) => string;
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
        <div className="rounded-[14px] bg-white px-4 py-8 text-center">
          <p className="font-medium" style={{ color: ownerTheme.text }}>
            No trainings today
          </p>
          <p
            className="mt-1 text-sm"
            style={{ color: ownerTheme.textSecondary }}
          >
            Enjoy your day!
          </p>
        </div>
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
