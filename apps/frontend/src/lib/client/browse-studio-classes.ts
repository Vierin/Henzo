import {
  resolvePopularStudiosApiBases,
  fetchPublicApiJson,
} from '@/lib/client/fetch-popular-studios';
import type { PublicStudioPreview } from '@/lib/client/studio-preview';
import { formatMoney, type StudioCurrency } from '@/lib/format-money';

export type BrowseClassItem = {
  sessionId: string;
  studioId: string;
  className: string;
  startsAt: string;
  price?: number;
  language?: string | null;
  trainingCategoryId?: number | null;
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

export function parseBrowseClassItem(
  row: unknown,
  studioId: string,
): BrowseClassItem | null {
  const map = asRecord(row);
  if (!map?.id) return null;

  const status = String(map.status ?? 'ACTIVE').toUpperCase();
  if (status !== 'ACTIVE' && status !== 'SCHEDULED') return null;

  const startsAtRaw = map.startsAt ?? map.starts_at;
  if (!startsAtRaw) return null;
  const startsAt = new Date(String(startsAtRaw));
  if (Number.isNaN(startsAt.getTime())) return null;

  const training = asRecord(map.training);
  const capacity = Number(map.capacity ?? 0);
  const booked = Number(map.bookedCount ?? map.enrolledCount ?? 0);
  if (capacity > 0 && booked >= capacity) return null;

  const langRaw = training?.language ?? map.language;
  const language =
    typeof langRaw === 'string' && langRaw.trim()
      ? langRaw.trim().toLowerCase()
      : null;

  const catId = training?.trainingCategoryId ?? training?.training_category_id;

  return {
    sessionId: String(map.id),
    studioId,
    className: String(training?.name ?? 'Class'),
    startsAt: startsAt.toISOString(),
    price: Number(training?.price ?? map.price ?? 0) || undefined,
    language,
    trainingCategoryId:
      typeof catId === 'number' ? catId : Number(catId) || null,
  };
}

async function fetchScheduleRows(
  studioId: string,
  from: string,
  to: string,
  clientSide: boolean,
): Promise<unknown[]> {
  const path = `/studios/${encodeURIComponent(studioId)}/schedule?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&limit=200`;

  if (!clientSide) {
    const raw = await fetchPublicApiJson(path, 60);
    return Array.isArray(raw) ? raw : [];
  }

  for (const base of resolvePopularStudiosApiBases()) {
    try {
      const res = await fetch(`${base}${path}`);
      if (!res.ok) continue;
      const raw = await res.json();
      return Array.isArray(raw) ? raw : [];
    } catch {
      // try next
    }
  }
  return [];
}

/** Today → +1 day window of upcoming classes per studio (mobile browse slot). */
export async function fetchBrowseClassesByStudio(
  studios: PublicStudioPreview[],
  options?: { clientSide?: boolean; limitStudios?: number },
): Promise<Map<string, BrowseClassItem[]>> {
  const clientSide = options?.clientSide ?? true;
  const limit = options?.limitStudios ?? 40;
  const list = studios.slice(0, limit);

  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + 1);

  const fromIso = from.toISOString();
  const toIso = to.toISOString();
  const now = Date.now() - 60_000;
  const out = new Map<string, BrowseClassItem[]>();
  const batchSize = 4;

  for (let i = 0; i < list.length; i += batchSize) {
    const batch = list.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (studio) => {
        const rows = await fetchScheduleRows(
          studio.id,
          fromIso,
          toIso,
          clientSide,
        );
        const items = rows
          .map((row) => parseBrowseClassItem(row, studio.id))
          .filter((x): x is BrowseClassItem => x != null)
          .filter((x) => new Date(x.startsAt).getTime() >= now)
          .sort(
            (a, b) =>
              new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
          );
        return { id: studio.id, items };
      }),
    );
    for (const { id, items } of results) {
      out.set(id, items);
    }
  }

  return out;
}

export function formatBrowseClassTime(iso: string, locale = 'en'): string {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

export function formatBrowseClassPrice(
  price?: number,
  currency: StudioCurrency = 'EUR',
): string {
  if (price == null || price <= 0) return '';
  return formatMoney(price, currency);
}
