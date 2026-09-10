/** Shared Mon–Sun schedule date helpers (owner calendar / strip). */

export function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Monday 00:00 of the ISO week containing [day]. */
export function mondayOf(day: Date): Date {
  const d = addDays(day, 0);
  const js = d.getDay();
  const delta = js === 0 ? -6 : 1 - js;
  return addDays(d, delta);
}

export function weekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function dayBoundsIso(date: Date): { from: string; to: string } {
  const start = addDays(date, 0);
  const end = addDays(date, 0);
  end.setHours(23, 59, 59, 999);
  return { from: start.toISOString(), to: end.toISOString() };
}

export function weekBoundsIso(dayInWeek: Date): { from: string; to: string } {
  const start = mondayOf(dayInWeek);
  const end = addDays(start, 6);
  end.setHours(23, 59, 59, 999);
  return { from: start.toISOString(), to: end.toISOString() };
}

/** Clamp day into [min, max] inclusive (local calendar days). */
export function clampDay(
  day: Date,
  min?: Date | null,
  max?: Date | null,
): Date {
  let d = addDays(day, 0);
  if (min && d.getTime() < addDays(min, 0).getTime()) d = addDays(min, 0);
  if (max && d.getTime() > addDays(max, 0).getTime()) d = addDays(max, 0);
  return d;
}

export function formatWeekRangeLabel(weekStart: Date, locale: string): string {
  const end = addDays(weekStart, 6);
  const sameMonth = weekStart.getMonth() === end.getMonth();
  const sameYear = weekStart.getFullYear() === end.getFullYear();

  if (sameMonth) {
    const month = weekStart.toLocaleDateString(locale, { month: 'long' });
    return `${month} ${weekStart.getDate()} – ${end.getDate()}, ${weekStart.getFullYear()}`;
  }
  if (sameYear) {
    const left = weekStart.toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
    });
    const right = end.toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
    });
    return `${left} – ${right}, ${weekStart.getFullYear()}`;
  }
  const left = weekStart.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const right = end.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${left} – ${right}`;
}
