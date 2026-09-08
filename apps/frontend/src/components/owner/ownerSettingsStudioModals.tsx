'use client';

import { useEffect, useState } from 'react';
import { Clock, Minus, Plus, X } from 'lucide-react';
import type { ClientReminderRule, OwnerStudio } from '@/lib/owner/types';
import { ownerTheme } from '@/lib/owner/owner-theme';
import { normalizeHm, maskHmInput } from '@/lib/owner/add-training-date';
import { apiClient } from '@/lib/api-client';
import type { OwnerAccountProfile } from '@/lib/owner/fetch-account';

export const DEFAULT_BOOKING_PERIOD_DAYS = 30;
export const MIN_BOOKING_PERIOD_DAYS = 1;
export const MAX_BOOKING_PERIOD_DAYS = 60;
export const MIN_REMINDER_HOURS = 1;
export const MAX_REMINDER_HOURS = 48;

export function extractBookingPeriodDays(studio: OwnerStudio | null): number {
  const raw = studio?.reminderSettings?.bookingPeriodDays;
  const n = Number(raw);
  if (Number.isFinite(n) && n >= MIN_BOOKING_PERIOD_DAYS) {
    return Math.min(MAX_BOOKING_PERIOD_DAYS, Math.floor(n));
  }
  return DEFAULT_BOOKING_PERIOD_DAYS;
}

export function extractClientReminders(
  studio: OwnerStudio | null,
): [ClientReminderRule, ClientReminderRule] {
  const evening: ClientReminderRule = {
    mode: 'eveningBefore',
    time: '20:00',
    enabled: true,
    hours: 1,
  };
  const hoursBefore: ClientReminderRule = {
    mode: 'hoursBefore',
    hours: 1,
    enabled: true,
    time: '20:00',
  };

  const raw = studio?.reminderSettings?.clientReminders;
  if (Array.isArray(raw)) {
    for (const e of raw) {
      if (!e || typeof e !== 'object') continue;
      if (e.mode === 'eveningBefore') {
        evening.enabled = e.enabled !== false;
        evening.time = normalizeHm(String(e.time ?? '20:00'));
      } else {
        hoursBefore.enabled = e.enabled !== false;
        const h = Number(e.hours);
        hoursBefore.hours = Number.isFinite(h)
          ? Math.min(MAX_REMINDER_HOURS, Math.max(MIN_REMINDER_HOURS, h))
          : 1;
      }
    }
  }
  return [evening, hoursBefore];
}

export function clientRemindersSummary(studio: OwnerStudio | null): string {
  const [evening, hoursBefore] = extractClientReminders(studio);
  const parts: string[] = [];
  if (evening.enabled) parts.push(normalizeHm(evening.time || '20:00'));
  if (hoursBefore.enabled) parts.push(`${hoursBefore.hours ?? 1}h`);
  return parts.length > 0 ? parts.join(', ') : 'Off';
}

function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
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
        aria-label={title}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold" style={{ color: ownerTheme.text }}>
            {title}
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
        {children}
      </div>
    </div>
  );
}

function Stepper({
  value,
  onChange,
  min,
  max,
  suffix,
}: {
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  suffix?: string;
}) {
  const [draft, setDraft] = useState(String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(String(value));
  }, [value, focused]);

  const commit = () => {
    setFocused(false);
    const n = Number.parseInt(draft.replace(/\D/g, ''), 10);
    if (!Number.isFinite(n)) {
      setDraft(String(value));
      return;
    }
    const clamped = Math.min(max, Math.max(min, n));
    setDraft(String(clamped));
    if (clamped !== value) onChange(clamped);
  };

  const btn =
    'flex h-11 w-11 items-center justify-center rounded-full border-2 disabled:opacity-40';
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        className={btn}
        style={{ borderColor: ownerTheme.accent, color: ownerTheme.accent }}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        aria-label="Decrease"
      >
        <Minus className="h-4 w-4" />
      </button>
      <div className="flex min-w-[88px] items-baseline justify-center gap-1">
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={draft}
          onFocus={() => setFocused(true)}
          onChange={(e) =>
            setDraft(e.target.value.replace(/\D/g, '').slice(0, 3))
          }
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur();
            }
          }}
          aria-label={suffix ? `Value in ${suffix}` : 'Value'}
          className="w-12 bg-transparent text-center text-xl font-semibold tabular-nums outline-none"
          style={{ color: ownerTheme.text }}
        />
        {suffix ? (
          <span
            className="text-sm font-medium"
            style={{ color: ownerTheme.textSecondary }}
          >
            {suffix}
          </span>
        ) : null}
      </div>
      <button
        type="button"
        className={btn}
        style={{ borderColor: ownerTheme.accent, color: ownerTheme.accent }}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        aria-label="Increase"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ToggleSwitch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className="relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50"
      style={{
        backgroundColor: checked ? ownerTheme.accent : '#D1D5DB',
      }}
    >
      <span
        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
          checked ? 'left-5' : 'left-0.5'
        }`}
      />
    </button>
  );
}

export function BookingPeriodModal({
  open,
  initialDays,
  saving,
  onClose,
  onSave,
}: {
  open: boolean;
  initialDays: number;
  saving: boolean;
  onClose: () => void;
  onSave: (days: number) => Promise<void>;
}) {
  const [days, setDays] = useState(initialDays);

  useEffect(() => {
    if (open) setDays(initialDays);
  }, [open, initialDays]);

  return (
    <Sheet open={open} title="Booking period" onClose={onClose}>
      <p className="mb-4 text-sm" style={{ color: ownerTheme.textSecondary }}>
        How far ahead clients can book classes (1–60 days).
      </p>
      <div className="flex justify-center py-2">
        <Stepper
          value={days}
          onChange={setDays}
          min={MIN_BOOKING_PERIOD_DAYS}
          max={MAX_BOOKING_PERIOD_DAYS}
          suffix="days"
        />
      </div>
      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="flex-1 rounded-[14px] bg-[#FCF3EC] py-3 text-sm font-semibold"
          style={{ color: ownerTheme.text }}
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void onSave(days)}
          className="flex-1 rounded-[14px] py-3 text-sm font-semibold text-white disabled:opacity-60"
          style={{ backgroundColor: ownerTheme.accent }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </Sheet>
  );
}

export function ClientNotificationsModal({
  open,
  studio,
  saving,
  onClose,
  onSave,
}: {
  open: boolean;
  studio: OwnerStudio | null;
  saving: boolean;
  onClose: () => void;
  onSave: (rules: ClientReminderRule[]) => Promise<void>;
}) {
  const [evening, setEvening] = useState<ClientReminderRule>({
    mode: 'eveningBefore',
    time: '20:00',
    enabled: true,
  });
  const [hoursBefore, setHoursBefore] = useState<ClientReminderRule>({
    mode: 'hoursBefore',
    hours: 1,
    enabled: true,
  });

  useEffect(() => {
    if (!open) return;
    const [e, h] = extractClientReminders(studio);
    setEvening({ ...e });
    setHoursBefore({ ...h });
  }, [open, studio]);

  return (
    <Sheet open={open} title="Client notifications" onClose={onClose}>
      <p className="mb-4 text-sm" style={{ color: ownerTheme.textSecondary }}>
        Reminders sent to clients before class.
      </p>

      <div
        className="mb-3 rounded-[14px] p-3.5"
        style={{ backgroundColor: ownerTheme.bg }}
      >
        <div className="flex items-center justify-between gap-3">
          <span
            className="text-sm font-bold"
            style={{ color: ownerTheme.text }}
          >
            Day before
          </span>
          <ToggleSwitch
            checked={Boolean(evening.enabled)}
            disabled={saving}
            onChange={(v) => setEvening((r) => ({ ...r, enabled: v }))}
          />
        </div>
        {evening.enabled ? (
          <label className="mt-3 block">
            <span
              className="mb-1 block text-xs font-medium"
              style={{ color: ownerTheme.textSecondary }}
            >
              Time (24h)
            </span>
            <span className="relative block">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                spellCheck={false}
                placeholder="20:00"
                title="24-hour time, e.g. 20:00"
                value={evening.time || '20:00'}
                onChange={(e) => {
                  setEvening((r) => ({
                    ...r,
                    time: maskHmInput(e.target.value),
                  }));
                }}
                onBlur={() =>
                  setEvening((r) => ({
                    ...r,
                    time: normalizeHm(r.time || '20:00'),
                  }))
                }
                className="w-full rounded-xl border-0 bg-white py-2.5 pl-3 pr-10 text-[15px] outline-none"
                style={{ color: ownerTheme.text }}
              />
              <Clock
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2"
                style={{ color: ownerTheme.text }}
                aria-hidden
              />
            </span>
          </label>
        ) : null}
      </div>

      <div
        className="mb-3 rounded-[14px] p-3.5"
        style={{ backgroundColor: ownerTheme.bg }}
      >
        <div className="flex items-center justify-between gap-3">
          <span
            className="text-sm font-bold"
            style={{ color: ownerTheme.text }}
          >
            Before class
          </span>
          <ToggleSwitch
            checked={Boolean(hoursBefore.enabled)}
            disabled={saving}
            onChange={(v) => setHoursBefore((r) => ({ ...r, enabled: v }))}
          />
        </div>
        {hoursBefore.enabled ? (
          <div className="mt-3 flex justify-center">
            <Stepper
              value={hoursBefore.hours ?? 1}
              onChange={(h) => setHoursBefore((r) => ({ ...r, hours: h }))}
              min={MIN_REMINDER_HOURS}
              max={MAX_REMINDER_HOURS}
              suffix="h"
            />
          </div>
        ) : null}
      </div>

      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="flex-1 rounded-[14px] bg-[#FCF3EC] py-3 text-sm font-semibold"
          style={{ color: ownerTheme.text }}
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() =>
            void onSave([
              {
                mode: 'eveningBefore',
                time: normalizeHm(evening.time || '20:00'),
                enabled: Boolean(evening.enabled),
              },
              {
                mode: 'hoursBefore',
                hours: hoursBefore.hours ?? 1,
                enabled: Boolean(hoursBefore.enabled),
              },
            ])
          }
          className="flex-1 rounded-[14px] py-3 text-sm font-semibold text-white disabled:opacity-60"
          style={{ backgroundColor: ownerTheme.accent }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </Sheet>
  );
}

const FEEDBACK_MIN = 10;
const FEEDBACK_MAX = 1000;

export function OwnerFeedbackModal({
  open,
  onClose,
  profile,
  copy,
}: {
  open: boolean;
  onClose: () => void;
  profile: OwnerAccountProfile | null;
  copy: {
    title: string;
    subtitle: string;
    placeholder: string;
    send: string;
    sending: string;
    tooShort: string;
    emailMissing: string;
    thankYou: string;
    failed: string;
  };
}) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMessage('');
    setError(null);
    setSuccess(false);
    setSending(false);
  }, [open]);

  const displayName = (() => {
    const name = profile?.name?.trim();
    if (name && name.length >= 2) return name;
    const email = profile?.email?.trim() ?? '';
    if (email.includes('@')) {
      const local = email.split('@')[0]?.trim() ?? '';
      if (local.length >= 2) return local;
    }
    return 'Henzo user';
  })();

  const onSubmit = async () => {
    const text = message.trim();
    if (text.length < FEEDBACK_MIN) {
      setError(copy.tooShort);
      return;
    }
    const email = profile?.email?.trim() ?? '';
    if (!email) {
      setError(copy.emailMissing);
      return;
    }

    setSending(true);
    setError(null);
    try {
      const body = [
        text.slice(0, FEEDBACK_MAX),
        '',
        '---',
        'Henzo web (owner panel)',
        profile?.id ? `User id: ${profile.id}` : null,
        'Role: owner',
      ]
        .filter(Boolean)
        .join('\n');

      await apiClient.post('/contact/feedback', {
        name: displayName,
        email,
        message: body,
        platform: 'web-owner',
      });
      setSuccess(true);
      setMessage('');
    } catch (e) {
      setError(e instanceof Error ? e.message : copy.failed);
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet open={open} title={copy.title} onClose={onClose}>
      <p className="mb-4 text-sm" style={{ color: ownerTheme.textSecondary }}>
        {copy.subtitle}
      </p>

      {success ? (
        <p
          className="mb-4 text-sm font-medium"
          style={{ color: ownerTheme.text }}
        >
          {copy.thankYou}
        </p>
      ) : (
        <>
          <textarea
            value={message}
            onChange={(e) => {
              setMessage(e.target.value.slice(0, FEEDBACK_MAX));
              if (error) setError(null);
            }}
            rows={5}
            placeholder={copy.placeholder}
            disabled={sending}
            className="w-full resize-none rounded-[14px] border-0 px-3.5 py-3 text-[15px] outline-none"
            style={{
              backgroundColor: ownerTheme.bg,
              color: ownerTheme.text,
            }}
          />
          {error ? (
            <p className="mt-2 text-sm font-medium text-red-600" role="alert">
              {error}
            </p>
          ) : null}
        </>
      )}

      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={sending}
          className="flex-1 rounded-[14px] bg-[#FCF3EC] py-3 text-sm font-semibold"
          style={{ color: ownerTheme.text }}
        >
          Close
        </button>
        {!success ? (
          <button
            type="button"
            disabled={sending}
            onClick={() => void onSubmit()}
            className="flex-1 rounded-[14px] py-3 text-sm font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: ownerTheme.accent }}
          >
            {sending ? copy.sending : copy.send}
          </button>
        ) : null}
      </div>
    </Sheet>
  );
}
