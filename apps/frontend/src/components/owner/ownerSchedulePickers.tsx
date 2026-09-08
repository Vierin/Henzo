'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { ownerTheme } from '@/lib/owner/owner-theme';
import type { Locale } from '@/i18n/routing';
import { normalizeHm } from '@/lib/owner/add-training-date';

function parseYmd(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function monthCells(monthFirst: Date): (Date | null)[] {
  const y = monthFirst.getFullYear();
  const m = monthFirst.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const startOffset = (new Date(y, m, 1).getDay() + 6) % 7; // Mon=0
  const total = Math.ceil((startOffset + daysInMonth) / 7) * 7;
  return Array.from({ length: total }, (_, i) => {
    const dayNum = i - startOffset + 1;
    if (dayNum < 1 || dayNum > daysInMonth) return null;
    return new Date(y, m, dayNum);
  });
}

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, i) =>
  String(i * 5).padStart(2, '0'),
);

function SheetShell({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div
        className="relative z-10 w-full max-w-md rounded-t-[20px] bg-[#FCF3EC] p-4 pb-6 shadow-xl sm:rounded-[20px]"
        role="dialog"
        aria-modal="true"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#E5E7EB] sm:hidden" />
        {children}
      </div>
    </div>
  );
}

function TriggerButton({
  value,
  onClick,
  ariaLabel,
}: {
  value: string;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className="owner-field flex w-full items-center justify-between rounded-xl border-0 bg-white px-3.5 py-3 text-left text-[15px] outline-none"
      style={{
        color: ownerTheme.text,
      }}
    >
      <span>{value}</span>
      <ChevronDown className="h-4 w-4 shrink-0" style={{ color: '#6C5CE7' }} />
    </button>
  );
}

export function OwnerDateField({
  value,
  onChange,
  locale,
  min,
  max,
  label,
}: {
  value: string;
  onChange: (ymd: string) => void;
  locale: Locale;
  min?: string;
  max?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = parseYmd(value);
  const [viewMonth, setViewMonth] = useState(
    () => new Date(selected.getFullYear(), selected.getMonth(), 1),
  );
  const [draft, setDraft] = useState(selected);

  useEffect(() => {
    if (!open) return;
    const d = parseYmd(value);
    setDraft(d);
    setViewMonth(new Date(d.getFullYear(), d.getMonth(), 1));
  }, [open, value]);

  const cells = useMemo(() => monthCells(viewMonth), [viewMonth]);
  const minDate = min ? parseYmd(min) : null;
  const maxDate = max ? parseYmd(max) : null;
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const display = (() => {
    const dd = String(selected.getDate()).padStart(2, '0');
    const mm = String(selected.getMonth() + 1).padStart(2, '0');
    const yy = String(selected.getFullYear()).slice(-2);
    return `${dd}.${mm}.${yy}`;
  })();

  const monthLabel = viewMonth
    .toLocaleDateString(locale, { month: 'long', year: 'numeric' })
    .toUpperCase();

  const canPick = (d: Date) => {
    if (minDate && d < minDate) return false;
    if (maxDate && d > maxDate) return false;
    return true;
  };

  return (
    <div className="min-w-0">
      {label ? (
        <span
          className="mb-1.5 block text-[13px] font-medium"
          style={{ color: ownerTheme.textSecondary }}
        >
          {label}
        </span>
      ) : null}
      <TriggerButton
        value={display}
        ariaLabel={label || 'Pick date'}
        onClick={() => setOpen(true)}
      />
      <SheetShell open={open} onClose={() => setOpen(false)}>
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
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div
            className="text-sm font-bold tracking-tight"
            style={{ color: ownerTheme.text }}
          >
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
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>

        <div className="rounded-[14px] bg-white px-3 pb-2 pt-3">
          <div className="mb-2 grid grid-cols-7 gap-1">
            {DOW.map((d) => (
              <div
                key={d}
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
              const enabled = canPick(day);
              const isSelected = sameDay(day, draft);
              const isToday = sameDay(day, today);
              return (
                <button
                  key={toYmd(day)}
                  type="button"
                  disabled={!enabled}
                  onClick={() => setDraft(day)}
                  className="aspect-square rounded-full text-sm font-medium disabled:opacity-30"
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
          className="mt-4 w-full rounded-[12px] py-3.5 text-[15px] font-bold text-white"
          style={{ backgroundColor: ownerTheme.accent }}
          onClick={() => {
            onChange(toYmd(draft));
            setOpen(false);
          }}
        >
          Done
        </button>
      </SheetShell>
    </div>
  );
}

function snapMinute(mm: string): string {
  const m = Number(mm);
  if (!Number.isFinite(m)) return '00';
  const snapped = Math.round(m / 5) * 5;
  return String(Math.min(55, Math.max(0, snapped))).padStart(2, '0');
}

export function OwnerTimeField({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (hm: string) => void;
  label?: string;
}) {
  const hm = normalizeHm(value);
  const hour = hm.slice(0, 2);
  const minute = snapMinute(hm.slice(3, 5));

  const selectClass =
    'cursor-pointer appearance-none rounded-lg bg-transparent py-1 pl-1 pr-5 text-[15px] font-semibold tabular-nums outline-none';

  return (
    <div className="min-w-0">
      {label ? (
        <span
          className="mb-1.5 block text-[13px] font-medium"
          style={{ color: ownerTheme.textSecondary }}
        >
          {label}
        </span>
      ) : null}
      <div
        className="owner-field flex w-full items-center justify-between rounded-xl border-0 bg-white px-3.5 py-3"
        style={{ color: ownerTheme.text }}
      >
        <div className="flex items-center gap-1">
          <label className="relative">
            <select
              aria-label="Hour"
              value={hour}
              onChange={(e) => onChange(`${e.target.value}:${minute}`)}
              className={selectClass}
              style={{ color: ownerTheme.text }}
            >
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
              style={{ color: '#6C5CE7' }}
            />
          </label>
          <span className="text-[15px] font-semibold">:</span>
          <label className="relative">
            <select
              aria-label="Minute"
              value={minute}
              onChange={(e) => onChange(`${hour}:${e.target.value}`)}
              className={selectClass}
              style={{ color: ownerTheme.text }}
            >
              {MINUTES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
              style={{ color: '#6C5CE7' }}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
