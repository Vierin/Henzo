'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays } from 'lucide-react';
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

  return (
    <div className="min-h-screen bg-[#F9F4F0] font-wix-madefor-display text-[#3F3F3F]">
      <ClientHomeHeader />

      <div className="mx-auto max-w-3xl px-4 pb-16 pt-5 sm:px-6 sm:pt-7">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <Link
              href={studioHref}
              className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-[#E86D4F] hover:text-[#d85e42]"
            >
              <ArrowLeft className="h-4 w-4" />
              {studio.name}
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-[#1A1A1A]">
              Schedule
            </h1>
            <p className="mt-1 text-sm capitalize text-[#878787]">
              {selected.toLocaleDateString(locale, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>

          <div className="flex items-center gap-2">
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
