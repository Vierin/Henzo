'use client';

import { useMemo, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ownerTheme } from '@/lib/owner/owner-theme';
import type { Locale } from '@/i18n/routing';

function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Monday 00:00 of the ISO week containing [day]. */
function mondayOf(day: Date) {
  const d = addDays(day, 0);
  const js = d.getDay(); // Sun=0 … Sat=6
  const delta = js === 0 ? -6 : 1 - js;
  return addDays(d, delta);
}

const PAST_WEEKS = 12;
const FUTURE_WEEKS = 26;
const SWIPE_THRESHOLD = 48;

type Props = {
  selected: Date;
  onSelect: (day: Date) => void;
  locale: Locale;
};

export function OwnerScheduleDateStrip({ selected, onSelect, locale }: Props) {
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

  const minMonday = useMemo(
    () => addDays(mondayOf(today), -PAST_WEEKS * 7),
    [today],
  );
  const maxMonday = useMemo(
    () => addDays(mondayOf(today), FUTURE_WEEKS * 7),
    [today],
  );

  const canPrev = weekStart.getTime() > minMonday.getTime();
  const canNext = weekStart.getTime() < maxMonday.getTime();

  const shiftWeek = (dir: -1 | 1) => {
    if (dir < 0 && !canPrev) return;
    if (dir > 0 && !canNext) return;
    const nextMonday = addDays(weekStart, dir * 7);
    if (nextMonday.getTime() < minMonday.getTime()) return;
    if (nextMonday.getTime() > maxMonday.getTime()) return;
    // Keep weekday (Mon→Mon, Wed→Wed, …)
    onSelect(addDays(selected, dir * 7));
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
          const iso = `${day.getFullYear()}-${day.getMonth() + 1}-${day.getDate()}`;
          return (
            <button
              key={iso}
              type="button"
              onClick={() => {
                if (Date.now() < ignoreClickUntilRef.current) return;
                onSelect(addDays(day, 0));
              }}
              className={`flex min-w-0 flex-col items-center justify-center rounded-xl px-0.5 py-2.5 text-center transition-colors sm:px-1 ${
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
