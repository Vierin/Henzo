'use client';

import { useMemo, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ownerTheme } from '@/lib/owner/owner-theme';
import {
  addDays,
  clampDay,
  mondayOf,
  sameDay,
  startOfToday,
} from '@/lib/owner/schedule-dates';
import type { Locale } from '@/i18n/routing';

const PAST_WEEKS = 12;
const FUTURE_WEEKS = 26;
const SWIPE_THRESHOLD = 48;

type Props = {
  selected: Date;
  onSelect: (day: Date) => void;
  locale: Locale;
  /** Inclusive local-day bounds (e.g. booking window). */
  minDate?: Date | null;
  maxDate?: Date | null;
};

export function OwnerScheduleDateStrip({
  selected,
  onSelect,
  locale,
  minDate,
  maxDate,
}: Props) {
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    dragging: boolean;
  } | null>(null);
  const ignoreClickUntilRef = useRef(0);

  const today = useMemo(() => startOfToday(), []);
  const weekStart = useMemo(() => mondayOf(selected), [selected]);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const rangeMin = useMemo(
    () => (minDate ? addDays(minDate, 0) : null),
    [minDate],
  );
  const rangeMax = useMemo(
    () => (maxDate ? addDays(maxDate, 0) : null),
    [maxDate],
  );

  const minMonday = useMemo(() => {
    if (rangeMin) return mondayOf(rangeMin);
    return addDays(mondayOf(today), -PAST_WEEKS * 7);
  }, [rangeMin, today]);
  const maxMonday = useMemo(() => {
    if (rangeMax) return mondayOf(rangeMax);
    return addDays(mondayOf(today), FUTURE_WEEKS * 7);
  }, [rangeMax, today]);

  const canPrev = weekStart.getTime() > minMonday.getTime();
  const canNext = weekStart.getTime() < maxMonday.getTime();

  const isDisabled = (day: Date) => {
    if (rangeMin && day.getTime() < rangeMin.getTime()) return true;
    if (rangeMax && day.getTime() > rangeMax.getTime()) return true;
    return false;
  };

  const shiftWeek = (dir: -1 | 1) => {
    if (dir < 0 && !canPrev) return;
    if (dir > 0 && !canNext) return;
    const nextMonday = addDays(weekStart, dir * 7);
    if (nextMonday.getTime() < minMonday.getTime()) return;
    if (nextMonday.getTime() > maxMonday.getTime()) return;
    onSelect(clampDay(addDays(selected, dir * 7), rangeMin, rangeMax));
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      dragging: false,
    };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    if (Math.abs(e.clientX - drag.startX) > 10) {
      drag.dragging = true;
    }
  };

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.startX;
    const wasDragging = drag.dragging;
    dragRef.current = null;

    if (!wasDragging) return;

    ignoreClickUntilRef.current = Date.now() + 400;
    if (dx <= -SWIPE_THRESHOLD) shiftWeek(1);
    else if (dx >= SWIPE_THRESHOLD) shiftWeek(-1);
  };

  return (
    <div className="flex items-center gap-1.5 md:gap-2">
      <button
        type="button"
        aria-label="Previous week"
        disabled={!canPrev}
        onClick={() => shiftWeek(-1)}
        className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-white transition-colors disabled:opacity-30 md:inline-flex"
        style={{
          borderColor: ownerTheme.borderSoft,
          color: ownerTheme.text,
        }}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <div
        className="grid min-w-0 flex-1 touch-pan-y select-none grid-cols-7 gap-1.5 sm:gap-2"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {days.map((day) => {
          const active = sameDay(day, selected);
          const isToday = sameDay(day, today);
          const disabled = isDisabled(day);
          const iso = `${day.getFullYear()}-${day.getMonth() + 1}-${day.getDate()}`;
          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              onClick={() => {
                if (Date.now() < ignoreClickUntilRef.current) return;
                onSelect(clampDay(day, rangeMin, rangeMax));
              }}
              className={`flex min-w-0 flex-col items-center justify-center rounded-xl px-0.5 py-2.5 text-center transition-colors sm:px-1 disabled:cursor-not-allowed disabled:opacity-35 ${
                active ? 'text-white' : 'text-[#3F3F3F]'
              }`}
              style={{
                backgroundColor: active
                  ? ownerTheme.accent
                  : isToday
                    ? ownerTheme.statSalmon
                    : '#FFFFFF',
              }}
            >
              <div
                className={`text-[10px] uppercase tracking-wide ${
                  active ? 'text-white/85' : 'text-[#6B7280]'
                }`}
              >
                {day.toLocaleDateString(locale, { weekday: 'short' })}
              </div>
              <div className="text-base font-semibold leading-tight sm:text-lg">
                {day.getDate()}
              </div>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        aria-label="Next week"
        disabled={!canNext}
        onClick={() => shiftWeek(1)}
        className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-white transition-colors disabled:opacity-30 md:inline-flex"
        style={{
          borderColor: ownerTheme.borderSoft,
          color: ownerTheme.text,
        }}
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
