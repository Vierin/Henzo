/** Mobile `StudioPhotoAsset` parity for owner studio gallery. */

export type StudioPhotoCropRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type StudioPhotoAsset = {
  id: string;
  originalUrl: string;
  heroUrl: string;
  cardUrl: string;
  crops: {
    studioPage: StudioPhotoCropRect;
    browseCard: StudioPhotoCropRect;
  };
};

const FULL: StudioPhotoCropRect = { x: 0, y: 0, w: 1, h: 1 };

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function cropFrom(raw: unknown): StudioPhotoCropRect {
  const o = asRecord(raw);
  if (!o) return { ...FULL };
  const n = (k: string) => {
    const v = Number(o[k]);
    return Number.isFinite(v) ? v : 0;
  };
  return { x: n('x'), y: n('y'), w: n('w') || 1, h: n('h') || 1 };
}

export function studioPhotoAssetFromJson(
  raw: unknown,
): StudioPhotoAsset | null {
  const o = asRecord(raw);
  if (!o) return null;
  const id = String(o.id ?? '').trim();
  const originalUrl = String(o.originalUrl ?? '').trim();
  const heroUrl = String(o.heroUrl ?? '').trim();
  const cardUrl = String(o.cardUrl ?? '').trim();
  if (!id || !originalUrl || !heroUrl || !cardUrl) return null;
  const crops = asRecord(o.crops);
  return {
    id,
    originalUrl,
    heroUrl,
    cardUrl,
    crops: {
      studioPage: cropFrom(crops?.studioPage),
      browseCard: cropFrom(crops?.browseCard),
    },
  };
}

export function studioPhotoAssetLegacy(url: string): StudioPhotoAsset {
  const trimmed = url.trim();
  return {
    id: `legacy_${Math.abs(hashCode(trimmed))}`,
    originalUrl: trimmed,
    heroUrl: trimmed,
    cardUrl: trimmed,
    crops: { studioPage: { ...FULL }, browseCard: { ...FULL } },
  };
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++)
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

export function listStudioPhotoAssets(studio: {
  photoGallery?: unknown;
  photos?: string[] | null;
}): StudioPhotoAsset[] {
  const gallery = studio.photoGallery;
  if (Array.isArray(gallery) && gallery.length > 0) {
    const parsed = gallery
      .map(studioPhotoAssetFromJson)
      .filter((a): a is StudioPhotoAsset => a != null);
    if (parsed.length > 0) return parsed;
  }
  const photos = studio.photos;
  if (!Array.isArray(photos)) return [];
  return photos
    .map((u) => String(u ?? '').trim())
    .filter(Boolean)
    .map(studioPhotoAssetLegacy);
}

export function studioPhotoAssetToJson(asset: StudioPhotoAsset) {
  return {
    id: asset.id,
    originalUrl: asset.originalUrl,
    heroUrl: asset.heroUrl,
    cardUrl: asset.cardUrl,
    crops: {
      studioPage: asset.crops.studioPage,
      browseCard: asset.crops.browseCard,
    },
  };
}

export const STUDIO_GALLERY_MAX = 5;
