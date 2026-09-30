'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { extractLocaleFromPath, withLocale, type Locale } from '@/i18n/routing';
import { useOwnerStudio } from '@/contexts/OwnerStudioContext';
import {
  dayBoundsIso,
  fetchOwnerSessions,
} from '@/lib/owner/fetch-owner-sessions';
import {
  addDays,
  formatWeekRangeLabel,
  mondayOf,
  sameDay,
  startOfToday,
  weekBoundsIso,
} from '@/lib/owner/schedule-dates';
import type { OwnerTrainingSession } from '@/lib/owner/types';
import { ownerTheme } from '@/lib/owner/owner-theme';
import { OwnerScheduleDateStrip } from '@/components/owner/ownerScheduleDateStrip';
import {
  OwnerSessionCard,
  OwnerScheduleEmptyCard,
} from '@/components/owner/ownerSessionCard';
import { OwnerCalendarWeekGrid } from '@/components/owner/ownerCalendarWeekGrid';
import { OwnerCalendarDateModal } from '@/components/owner/ownerCalendarDateModal';
import { OwnerCalendarSessionPanel } from '@/components/owner/ownerCalendarSessionPanel';

/** Nearest upcoming in list; else last past in week. */
function findNearestSession(
  sessions: OwnerTrainingSession[],
  anchor: Date = new Date(),
): OwnerTrainingSession | null {
  if (sessions.length === 0) return null;
  const t = anchor.getTime();
  const upcoming = sessions
    .filter((s) => new Date(s.endsAt).getTime() >= t)
    .sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );
  if (upcoming[0]) return upcoming[0];
  return [...sessions].sort(
    (a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime(),
  )[0]!;
}

function findNearestOnDay(
  sessions: OwnerTrainingSession[],
  day: Date,
): OwnerTrainingSession | null {
  const onDay = sessions.filter((s) => sameDay(new Date(s.startsAt), day));
  return findNearestSession(onDay, day);
}

export default function OwnerCalendarPage() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = (extractLocaleFromPath(pathname) ?? 'en') as Locale;
  const { studio } = useOwnerStudio();
  const path = (p: string) => withLocale(p, locale);

  const deepSessionId = searchParams.get('session')?.trim() || null;

  const [selected, setSelected] = useState(() => startOfToday());
  const [calendarOpen, setCalendarOpen] = useState(false);
  /** Manual pick from grid; null → show nearest automatically. */
  const [pickedSessionId, setPickedSessionId] = useState<string | null>(
    () => deepSessionId,
  );

  const dayBounds = useMemo(() => dayBoundsIso(selected), [selected]);
  const weekBounds = useMemo(() => weekBoundsIso(selected), [selected]);
  const weekStart = useMemo(() => mondayOf(selected), [selected]);

  const dayQuery = useQuery({
    queryKey: ['owner-sessions-day', dayBounds.from],
    queryFn: () => fetchOwnerSessions(dayBounds),
    enabled: Boolean(studio?.id),
  });

  const weekQuery = useQuery({
    queryKey: ['owner-sessions-week', weekBounds.from],
    queryFn: () => fetchOwnerSessions(weekBounds),
    enabled: Boolean(studio?.id),
  });

  const daySessions = dayQuery.data ?? [];
  const weekSessions = weekQuery.data ?? [];

  useEffect(() => {
    if (!deepSessionId) return;
    setPickedSessionId(deepSessionId);
  }, [deepSessionId]);

  useEffect(() => {
    if (!pickedSessionId) return;
    const found = weekSessions.find((s) => s.sessionId === pickedSessionId);
    if (found) {
      const day = new Date(found.startsAt);
      setSelected((prev) => (sameDay(prev, day) ? prev : day));
      return;
    }
    if (!weekQuery.isFetched) return;
    // Stale manual pick (not from deep link) — clear.
    if (deepSessionId !== pickedSessionId) {
      setPickedSessionId(null);
    }
  }, [pickedSessionId, weekSessions, weekQuery.isFetched, deepSessionId]);

  const nearestSession = useMemo(
    () => findNearestSession(weekSessions),
    [weekSessions],
  );

  const panelSession = useMemo(() => {
    if (pickedSessionId) {
      const found = weekSessions.find((s) => s.sessionId === pickedSessionId);
      if (found) return found;
    }
    return nearestSession;
  }, [pickedSessionId, weekSessions, nearestSession]);
  const weekLabel = formatWeekRangeLabel(weekStart, locale);

  const shiftWeek = (dir: -1 | 1) => {
    setSelected((d) => addDays(d, dir * 7));
    setPickedSessionId(null);
  };

  const goToday = () => {
    setSelected(startOfToday());
    setPickedSessionId(null);
  };

  return (
    <div className="relative space-y-4 pb-20 lg:space-y-5 lg:pb-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: ownerTheme.text }}
          >
            Schedule
          </h1>
          <p
            className="mt-1 text-sm capitalize lg:normal-case"
            style={{ color: ownerTheme.textSecondary }}
          >
            <span className="lg:hidden">
              {selected.toLocaleDateString(locale, {
                month: 'long',
                year: 'numeric',
              })}
            </span>
            <span className="hidden lg:inline">{weekLabel}</span>
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setCalendarOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-[12px] bg-white px-3 text-sm font-semibold lg:px-3.5"
            style={{ color: ownerTheme.text }}
          >
            <CalendarDays
              className="h-4 w-4"
              style={{ color: ownerTheme.accent }}
            />
            <span>Calendar</span>
          </button>
          <button
            type="button"
            onClick={goToday}
            className="h-10 rounded-[12px] bg-white px-3 text-sm font-semibold lg:px-3.5"
            style={{ color: ownerTheme.text }}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => shiftWeek(-1)}
            className="hidden h-10 w-10 items-center justify-center rounded-[12px] bg-white lg:flex"
            style={{ color: ownerTheme.text }}
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => shiftWeek(1)}
            className="hidden h-10 w-10 items-center justify-center rounded-[12px] bg-white lg:flex"
            style={{ color: ownerTheme.text }}
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <Link
            href={path('/trainings/new')}
            className="hidden h-10 items-center gap-1.5 rounded-[12px] px-4 text-sm font-semibold text-white lg:inline-flex"
            style={{ backgroundColor: ownerTheme.accent }}
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Add class
          </Link>
        </div>
      </div>

      <div className="lg:hidden">
        <OwnerScheduleDateStrip
          selected={selected}
          onSelect={setSelected}
          locale={locale}
        />

        <div className="mt-4">
          {dayQuery.isLoading ? (
            <p className="text-sm" style={{ color: ownerTheme.textSecondary }}>
              Loading…
            </p>
          ) : dayQuery.isError ? (
            <p className="text-sm text-red-600">Failed to load sessions</p>
          ) : daySessions.length === 0 ? (
            <OwnerScheduleEmptyCard title="No sessions this day" />
          ) : (
            <ul className="space-y-2.5">
              {daySessions.map((s) => (
                <li key={s.sessionId}>
                  <OwnerSessionCard
                    session={s}
                    href={path(`/calendar/session/${s.sessionId}`)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="hidden lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-4">
        <div className="min-w-0">
          {weekQuery.isLoading ? (
            <div
              className="rounded-[16px] bg-white px-4 py-16 text-center text-sm"
              style={{ color: ownerTheme.textSecondary }}
            >
              Loading week…
            </div>
          ) : weekQuery.isError ? (
            <p className="text-sm text-red-600">Failed to load sessions</p>
          ) : (
            <OwnerCalendarWeekGrid
              selected={selected}
              sessions={weekSessions}
              selectedSessionId={panelSession?.sessionId ?? null}
              locale={locale}
              onSelectDay={(d) => {
                setSelected(d);
                const onDay = findNearestOnDay(weekSessions, d);
                setPickedSessionId(onDay?.sessionId ?? null);
              }}
              onSelectSession={(s) => {
                setSelected(new Date(s.startsAt));
                setPickedSessionId(s.sessionId);
              }}
            />
          )}
        </div>

        {panelSession ? (
          <OwnerCalendarSessionPanel session={panelSession} localePath={path} />
        ) : (
          <div className="rounded-[16px] bg-white px-4 py-10 text-center">
            <p className="font-medium" style={{ color: ownerTheme.text }}>
              No classes this week
            </p>
            <p
              className="mt-1 text-sm"
              style={{ color: ownerTheme.textSecondary }}
            >
              Add a class or pick another week.
            </p>
            <Link
              href={path('/trainings/new')}
              className="mt-4 inline-flex rounded-[12px] px-4 py-2.5 text-sm font-semibold text-white"
              style={{ backgroundColor: ownerTheme.accent }}
            >
              Add class
            </Link>
          </div>
        )}
      </div>

      <Link
        href={path('/trainings/new')}
        aria-label="Add training"
        className="fixed bottom-6 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg transition-colors lg:hidden"
        style={{ backgroundColor: ownerTheme.accent }}
      >
        <Plus className="h-7 w-7" strokeWidth={2.25} />
      </Link>

      <OwnerCalendarDateModal
        open={calendarOpen}
        selected={selected}
        locale={locale}
        onClose={() => setCalendarOpen(false)}
        onSelect={(day) => {
          setSelected(day);
          setPickedSessionId(null);
        }}
      />
    </div>
  );
}
