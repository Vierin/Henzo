'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { Locale } from '@/i18n/routing';
import { ownerTheme } from '@/lib/owner/owner-theme';
import { addDays, sameDay, startOfToday } from '@/lib/owner/schedule-dates';

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;

function monthCells(viewMonth: Date): (Date | null)[] {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const first = new Date(year, month, 1);
  const startPad = (first.getDay() + 6) % 7; // Mon=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(year, month, d));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function OwnerCalendarDateModal({
  open,
  selected,
  locale,
  onClose,
  onSelect,
  minDate,
  maxDate,
}: {
  open: boolean;
  selected: Date;
  locale: Locale;
  onClose: () => void;
  onSelect: (day: Date) => void;
  minDate?: Date | null;
  maxDate?: Date | null;
}) {
  const [viewMonth, setViewMonth] = useState(
    () => new Date(selected.getFullYear(), selected.getMonth(), 1),
  );
  const [draft, setDraft] = useState(selected);
  const today = useMemo(() => startOfToday(), []);
  const rangeMin = useMemo(
    () => (minDate ? addDays(minDate, 0) : null),
    [minDate],
  );
  const rangeMax = useMemo(
    () => (maxDate ? addDays(maxDate, 0) : null),
    [maxDate],
  );

  useEffect(() => {
    if (!open) return;
    setDraft(selected);
    setViewMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
  }, [open, selected]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const cells = useMemo(() => monthCells(viewMonth), [viewMonth]);
  const monthLabel = viewMonth
    .toLocaleDateString(locale, { month: 'long', year: 'numeric' })
    .toUpperCase();

  const isOutOfRange = (day: Date) => {
    if (rangeMin && day.getTime() < rangeMin.getTime()) return true;
    if (rangeMax && day.getTime() > rangeMax.getTime()) return true;
    return false;
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div
        className="relative z-10 w-full max-w-md rounded-t-[20px] bg-white p-5 shadow-xl sm:rounded-[20px]"
        role="dialog"
        aria-modal="true"
        aria-label="Pick a date"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold" style={{ color: ownerTheme.text }}>
            Calendar
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1"
            style={{ color: ownerTheme.textSecondary }}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            className="rounded-lg p-2"
            style={{ color: ownerTheme.textSecondary }}
            onClick={() =>
              setViewMonth(
                new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1),
              )
            }
            aria-label="Previous month"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="text-sm font-bold" style={{ color: ownerTheme.text }}>
            {monthLabel}
          </div>
          <button
            type="button"
            className="rounded-lg p-2"
            style={{ color: ownerTheme.textSecondary }}
            onClick={() =>
              setViewMonth(
                new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1),
              )
            }
            aria-label="Next month"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div
          className="rounded-[14px] px-2 pb-2 pt-3"
          style={{ backgroundColor: ownerTheme.bg }}
        >
          <div className="mb-2 grid grid-cols-7 gap-1">
            {DOW.map((d, i) => (
              <div
                key={`${d}-${i}`}
                className="text-center text-[11px] font-medium"
                style={{ color: ownerTheme.textSecondary }}
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {cells.map((day, i) => {
              if (!day) return <div key={`e-${i}`} />;
              const disabled = isOutOfRange(day);
              const isSelected = sameDay(day, draft);
              const isToday = sameDay(day, today);
              return (
                <button
                  key={`${day.getTime()}`}
                  type="button"
                  disabled={disabled}
                  onClick={() => setDraft(addDays(day, 0))}
                  className="aspect-square rounded-full text-sm font-medium disabled:cursor-not-allowed disabled:opacity-30"
                  style={{
                    backgroundColor: isSelected
                      ? ownerTheme.accent
                      : isToday
                        ? ownerTheme.statSalmon
                        : 'transparent',
                    color: isSelected ? '#FFFFFF' : ownerTheme.text,
                  }}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          className="mt-4 w-full rounded-[12px] py-3 text-[15px] font-bold text-white"
          style={{ backgroundColor: ownerTheme.accent }}
          onClick={() => {
            onSelect(draft);
            onClose();
          }}
        >
          Show week
        </button>
      </div>
    </div>
  );
}
