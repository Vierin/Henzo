'use client';

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
      onChange={(e) => {
        const next = e.target.value.replace(/[^\d:]/g, '').slice(0, 5);
        onChange(next);
      }}
      onBlur={() => onChange(normalizeAdminHm(value))}
      className={className}
    />
  );
}

export function normalizeAdminHm(value: string): string {
  const m = value.trim().match(/^(\d{1,2})(?::(\d{1,2}))?$/);
  if (!m) return '09:00';
  const h = Math.min(23, Math.max(0, Number(m[1])));
  const min = Math.min(59, Math.max(0, Number(m[2] ?? '0')));
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}
