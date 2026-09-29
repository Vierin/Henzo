import type { PublicStudioPreview } from '@/lib/client/studio-preview';
import { formatBrowseDistrictCity } from '@/lib/client/format-browse-address';
import { parseStudioCurrency, type StudioCurrency } from '@/lib/format-money';

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
  price?: number;
  currency: StudioCurrency;
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
  if (!t || t === '-' || t === '—' || t === '\u2013' || t === '\u2014') {
    return true;
  }
  const lower = t.toLowerCase();
  return (
    lower === 'n/a' ||
    lower === 'tbd' ||
    lower === 'none' ||
    lower === 'henzo system studios'
  );
}

export function readPublicTrainerName(
  trainer: Record<string, unknown> | null,
  fallback?: unknown,
): string {
  const user = asRecord(trainer?.User) ?? asRecord(trainer?.user);
  const fromUser = String(user?.name ?? '').trim();
  const fromTrainer = String(trainer?.name ?? '').trim();
  const fromFallback = String(fallback ?? '').trim();
  const name = fromUser || fromTrainer || fromFallback;
  return isPlaceholderTrainer(name) ? '' : name;
}

/** Sessions with no trainer inherit the studio's only real trainer name. */
export function withSoleStudioTrainer(
  sessions: NearbyClassSession[],
): NearbyClassSession[] {
  const namesByStudio = new Map<string, Set<string>>();
  for (const session of sessions) {
    const name = session.trainerName.trim();
    if (!name) continue;
    const set = namesByStudio.get(session.studioId) ?? new Set<string>();
    set.add(name);
    namesByStudio.set(session.studioId, set);
  }

  const soleByStudio = new Map<string, string>();
  for (const [studioId, names] of namesByStudio) {
    if (names.size !== 1) continue;
    const only = [...names][0];
    if (only) soleByStudio.set(studioId, only);
  }

  return sessions.map((session) => {
    if (session.trainerName.trim()) return session;
    const sole = soleByStudio.get(session.studioId);
    return sole ? { ...session, trainerName: sole } : session;
  });
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

  const training = asRecord(map.training) ?? asRecord(map.Training);
  const trainer = asRecord(map.trainer) ?? asRecord(map.Trainer);
  const studioBlock = asRecord(map.studio) ?? asRecord(map.Studio);

  const sessionLocation = String(
    map.locationName ?? map.location_name ?? studioBlock?.locationName ?? '',
  ).trim();
  const studioLocation = String(studio.locationName ?? '').trim();
  const addressLabel = formatBrowseDistrictCity(studio.address) ?? '';
  // Prefer session branch name; else studio branch; else district/city.
  // Never fall back to studio name (duplicates class card title context).
  const locationName = sessionLocation || studioLocation || addressLabel;

  const endsAt = parseIso(map.endsAt);
  let durationMin = Number(training?.duration ?? 60) || 60;
  if (endsAt) {
    durationMin = Math.max(
      1,
      Math.round((endsAt.getTime() - startsAt.getTime()) / 60000),
    );
  }

  const trainerName = readPublicTrainerName(trainer, map.trainerName);
  const rawPrice = Number(map.price ?? training?.price ?? 0);
  const price =
    Number.isFinite(rawPrice) && rawPrice > 0 ? rawPrice : undefined;

  return {
    sessionId: String(map.id),
    studioId: studio.id,
    studioName: studio.studioName,
    className: String(training?.name ?? 'Class'),
    trainerName,
    locationName,
    startsAt: startsAt.toISOString(),
    durationMin,
    capacity,
    bookedCount,
    price,
    currency: parseStudioCurrency(studio.currency),
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
