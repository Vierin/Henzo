'use client';

import { maskHmInput, normalizeHm } from '@/lib/owner/add-training-date';

/** Always shows/edits 24h `HH:mm` — native `type="time"` follows OS locale (AM/PM). */
export function AdminTimeInput({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (hm: string) => void;
  className?: string;
}) {
  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      spellCheck={false}
      placeholder="09:00"
      title="24-hour time, e.g. 09:00 or 18:30"
      value={value}
      onChange={(e) => onChange(maskHmInput(e.target.value))}
      onBlur={() => onChange(normalizeHm(value))}
      className={className}
    />
  );
}

/** @deprecated use normalizeHm from `@/lib/owner/add-training-date` */
export function normalizeAdminHm(value: string): string {
  return normalizeHm(value);
}
