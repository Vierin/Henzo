import type { OwnerTrainingSession } from './types';

export type SessionUiStatus = 'in_progress' | 'upcoming' | 'waitlist' | 'past';

export function getSessionUiStatus(
  session: OwnerTrainingSession,
  now = new Date(),
): SessionUiStatus {
  const start = new Date(session.startsAt);
  const end = new Date(session.endsAt);
  if (session.waitlistCount > 0 && session.enrolledCount >= session.capacity) {
    return 'waitlist';
  }
  if (now >= start && now <= end) return 'in_progress';
  if (now < start) return 'upcoming';
  return 'past';
}

export function formatSessionTime(iso: string, locale = 'en'): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatSessionDate(iso: string, locale = 'en'): string {
  const d = new Date(iso);
  return d.toLocaleDateString(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

export function toIsoUtc(d: Date): string {
  return d.toISOString();
}

export function enrollmentPercent(session: OwnerTrainingSession): number {
  if (!session.capacity) return 0;
  return Math.round((session.enrolledCount / session.capacity) * 100);
}
