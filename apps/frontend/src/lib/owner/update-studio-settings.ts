import { apiClient } from '@/lib/api-client';
import type { OwnerStudio } from './types';

export type UpdateCurrentStudioBody = {
  name: string;
  description?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  instagram?: string | null;
  logoUrl?: string | null;
  photos?: string[];
  photoGallery?: unknown[];
  workingHours?: unknown;
  autoConfirmBookings?: boolean;
  reminderSettings?: OwnerStudio['reminderSettings'];
};

export async function updateCurrentStudio(
  body: UpdateCurrentStudioBody,
): Promise<OwnerStudio> {
  const res = await apiClient.put<OwnerStudio | { data?: OwnerStudio }>(
    '/studios/current',
    body,
  );
  if (res && typeof res === 'object' && 'id' in res && res.id) {
    return res as OwnerStudio;
  }
  const nested = (res as { data?: OwnerStudio })?.data;
  if (nested?.id) return nested;
  // Backend may return void-ish — caller should refresh
  return body as unknown as OwnerStudio;
}

/** Build PUT payload preserving existing studio fields (mobile parity). */
export function studioUpdatePayload(
  studio: OwnerStudio,
  patch: Partial<UpdateCurrentStudioBody>,
): UpdateCurrentStudioBody {
  const lat = Number(studio.latitude);
  const lon = Number(studio.longitude);
  return {
    name: studio.name || '',
    description: studio.description ?? '',
    address: studio.address,
    ...(Number.isFinite(lat) ? { latitude: lat } : {}),
    ...(Number.isFinite(lon) ? { longitude: lon } : {}),
    phone: studio.phone,
    email: studio.email,
    website: studio.website,
    instagram: studio.instagram,
    logoUrl: studio.logoUrl ?? '',
    photos: Array.isArray(studio.photos) ? studio.photos : [],
    photoGallery: Array.isArray(studio.photoGallery)
      ? (studio.photoGallery as unknown[])
      : [],
    ...(studio.workingHours != null
      ? { workingHours: studio.workingHours }
      : {}),
    autoConfirmBookings:
      studio.autoConfirmBookings == null
        ? true
        : Boolean(studio.autoConfirmBookings),
    reminderSettings: studio.reminderSettings ?? undefined,
    ...patch,
  };
}
