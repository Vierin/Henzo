/** Owner business panel — always 24h clock. */

const time24 = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  hourCycle: 'h23',
});

const dateShort = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
});

export function formatOwnerTime24h(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return time24.format(d);
}

/** `12.11.26` */
export function formatOwnerDateShort(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return dateShort.format(d).replace(/\//g, '.');
}

export function formatOwnerDateTime24h(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return `${formatOwnerDateShort(d)} ${formatOwnerTime24h(d)}`;
}

export function trainingLanguageLabel(code: string | null | undefined): string {
  const c = (code ?? '').trim().toLowerCase();
  if (!c) return '';
  if (c === 'en') return 'English';
  if (c === 'ru') return 'Русский';
  if (c === 'vi') return 'Tiếng Việt';
  if (c === 'es') return 'Español';
  return code!.trim();
}

export function isPlaceholderTrainerName(value: string | null | undefined) {
  const t = (value ?? '').trim();
  if (!t) return true;
  if (t === '-' || t === '—' || t === '–') return true;
  const lower = t.toLowerCase();
  return lower === 'n/a' || lower === 'tbd' || lower === 'none';
}
