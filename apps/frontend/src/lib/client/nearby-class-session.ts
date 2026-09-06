import type { PublicStudioPreview } from '@/lib/client/studio-preview';

export type NearbyClassSession = {
  sessionId: string;
  studioId: string;
  studioName: string;
  className: string;
  trainerName: string;
  locationName: string;
  startsAt: string;
  durationMin: number;
  capacity: number;
  bookedCount: number;
  displayColorHex?: string;
  distanceKm?: number;
};

export type NearbyClassesDayGroup = {
  dayKey: string;
  label: string;
  classes: NearbyClassSession[];
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function parseIso(value: unknown): Date | null {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

function isPlaceholderTrainer(name: string): boolean {
  const t = name.trim();
  if (!t || t === '-' || t === '—') return true;
  const lower = t.toLowerCase();
  return lower === 'n/a' || lower === 'tbd' || lower === 'none';
}

export function parseNearbyClassSession(
  row: unknown,
  studio: PublicStudioPreview,
): NearbyClassSession | null {
  const map = asRecord(row);
  if (!map?.id) return null;

  const status = String(map.status ?? 'ACTIVE').toUpperCase();
  if (status !== 'ACTIVE') return null;

  const startsAt = parseIso(map.startsAt);
  if (!startsAt) return null;

  const capacity = Number(map.capacity ?? 0);
  const bookedCount = Number(map.bookedCount ?? map.enrolledCount ?? 0);
  if (capacity > 0 && bookedCount >= capacity) return null;

  const training = asRecord(map.training);
  const trainer = asRecord(map.trainer);
  const studioBlock = asRecord(map.studio);
  const locationRaw = String(
    map.locationName ?? studioBlock?.locationName ?? '',
  ).trim();

  const endsAt = parseIso(map.endsAt);
  let durationMin = Number(training?.duration ?? 60) || 60;
  if (endsAt) {
    durationMin = Math.max(
      1,
      Math.round((endsAt.getTime() - startsAt.getTime()) / 60000),
    );
  }

  const trainerName = String(trainer?.name ?? '').trim();
  const locationName = locationRaw || studio.studioName;

  return {
    sessionId: String(map.id),
    studioId: studio.id,
    studioName: studio.studioName,
    className: String(training?.name ?? 'Class'),
    trainerName: isPlaceholderTrainer(trainerName) ? '' : trainerName,
    locationName,
    startsAt: startsAt.toISOString(),
    durationMin,
    capacity,
    bookedCount,
    displayColorHex: training?.displayColor
      ? String(training.displayColor)
      : undefined,
    distanceKm: studio.distanceKm,
  };
}

export function formatClassStartTime(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

export function getCapacityProgress(
  bookedCount: number,
  capacity: number,
): { ratio: number; label: string; barColor: string } {
  if (capacity <= 0) {
    return {
      ratio: 0,
      label: String(bookedCount),
      barColor: '#E86D4F',
    };
  }
  const ratio = Math.min(1, bookedCount / capacity);
  let barColor = '#E86D4F';
  if (ratio < 0.5) barColor = '#E26152';
  else if (ratio < 1) barColor = '#B7D356';
  else barColor = '#3F3287';

  return {
    ratio,
    label: `${bookedCount}/${capacity}`,
    barColor,
  };
}

export function parseHexColor(hex?: string): string | null {
  if (!hex) return null;
  const cleaned = hex.trim().replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) return null;
  return `#${cleaned}`;
}
