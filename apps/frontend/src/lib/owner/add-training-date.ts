/** YYYY-MM-DD in local calendar. */
export function todayInputValue(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addMonthsInputValue(base: string, months: number): string {
  const [y, m, d] = base.split('-').map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  dt.setMonth(dt.getMonth() + months);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/** ISO weekday: Mon=1 … Sun=7 */
export function isoWeekdayFromDateInput(value: string): number {
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  const js = dt.getDay();
  return js === 0 ? 7 : js;
}

export function dateInputToApiDay(value: string): string {
  return `${value}T00:00:00.000`;
}

export function weeksCountInclusive(start: string, end: string): number {
  const [ys, ms, ds] = start.split('-').map(Number);
  const [ye, me, de] = end.split('-').map(Number);
  const a = new Date(ys, (ms ?? 1) - 1, ds ?? 1).getTime();
  const b = new Date(ye, (me ?? 1) - 1, de ?? 1).getTime();
  const days = Math.floor((b - a) / (24 * 60 * 60 * 1000)) + 1;
  return Math.min(26, Math.max(1, Math.ceil(days / 7)));
}

export function normalizeHm(value: string): string {
  const m = value.trim().match(/^(\d{1,2})(?::(\d{1,2}))?$/);
  if (!m) return '09:00';
  const h = Math.min(23, Math.max(0, Number(m[1])));
  const min = Math.min(59, Math.max(0, Number(m[2] ?? '0')));
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/** Digits-only `HH:mm` while typing — blocks values like `444:0`. */
export function maskHmInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (!digits) return '';

  const h0 = digits[0]!;
  // 3–9 → treat as 0N and continue into minutes
  if (Number(h0) > 2) {
    return appendMinutes(`0${h0}`, digits.slice(1));
  }

  if (digits.length === 1) return h0;

  let h1 = digits[1]!;
  if (Number(h0) === 2 && Number(h1) > 3) h1 = '3';
  const hour = `${h0}${h1}`;
  if (digits.length === 2) return hour;

  return appendMinutes(hour, digits.slice(2));
}

function appendMinutes(hour: string, minDigits: string): string {
  if (!minDigits) return `${hour}:`;
  let m0 = minDigits[0]!;
  if (Number(m0) > 5) m0 = '5';
  if (minDigits.length === 1) return `${hour}:${m0}`;
  const m1 = minDigits[1]!;
  const mm = `${m0}${m1}`;
  return Number(mm) > 59 ? `${hour}:59` : `${hour}:${mm}`;
}
