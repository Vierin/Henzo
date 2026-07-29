const dateTime24hFormatter = new Intl.DateTimeFormat('en-GB', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
  hourCycle: 'h23',
});

const dateOnlyFormatter = new Intl.DateTimeFormat('en-GB', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function formatAdminDateTime24h(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return dateTime24hFormatter.format(date);
}

export function formatAdminDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return dateOnlyFormatter.format(date);
}
