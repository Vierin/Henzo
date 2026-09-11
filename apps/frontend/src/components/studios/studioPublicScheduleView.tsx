'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { ClientHomeHeader } from '@/components/clientHome/clientHomeHeader';
import { OwnerCalendarDateModal } from '@/components/owner/ownerCalendarDateModal';
import { OwnerScheduleDateStrip } from '@/components/owner/ownerScheduleDateStrip';
import { PublicScheduleSessionCard } from '@/components/studios/publicScheduleSessionCard';
import {
  fetchPublicStudioScheduleClient,
  type PublicScheduleSession,
  type PublicStudioDetail,
} from '@/lib/client/fetch-studio-detail';
import {
  addDays,
  clampDay,
  sameDay,
  startOfToday,
} from '@/lib/owner/schedule-dates';
import type { Locale } from '@/i18n/routing';

type Props = {
  studio: PublicStudioDetail;
  initialSessions: PublicScheduleSession[];
  locale: Locale;
  studioSlug: string;
};

export function StudioPublicScheduleView({
  studio,
  initialSessions,
  locale,
  studioSlug,
}: Props) {
  const today = useMemo(() => startOfToday(), []);
  const maxDay = useMemo(
    () => addDays(today, Math.max(0, studio.bookingPeriodDays - 1)),
    [today, studio.bookingPeriodDays],
  );
  const [selected, setSelected] = useState(() => today);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [sessions, setSessions] = useState(initialSessions);
  const [loading, setLoading] = useState(initialSessions.length === 0);

  const studioHref = `/${locale}/studio/${encodeURIComponent(studioSlug)}`;

  useEffect(() => {
    let cancelled = false;
    const from = today;
    const to = addDays(maxDay, 0);
    to.setHours(23, 59, 59, 999);

    setLoading((prev) => prev || sessions.length === 0);
    fetchPublicStudioScheduleClient(studio.id, {
      from,
      to,
      limit: 500,
    }).then((next) => {
      if (cancelled) return;
      if (next.length > 0) setSessions(next);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [studio.id, today, maxDay]);

  const daySessions = useMemo(
    () => sessions.filter((s) => sameDay(new Date(s.startsAt), selected)),
    [sessions, selected],
  );

  const onSelectDay = (day: Date) => {
    setSelected(clampDay(day, today, maxDay));
  };

  const canPrevWeek =
    clampDay(addDays(selected, -7), today, maxDay).getTime() !==
    selected.getTime();
  const canNextWeek =
    clampDay(addDays(selected, 7), today, maxDay).getTime() !==
    selected.getTime();

  const shiftWeek = (dir: -1 | 1) => {
    onSelectDay(addDays(selected, dir * 7));
  };

  return (
    <div className="min-h-screen bg-[#F9F4F0] font-wix-madefor-display text-[#3F3F3F]">
      <ClientHomeHeader />

      <div className="mx-auto max-w-3xl px-4 pb-16 pt-5 sm:px-6 sm:pt-7">
        <div className="relative mb-1 grid grid-cols-[40px_1fr_40px] items-center">
          <Link
            href={studioHref}
            aria-label="Back to studio"
            className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-white text-[#3F3F3F] shadow-[0_1px_2px_rgba(63,63,63,0.06)] transition hover:bg-white/90"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
          </Link>
          <h1 className="text-center text-2xl font-medium tracking-tight text-[#1A1A1A]">
            Schedule
          </h1>
          <span aria-hidden />
        </div>

        <p className="mb-4 text-center text-sm capitalize text-[#878787]">
          {selected.toLocaleDateString(locale, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </p>

        <div className="mb-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCalendarOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-[12px] bg-white px-3.5 text-sm font-semibold text-[#3F3F3F]"
          >
            <CalendarDays className="h-4 w-4 text-[#E86D4F]" />
            Calendar
          </button>
          <button
            type="button"
            onClick={() => onSelectDay(today)}
            className="h-10 rounded-[12px] bg-white px-3.5 text-sm font-semibold text-[#3F3F3F]"
          >
            Today
          </button>

          <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              aria-label="Previous week"
              disabled={!canPrevWeek}
              onClick={() => shiftWeek(-1)}
              className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-white text-[#3F3F3F] transition disabled:opacity-30"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Next week"
              disabled={!canNextWeek}
              onClick={() => shiftWeek(1)}
              className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-white text-[#3F3F3F] transition disabled:opacity-30"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <OwnerScheduleDateStrip
          selected={selected}
          onSelect={onSelectDay}
          locale={locale}
          minDate={today}
          maxDate={maxDay}
        />

        <div className="mt-4">
          {loading ? (
            <p className="rounded-[14px] bg-white p-5 text-sm text-[#878787]">
              Loading…
            </p>
          ) : daySessions.length === 0 ? (
            <p className="rounded-[14px] bg-white p-5 text-sm text-[#878787]">
              No sessions this day.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {daySessions.map((session) => (
                <li key={session.id}>
                  <PublicScheduleSessionCard
                    session={session}
                    locale={locale}
                    currency={studio.currency}
                    studioId={studio.id}
                    studioName={studio.name}
                    timeSubLabel="duration"
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <OwnerCalendarDateModal
        open={calendarOpen}
        selected={selected}
        locale={locale}
        minDate={today}
        maxDate={maxDay}
        onClose={() => setCalendarOpen(false)}
        onSelect={onSelectDay}
      />
    </div>
  );
}
