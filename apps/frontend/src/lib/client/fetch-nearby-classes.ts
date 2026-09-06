import {
  DEFAULT_LAT,
  DEFAULT_LNG,
  fetchPopularStudios,
  fetchPublicApiJson,
  resolvePopularStudiosApiBases,
} from '@/lib/client/fetch-popular-studios';
import {
  parseNearbyClassSession,
  type NearbyClassSession,
  type NearbyClassesDayGroup,
} from '@/lib/client/nearby-class-session';
import {
  extractStudiosListFromNearby,
  parsePublicStudioPreview,
  type PublicStudioPreview,
} from '@/lib/client/studio-preview';
import type { Locale } from '@/i18n/routing';

const STUDIO_SCAN_LIMIT = 16;
const BATCH_SIZE = 4;

function dayWindow(offset: number) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + offset);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return {
    key: start.toISOString().slice(0, 10),
    from: start.toISOString(),
    to: end.toISOString(),
    start,
  };
}

function formatDayLabel(
  date: Date,
  offset: number,
  locale: Locale,
  labels: { today: string; tomorrow: string },
): string {
  const datePart = new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
  }).format(date);

  if (offset === 0) return `${labels.today}, ${datePart}`;
  if (offset === 1) return `${labels.tomorrow}, ${datePart}`;
  return datePart;
}

async function fetchStudioSchedule(
  studioId: string,
  from: string,
  to: string,
): Promise<unknown[]> {
  const path = `/studios/${studioId}/schedule?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&limit=120`;
  const raw = await fetchPublicApiJson(path, 60);
  return Array.isArray(raw) ? raw : [];
}

async function fetchStudioScheduleClient(
  studioId: string,
  from: string,
  to: string,
): Promise<unknown[]> {
  const path = `/studios/${studioId}/schedule?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&limit=120`;

  for (const base of resolvePopularStudiosApiBases()) {
    try {
      const res = await fetch(`${base}${path}`);
      if (res.ok) {
        const raw = await res.json();
        return Array.isArray(raw) ? raw : [];
      }
    } catch {
      // try next base
    }
  }
  return [];
}

function collectSessionsForWindow(
  studios: PublicStudioPreview[],
  rowsByStudio: Map<string, unknown[]>,
  windowStart: Date,
  windowEnd: Date,
  now: Date,
): NearbyClassSession[] {
  const sessions: NearbyClassSession[] = [];

  for (const studio of studios) {
    const rows = rowsByStudio.get(studio.id) ?? [];
    for (const row of rows) {
      const session = parseNearbyClassSession(row, studio);
      if (!session) continue;

      const startsAt = new Date(session.startsAt);
      if (startsAt < windowStart || startsAt >= windowEnd) continue;
      if (startsAt < now) continue;

      sessions.push(session);
    }
  }

  sessions.sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );

  return sessions;
}

async function loadScheduleRows(
  studios: PublicStudioPreview[],
  from: string,
  to: string,
  clientSide: boolean,
): Promise<Map<string, unknown[]>> {
  const map = new Map<string, unknown[]>();
  const list = studios.slice(0, STUDIO_SCAN_LIMIT);

  for (let i = 0; i < list.length; i += BATCH_SIZE) {
    const batch = list.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (studio) => {
        const rows = clientSide
          ? await fetchStudioScheduleClient(studio.id, from, to)
          : await fetchStudioSchedule(studio.id, from, to);
        return { id: studio.id, rows };
      }),
    );
    for (const { id, rows } of results) {
      map.set(id, rows);
    }
  }

  return map;
}

export async function buildNearbyClassGroups(
  studios: PublicStudioPreview[],
  locale: Locale,
  labels: { today: string; tomorrow: string },
  clientSide = false,
): Promise<NearbyClassesDayGroup[]> {
  if (studios.length === 0) return [];

  const today = dayWindow(0);
  const tomorrow = dayWindow(1);
  const now = new Date();

  const rowsByStudio = await loadScheduleRows(
    studios,
    today.from,
    tomorrow.to,
    clientSide,
  );

  const groups: NearbyClassesDayGroup[] = [];

  for (const [offset, window] of [
    [0, today],
    [1, tomorrow],
  ] as const) {
    const classes = collectSessionsForWindow(
      studios,
      rowsByStudio,
      window.start,
      new Date(window.to),
      now,
    );

    if (classes.length === 0) continue;

    groups.push({
      dayKey: window.key,
      label: formatDayLabel(window.start, offset, locale, labels),
      classes,
    });
  }

  return groups;
}

export async function fetchNearbyClassGroups(
  locale: Locale,
  labels: { today: string; tomorrow: string },
): Promise<NearbyClassesDayGroup[]> {
  const studios = await fetchPopularStudios(STUDIO_SCAN_LIMIT);
  return buildNearbyClassGroups(studios, locale, labels, false);
}

export async function fetchNearbyClassGroupsClient(
  locale: Locale,
  labels: { today: string; tomorrow: string },
): Promise<NearbyClassesDayGroup[]> {
  const nearbyPath = `/studios/nearby?lat=${DEFAULT_LAT}&lng=${DEFAULT_LNG}&limit=${STUDIO_SCAN_LIMIT}&radius=50`;
  let studios: PublicStudioPreview[] = [];

  for (const base of resolvePopularStudiosApiBases()) {
    try {
      const nearbyRes = await fetch(`${base}${nearbyPath}`);
      if (nearbyRes.ok) {
        studios = extractStudiosListFromNearby(await nearbyRes.json())
          .map((item) => parsePublicStudioPreview(item))
          .filter((s): s is PublicStudioPreview => s != null);
        if (studios.length > 0) break;
      }

      const featuredRes = await fetch(
        `${base}/studios/featured?limit=${STUDIO_SCAN_LIMIT}`,
      );
      if (featuredRes.ok) {
        studios = extractStudiosListFromNearby(await featuredRes.json())
          .map((item) => parsePublicStudioPreview(item))
          .filter((s): s is PublicStudioPreview => s != null);
        if (studios.length > 0) break;
      }
    } catch {
      // try next base
    }
  }

  return buildNearbyClassGroups(studios, locale, labels, true);
}
