/** Share helpers for owner class sessions (mobile `ClassSessionLink` parity). */

export function buildClassShareUrl(params: {
  studioId: string;
  sessionId: string;
  startsAt: string;
  /** Absolute origin, e.g. `https://henzo.app` or `window.location.origin`. */
  origin: string;
  locale?: string;
}): string {
  const q = new URLSearchParams({
    studioId: params.studioId,
    sessionId: params.sessionId,
    startsAt: params.startsAt,
  });
  const locale = params.locale?.trim();
  const path = locale ? `/${locale}/class` : '/class';
  const base = params.origin.replace(/\/$/, '');
  return `${base}${path}?${q.toString()}`;
}

export function formatShareLocationBlock(params: {
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}): string {
  const label = params.address?.trim() ?? '';
  let mapsUrl: string | null = null;
  if (
    typeof params.latitude === 'number' &&
    typeof params.longitude === 'number' &&
    Number.isFinite(params.latitude) &&
    Number.isFinite(params.longitude)
  ) {
    mapsUrl = `https://www.google.com/maps/search/?api=1&query=${params.latitude},${params.longitude}`;
  } else if (label) {
    mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label)}`;
  }
  if (!mapsUrl) return '';
  if (label) return `📍 ${label}\n${mapsUrl}`;
  return `📍 ${mapsUrl}`;
}

export function buildOwnerSessionShareText(params: {
  trainingName: string;
  dateLine: string;
  timeLine: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  shareUrl?: string | null;
}): string {
  const lines = [
    params.trainingName.trim(),
    `📅 ${params.dateLine}`,
    `🕐 ${params.timeLine}`,
  ];
  const location = formatShareLocationBlock({
    address: params.address,
    latitude: params.latitude,
    longitude: params.longitude,
  });
  if (location) lines.push(location);
  if (params.shareUrl?.trim()) {
    lines.push('', '🔗 Join me on Henzo', params.shareUrl.trim());
  }
  return lines.join('\n').trim();
}

export async function shareOrCopyText(params: {
  title: string;
  text: string;
  url?: string;
}): Promise<'shared' | 'copied'> {
  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function'
  ) {
    try {
      await navigator.share({
        title: params.title,
        text: params.text,
        ...(params.url ? { url: params.url } : {}),
      });
      return 'shared';
    } catch (err) {
      // User cancel — don't fall through to copy.
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw err;
      }
    }
  }
  await navigator.clipboard.writeText(
    params.url ? `${params.text}\n${params.url}` : params.text,
  );
  return 'copied';
}
