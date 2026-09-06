'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { extractLocaleFromPath, withLocale, type Locale } from '@/i18n/routing';
import { useOwnerStudio } from '@/contexts/OwnerStudioContext';
import {
  dayBoundsIso,
  fetchOwnerSessions,
} from '@/lib/owner/fetch-owner-sessions';

function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function OwnerCalendarPage() {
  const pathname = usePathname();
  const locale = (extractLocaleFromPath(pathname) ?? 'en') as Locale;
  const { studio } = useOwnerStudio();
  const [selected, setSelected] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const strip = useMemo(
    () => Array.from({ length: 14 }, (_, i) => addDays(new Date(), i - 3)),
    [],
  );

  const bounds = useMemo(() => dayBoundsIso(selected), [selected]);

  const sessionsQuery = useQuery({
    queryKey: ['owner-sessions-day', bounds.from],
    queryFn: () => fetchOwnerSessions(bounds),
    enabled: Boolean(studio?.id),
  });

  const sessions = sessionsQuery.data ?? [];

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Schedule</h1>
        <p className="text-sm text-gray-500 mt-1">
          Sessions for the selected day
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {strip.map((day) => {
          const active = sameDay(day, selected);
          return (
            <button
              key={day.toISOString()}
              onClick={() => {
                const next = new Date(day);
                next.setHours(0, 0, 0, 0);
                setSelected(next);
              }}
              className={`shrink-0 min-w-[64px] rounded-xl px-3 py-2 text-center border transition-colors ${
                active
                  ? 'bg-[#ea4b4b] text-white border-[#ea4b4b]'
                  : 'bg-white text-gray-700 border-gray-100 hover:border-[#ff5b5b]'
              }`}
            >
              <div className="text-[10px] uppercase opacity-80">
                {day.toLocaleDateString(locale, { weekday: 'short' })}
              </div>
              <div className="text-lg font-semibold leading-tight">
                {day.getDate()}
              </div>
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4">
        {sessionsQuery.isLoading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : sessionsQuery.isError ? (
          <p className="text-sm text-red-600">Failed to load sessions</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-gray-500">No sessions this day</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {sessions.map((s) => (
              <li key={s.sessionId}>
                <Link
                  href={withLocale(`/calendar/session/${s.sessionId}`, locale)}
                  className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-2 px-2 rounded-lg"
                >
                  <div>
                    <div className="font-medium">{s.training?.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {new Date(s.startsAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {' – '}
                      {new Date(s.endsAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {' · '}
                      {s.enrolledCount}/{s.capacity}
                      {s.locationName ? ` · ${s.locationName}` : ''}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">
                    {s.trainer?.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
