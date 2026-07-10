'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { StoreBadgeLinks } from '@/components/landing/storeBadgeLinks';
import type { OwnerTrainingSession, Studio } from '@/lib/owner/types';
import { formatSessionTime, isSameDay } from '@/lib/owner/session-utils';

type Props = {
  studio: Studio | null;
  sessions: OwnerTrainingSession[];
  locale: string;
};

export function OwnerDashboardSidebar({ studio, sessions, locale }: Props) {
  const [viewDate, setViewDate] = useState(() => new Date());
  const today = new Date();

  const monthLabel = viewDate.toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
  });

  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const first = new Date(year, month, 1);
    const startPad = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(new Date(year, month, d));
    }
    return cells;
  }, [viewDate]);

  const upcoming = useMemo(() => {
    const now = Date.now();
    return [...sessions]
      .filter((s) => new Date(s.startsAt).getTime() >= now)
      .sort(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      )
      .slice(0, 4);
  }, [sessions]);

  const sessionDays = useMemo(() => {
    const set = new Set<string>();
    for (const s of sessions) {
      const d = new Date(s.startsAt);
      set.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    }
    return set;
  }, [sessions]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EDE9F6] text-sm font-semibold text-[#3F3287]">
          {(studio?.name ?? 'S').charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#3F3F3F]">
            {studio?.name ?? 'Your studio'}
          </p>
          <p className="text-xs text-zinc-500">Owner</p>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-100 bg-[#FAFAFA] p-4">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() =>
              setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
            }
            className="rounded-lg p-1 hover:bg-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold">{monthLabel}</span>
          <button
            type="button"
            onClick={() =>
              setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
            }
            className="rounded-lg p-1 hover:bg-white"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-zinc-400">
          {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {calendarDays.map((day, i) => {
            if (!day) return <span key={`e-${i}`} />;
            const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
            const hasSession = sessionDays.has(key);
            const isToday = isSameDay(day, today);
            return (
              <span
                key={key}
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs ${
                  isToday
                    ? 'bg-[#FF6B4A] font-semibold text-white'
                    : hasSession
                      ? 'bg-[#EDE9F6] font-medium text-[#3F3287]'
                      : 'text-zinc-600'
                }`}
              >
                {day.getDate()}
              </span>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-[#3F3F3F]">
          Upcoming bookings
        </h3>
        {upcoming.length === 0 ? (
          <p className="text-xs text-zinc-500">No upcoming bookings</p>
        ) : (
          <ul className="space-y-3">
            {upcoming.map((s) => (
              <li key={s.sessionId} className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FAD0C5] text-xs font-semibold text-[#F15942]">
                  {(s.trainingName.charAt(0) || 'C').toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#3F3F3F]">
                    {s.trainingName}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {formatSessionTime(s.startsAt, locale)} · {s.enrolledCount}{' '}
                    enrolled
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-zinc-100 bg-[#FDF6F0] p-4">
        <p className="text-sm font-semibold text-[#3F3F3F]">Get the app</p>
        <p className="mt-1 text-xs text-zinc-500">
          Manage your studio on the go with Henzo mobile.
        </p>
        <StoreBadgeLinks
          className="mt-3 flex flex-col gap-2"
          buttonClassName="bg-white text-xs"
          appStoreLabel="App Store"
          googlePlayLabel="Google Play"
        />
      </div>
    </div>
  );
}
