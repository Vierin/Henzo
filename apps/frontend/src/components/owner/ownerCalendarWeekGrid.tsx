'use client';

import { useMemo } from 'react';
import type { OwnerTrainingSession } from '@/lib/owner/types';
import { ownerTheme } from '@/lib/owner/owner-theme';
import { formatOwnerTime24h } from '@/lib/owner/format-time';
import {
  mondayOf,
  sameDay,
  startOfToday,
  weekDays,
} from '@/lib/owner/schedule-dates';

const DEFAULT_HOUR_START = 8;
const DEFAULT_HOUR_END = 20; // exclusive upper bound → last row is 19:00
const HOUR_PX = 56;
const TIME_COL_W = 56;

function minutesSinceHourStart(d: Date, dayStartHour: number): number {
  return d.getHours() * 60 + d.getMinutes() - dayStartHour * 60;
}

export function OwnerCalendarWeekGrid({
  selected,
  sessions,
  selectedSessionId,
  locale,
  onSelectDay,
  onSelectSession,
}: {
  selected: Date;
  sessions: OwnerTrainingSession[];
  selectedSessionId: string | null;
  locale: string;
  onSelectDay: (day: Date) => void;
  onSelectSession: (session: OwnerTrainingSession) => void;
}) {
  const weekStart = useMemo(() => mondayOf(selected), [selected]);
  const days = useMemo(() => weekDays(weekStart), [weekStart]);
  const today = useMemo(() => startOfToday(), []);

  const { hourStart, hourEnd } = useMemo(() => {
    if (sessions.length === 0) {
      return { hourStart: DEFAULT_HOUR_START, hourEnd: DEFAULT_HOUR_END };
    }

    let earliestHour = 23;
    let latestEndExclusive = 0;
    for (const s of sessions) {
      const a = new Date(s.startsAt);
      const b = new Date(s.endsAt);
      earliestHour = Math.min(earliestHour, a.getHours());
      const endMins = b.getHours() * 60 + b.getMinutes();
      latestEndExclusive = Math.max(
        latestEndExclusive,
        Math.max(1, Math.ceil(endMins / 60)),
      );
    }

    return {
      // Default 08:00; expand upward only if something starts earlier
      hourStart: Math.max(0, Math.min(DEFAULT_HOUR_START, earliestHour)),
      // Default through 19:00 row; expand downward if something ends later
      hourEnd: Math.min(24, Math.max(DEFAULT_HOUR_END, latestEndExclusive)),
    };
  }, [sessions]);

  const hours = useMemo(() => {
    const list: number[] = [];
    for (let h = hourStart; h < hourEnd; h++) list.push(h);
    return list;
  }, [hourStart, hourEnd]);

  const gridHeight = hours.length * HOUR_PX;

  const sessionsByDay = useMemo(() => {
    const map = new Map<string, OwnerTrainingSession[]>();
    for (const day of days) {
      const key = day.toDateString();
      map.set(
        key,
        sessions.filter((s) => sameDay(new Date(s.startsAt), day)),
      );
    }
    return map;
  }, [days, sessions]);

  return (
    <div className="overflow-hidden rounded-[16px] bg-white">
      <div className="overflow-x-auto">
        <div
          className="min-w-[720px]"
          style={{
            display: 'grid',
            gridTemplateColumns: `${TIME_COL_W}px repeat(7, minmax(0, 1fr))`,
          }}
        >
          {/* Header */}
          <div />
          {days.map((day, dayIdx) => {
            const active = sameDay(day, selected);
            const isToday = sameDay(day, today);
            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => onSelectDay(day)}
                className={`border-b px-1 py-2.5 text-center transition ${
                  dayIdx === 0
                    ? 'border-[#F1E4DB]'
                    : 'border-l border-[#F1E4DB]'
                }`}
                style={{
                  backgroundColor: active
                    ? 'rgba(241, 89, 66, 0.08)'
                    : 'transparent',
                  boxShadow: active
                    ? `inset 0 2px 0 0 ${ownerTheme.accent}`
                    : undefined,
                }}
              >
                <div
                  className="text-[11px] font-semibold uppercase tracking-wide"
                  style={{
                    color: active
                      ? ownerTheme.accent
                      : ownerTheme.textSecondary,
                  }}
                >
                  {day.toLocaleDateString(locale, { weekday: 'short' })}
                </div>
                <div
                  className="mt-0.5 text-sm font-bold tabular-nums"
                  style={{
                    color: active
                      ? ownerTheme.accent
                      : isToday
                        ? ownerTheme.text
                        : ownerTheme.text,
                  }}
                >
                  {day.getDate()}
                </div>
              </button>
            );
          })}

          {/* Time + columns */}
          <div className="relative" style={{ height: gridHeight }}>
            {hours.map((h) => (
              <div
                key={h}
                className="absolute right-2 -translate-y-1/2 text-[11px] font-medium tabular-nums"
                style={{
                  top: (h - hourStart) * HOUR_PX,
                  color: ownerTheme.textSecondary,
                }}
              >
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {days.map((day, dayIdx) => {
            const active = sameDay(day, selected);
            const daySessions = sessionsByDay.get(day.toDateString()) ?? [];
            return (
              <div
                key={`col-${day.toISOString()}`}
                className={`relative ${dayIdx === 0 ? '' : 'border-l border-[#F1E4DB]'}`}
                style={{
                  height: gridHeight,
                  backgroundColor: active
                    ? 'rgba(241, 89, 66, 0.03)'
                    : 'transparent',
                }}
              >
                {hours.map((h, hourIdx) => (
                  <div
                    key={h}
                    className={`absolute left-0 right-0 ${hourIdx === 0 ? '' : 'border-t border-[#F8EDE5]'}`}
                    style={{ top: (h - hourStart) * HOUR_PX, height: HOUR_PX }}
                  />
                ))}

                {daySessions.map((s) => {
                  const start = new Date(s.startsAt);
                  const end = new Date(s.endsAt);
                  const topMin = minutesSinceHourStart(start, hourStart);
                  const durMin = Math.max(
                    30,
                    (end.getTime() - start.getTime()) / 60000,
                  );
                  const top = (topMin / 60) * HOUR_PX;
                  const height = Math.max(36, (durMin / 60) * HOUR_PX - 4);
                  const accent = s.training?.displayColor || ownerTheme.accent;
                  const selectedBlock = selectedSessionId === s.sessionId;
                  const capacity = s.capacity || 0;
                  const enrolled = s.enrolledCount || 0;

                  return (
                    <button
                      key={s.sessionId}
                      type="button"
                      onClick={() => {
                        onSelectDay(day);
                        onSelectSession(s);
                      }}
                      className="absolute left-1 right-1 z-[1] overflow-hidden rounded-[8px] bg-white text-left shadow-sm transition hover:shadow-md"
                      style={{
                        top: top + 2,
                        height,
                        outline: selectedBlock
                          ? `2px solid ${ownerTheme.accent}`
                          : '1px solid #F1E4DB',
                      }}
                    >
                      <span
                        className="absolute bottom-0 left-0 top-0 w-[3px]"
                        style={{ backgroundColor: accent }}
                        aria-hidden
                      />
                      <span className="block h-full overflow-hidden py-1.5 pl-2.5 pr-1.5">
                        <span
                          className="block truncate text-[12px] font-bold leading-tight"
                          style={{ color: ownerTheme.text }}
                        >
                          {s.training?.name || 'Class'}
                        </span>
                        {height >= 48 ? (
                          <span
                            className="mt-0.5 block truncate text-[10px] font-medium tabular-nums"
                            style={{ color: ownerTheme.textSecondary }}
                          >
                            {formatOwnerTime24h(s.startsAt)} –{' '}
                            {formatOwnerTime24h(s.endsAt)}
                          </span>
                        ) : null}
                        {height >= 64 ? (
                          <span
                            className="mt-1 block text-[10px] font-medium tabular-nums"
                            style={{ color: ownerTheme.text }}
                          >
                            {enrolled} / {capacity || '—'}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
