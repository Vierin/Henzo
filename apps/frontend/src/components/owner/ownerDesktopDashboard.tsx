'use client';

import Link from 'next/link';
import {
  Bell,
  Building2,
  ChevronRight,
  Dumbbell,
  Plus,
  UserPlus,
  UserRound,
} from 'lucide-react';
import type {
  OwnerSessionEnrollment,
  OwnerTrainingSession,
} from '@/lib/owner/types';
import { ownerTheme } from '@/lib/owner/owner-theme';
import {
  formatOwnerTime24h,
  isPlaceholderTrainerName,
} from '@/lib/owner/format-time';
import { OwnerSessionCard } from '@/components/owner/ownerSessionCard';

export type DashboardNextBooking = {
  key: string;
  clientName: string;
  sessionId: string;
  startsAt: string;
  className: string;
  status: string;
};

function greetingPhrase(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function sessionStatus(session: OwnerTrainingSession): {
  label: string;
  bg: string;
  color: string;
} {
  const now = Date.now();
  const start = new Date(session.startsAt).getTime();
  const end = new Date(session.endsAt).getTime();
  if (session.status === 'COMPLETED' || end < now) {
    return { label: 'Done', bg: '#F3F4F6', color: '#6B7280' };
  }
  if (start <= now && now < end) {
    return { label: 'On going', bg: '#DCFCE7', color: '#166534' };
  }
  // Stable pastel by session id hash
  const palettes = [
    { bg: '#E0F2FE', color: '#0369A1' },
    { bg: '#F3E8FF', color: '#7E22CE' },
    { bg: '#FFEDD5', color: '#C2410C' },
    { bg: '#FCE7F3', color: '#BE185D' },
    { bg: '#FEF3C7', color: '#A16207' },
  ];
  let h = 0;
  for (let i = 0; i < session.sessionId.length; i++) {
    h = (h + session.sessionId.charCodeAt(i) * (i + 1)) % palettes.length;
  }
  return { label: 'Upcoming', ...palettes[h]! };
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}

function avatarTone(name: string): string {
  const tones = ['#FAD0C5', '#C2F600', '#F8EDE5', '#FEE2E2', '#E0E7FF'];
  let h = 0;
  for (let i = 0; i < name.length; i++)
    h = (h + name.charCodeAt(i)) % tones.length;
  return tones[h]!;
}

export function OwnerDashboardGreeting({
  locale,
  firstName,
}: {
  locale: string;
  firstName: string;
}) {
  const hour = new Date().getHours();
  return (
    <div>
      <p
        className="text-sm font-medium"
        style={{ color: ownerTheme.textSecondary }}
      >
        {new Intl.DateTimeFormat(locale, {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        }).format(new Date())}
      </p>
      <h1
        className="mt-1.5 text-[28px] font-bold leading-tight tracking-tight md:text-[32px]"
        style={{ color: ownerTheme.text }}
      >
        {greetingPhrase(hour)}, {firstName}
      </h1>
      <p
        className="mt-1.5 hidden text-sm lg:block"
        style={{ color: ownerTheme.textSecondary }}
      >
        Here&apos;s what&apos;s happening at your studio today.
      </p>
    </div>
  );
}

function DesktopScheduleRow({
  session,
  href,
}: {
  session: OwnerTrainingSession;
  href: string;
}) {
  const status = sessionStatus(session);
  const trainerRaw = session.trainer?.name?.trim() || '';
  const trainer = isPlaceholderTrainerName(trainerRaw) ? '' : trainerRaw;
  const capacity = session.capacity || 0;
  const enrolled = session.enrolledCount || 0;

  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-[#FFFCF9] sm:gap-4"
    >
      <div
        className="w-[5.5rem] shrink-0 text-sm font-semibold tabular-nums sm:w-28"
        style={{ color: ownerTheme.text }}
      >
        {formatOwnerTime24h(session.startsAt)}
        <span className="text-[#A4A4A4]"> – </span>
        {formatOwnerTime24h(session.endsAt)}
      </div>
      <div className="min-w-0 flex-1">
        <p
          className="truncate text-[15px] font-bold"
          style={{ color: ownerTheme.text }}
        >
          {session.training?.name || 'Class'}
        </p>
        <p
          className="mt-0.5 truncate text-sm"
          style={{ color: ownerTheme.textSecondary }}
        >
          {trainer || 'No trainer'}
        </p>
      </div>
      <div
        className="hidden items-center gap-1.5 text-sm font-medium tabular-nums sm:flex"
        style={{ color: ownerTheme.text }}
      >
        <UserRound
          className="h-3.5 w-3.5"
          style={{ color: ownerTheme.textSecondary }}
        />
        {enrolled} / {capacity || '—'}
      </div>
      <span
        className="hidden rounded-full px-2.5 py-1 text-xs font-semibold sm:inline-flex"
        style={{ backgroundColor: status.bg, color: status.color }}
      >
        {status.label}
      </span>
      <ChevronRight
        className="h-4 w-4 shrink-0"
        style={{ color: ownerTheme.textSecondary }}
      />
    </Link>
  );
}

export function OwnerDashboardSchedulePanel({
  sessions,
  localePath,
}: {
  sessions: OwnerTrainingSession[];
  localePath: (path: string) => string;
}) {
  return (
    <section className="overflow-hidden rounded-[16px] bg-white">
      <div className="flex items-center justify-between gap-2 px-4 py-3.5">
        <h2 className="text-base font-bold" style={{ color: ownerTheme.text }}>
          Today&apos;s schedule
        </h2>
        <Link
          href={localePath('/calendar')}
          className="text-sm font-semibold"
          style={{ color: ownerTheme.accent }}
        >
          See all ›
        </Link>
      </div>

      {sessions.length === 0 ? (
        <div className="px-4 pb-8 pt-2 text-center">
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
        <>
          {/* Desktop rows */}
          <ul className="hidden divide-y divide-[#F1E4DB] lg:block">
            {sessions.map((s) => (
              <li key={s.sessionId}>
                <DesktopScheduleRow
                  session={s}
                  href={localePath(`/calendar/session/${s.sessionId}`)}
                />
              </li>
            ))}
          </ul>
          {/* Mobile cards — existing style */}
          <ul className="space-y-2.5 px-3 pb-3 lg:hidden">
            {sessions.map((s) => (
              <li key={s.sessionId}>
                <OwnerSessionCard
                  session={s}
                  href={localePath(`/calendar/session/${s.sessionId}`)}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

export function OwnerDashboardViewStudioLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-[16px] bg-white px-4 py-3.5 transition hover:bg-[#FFFCF9]"
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
        style={{
          backgroundColor: 'rgba(241, 89, 66, 0.12)',
          color: ownerTheme.accent,
        }}
      >
        <Building2 className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className="block text-[15px] font-bold"
          style={{ color: ownerTheme.text }}
        >
          View studio
        </span>
        <span
          className="mt-0.5 block text-sm"
          style={{ color: ownerTheme.textSecondary }}
        >
          Check your studio details, location and settings
        </span>
      </span>
      <ChevronRight
        className="h-4 w-4 shrink-0"
        style={{ color: ownerTheme.textSecondary }}
      />
    </Link>
  );
}

export function OwnerDashboardNewClassButton({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="flex w-full items-center justify-center gap-2 rounded-[14px] py-3 text-sm font-semibold text-white transition hover:opacity-95"
      style={{ backgroundColor: ownerTheme.accent }}
    >
      <Plus className="h-4 w-4" strokeWidth={2.5} />
      New class
    </Link>
  );
}

export function OwnerDashboardSidebar({
  localePath,
  lastBookings,
}: {
  localePath: (path: string) => string;
  lastBookings: DashboardNextBooking[];
}) {
  const actions = [
    {
      label: 'Add new client',
      href: localePath('/clients'),
      icon: <UserPlus className="h-4 w-4" />,
    },
    {
      label: 'Create class',
      href: localePath('/trainings/new'),
      icon: <Dumbbell className="h-4 w-4" />,
    },
    {
      label: 'Client reminders',
      href: localePath('/salon-info'),
      icon: <Bell className="h-4 w-4" />,
    },
  ];

  return (
    <aside className="space-y-3">
      <div className="overflow-hidden rounded-[16px] bg-white">
        <h3
          className="px-4 pb-1 pt-3.5 text-base font-bold"
          style={{ color: ownerTheme.text }}
        >
          Quick actions
        </h3>
        <ul className="divide-y divide-[#F1E4DB]">
          {actions.map((a) => (
            <li key={a.label}>
              <Link
                href={a.href}
                className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-[#FFFCF9]"
              >
                <span style={{ color: ownerTheme.accent }}>{a.icon}</span>
                <span
                  className="min-w-0 flex-1 text-sm font-medium"
                  style={{ color: ownerTheme.text }}
                >
                  {a.label}
                </span>
                <ChevronRight
                  className="h-4 w-4"
                  style={{ color: ownerTheme.textSecondary }}
                />
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="overflow-hidden rounded-[16px] bg-white">
        <div className="flex items-center justify-between gap-2 px-4 pb-1 pt-3.5">
          <h3
            className="text-base font-bold"
            style={{ color: ownerTheme.text }}
          >
            Last bookings
          </h3>
          <Link
            href={localePath('/calendar')}
            className="text-sm font-semibold"
            style={{ color: ownerTheme.accent }}
          >
            See all ›
          </Link>
        </div>
        {lastBookings.length === 0 ? (
          <p
            className="px-4 py-6 text-sm"
            style={{ color: ownerTheme.textSecondary }}
          >
            No bookings yet.
          </p>
        ) : (
          <ul className="divide-y divide-[#F1E4DB]">
            {lastBookings.map((b) => (
              <li key={b.key}>
                <Link
                  href={localePath(`/calendar/session/${b.sessionId}`)}
                  className="flex items-center gap-3 px-4 py-3 transition hover:bg-[#FFFCF9]"
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                    style={{
                      backgroundColor: avatarTone(b.clientName),
                      color: ownerTheme.text,
                    }}
                  >
                    {initials(b.clientName)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className="block truncate text-sm font-bold"
                      style={{ color: ownerTheme.text }}
                    >
                      {b.clientName}
                    </span>
                    <span
                      className="mt-0.5 block truncate text-xs"
                      style={{ color: ownerTheme.textSecondary }}
                    >
                      {formatOwnerTime24h(b.startsAt)} · {b.className}
                    </span>
                  </span>
                  <span
                    className="shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold"
                    style={{
                      borderColor: '#86EFAC',
                      color: '#166534',
                      backgroundColor: '#F0FDF4',
                    }}
                  >
                    Confirmed
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

/** Most recent enrollments by createdAt (last bookings). */
export function buildLastBookings(
  sessions: OwnerTrainingSession[],
  bySessionId: Record<string, OwnerSessionEnrollment[]>,
  limit = 4,
): DashboardNextBooking[] {
  const sessionById = new Map(sessions.map((s) => [s.sessionId, s]));
  const rows: (DashboardNextBooking & { createdAtMs: number })[] = [];

  for (const [sessionId, enrollments] of Object.entries(bySessionId)) {
    const s = sessionById.get(sessionId);
    if (!s) continue;
    for (const e of enrollments) {
      const st = String(e.status || '').toUpperCase();
      if (st === 'CANCELLED' || st === 'NO_SHOW') continue;
      const clientName =
        e.user?.name?.trim() || e.user?.email?.split('@')[0] || 'Client';
      const createdAtMs = new Date(e.createdAt).getTime();
      rows.push({
        key: e.enrollmentId,
        clientName,
        sessionId: s.sessionId,
        startsAt: s.startsAt,
        className: s.training?.name || 'Class',
        status: e.status,
        createdAtMs: Number.isFinite(createdAtMs) ? createdAtMs : 0,
      });
    }
  }

  rows.sort((a, b) => b.createdAtMs - a.createdAtMs);
  return rows.slice(0, limit).map(({ createdAtMs: _, ...rest }) => rest);
}
