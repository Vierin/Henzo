import { getPublicSupabase } from '@/lib/supabase-public';
import type { StudioPhotoAsset } from './studio-photo-assets';

const BUCKET = 'studio-photos';
const MAX_BYTES = 3 * 1024 * 1024;
const MAX_SOURCE = MAX_BYTES * 8;

/** Match mobile `OwnerPhotoStorageService` edges. */
const AVATAR_MAX_EDGE = 512;
const GALLERY_MAX_EDGE = 1520;
const GALLERY_ORIGINAL_MAX_EDGE = 2400;

function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

async function resizeToBlob(
  file: File,
  maxEdge: number,
): Promise<{ blob: Blob; contentType: string }> {
  if (file.size > MAX_SOURCE) {
    throw new Error('Image is too large');
  }
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('Canvas unavailable');
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const toBlob = (type: string, q: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, q));

  let blob = await toBlob('image/webp', 0.82);
  let contentType = 'image/webp';
  if (!blob || blob.size === 0) {
    blob = await toBlob('image/jpeg', 0.85);
    contentType = 'image/jpeg';
  }
  if (!blob) throw new Error('Failed to encode image');
  if (blob.size > MAX_BYTES) {
    blob = await toBlob(contentType, 0.65);
    if (!blob || blob.size > MAX_BYTES) {
      throw new Error('Image is larger than 3 MB after compression');
    }
  }
  return { blob, contentType };
}

async function uploadPath(
  path: string,
  blob: Blob,
  contentType: string,
): Promise<string> {
  const supabase = getPublicSupabase();
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    upsert: true,
    contentType,
    cacheControl: '3600',
  });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const base = data.publicUrl.split('?')[0];
  return `${base}?v=${Date.now()}`;
}

async function ownerUid(): Promise<string> {
  const supabase = getPublicSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) throw new Error('Not signed in');
  return user.id;
}

/** Mobile: `owners/{uid}/logo.webp` */
export async function uploadStudioLogo(file: File): Promise<string> {
  const uid = await ownerUid();
  const { blob, contentType } = await resizeToBlob(file, AVATAR_MAX_EDGE);
  const ext = contentType === 'image/webp' ? 'webp' : 'jpg';
  return uploadPath(`owners/${uid}/logo.${ext}`, blob, contentType);
}

/** Mobile gallery asset: original + hero + card (same frame without crop UI). */
export async function uploadStudioGalleryAsset(
  file: File,
): Promise<StudioPhotoAsset> {
  const uid = await ownerUid();
  const photoId = `p_${randomId()}`;
  const original = await resizeToBlob(file, GALLERY_ORIGINAL_MAX_EDGE);
  const hero = await resizeToBlob(file, GALLERY_MAX_EDGE);
  const card = await resizeToBlob(file, GALLERY_MAX_EDGE);
  const ext = (ct: string) => (ct === 'image/webp' ? 'webp' : 'jpg');

  const [originalUrl, heroUrl, cardUrl] = await Promise.all([
    uploadPath(
      `owners/${uid}/gallery/${photoId}_original.${ext(original.contentType)}`,
      original.blob,
      original.contentType,
    ),
    uploadPath(
      `owners/${uid}/gallery/${photoId}_hero.${ext(hero.contentType)}`,
      hero.blob,
      hero.contentType,
    ),
    uploadPath(
      `owners/${uid}/gallery/${photoId}_card.${ext(card.contentType)}`,
      card.blob,
      card.contentType,
    ),
  ]);

  return {
    id: photoId,
    originalUrl,
    heroUrl,
    cardUrl,
    crops: {
      studioPage: { x: 0, y: 0, w: 1, h: 1 },
      browseCard: { x: 0, y: 0, w: 1, h: 1 },
    },
  };
}
