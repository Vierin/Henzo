import { apiClient } from '@/lib/api-client';

export type ClientProfileUser = {
  id: string;
  email: string;
  name?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  city?: string | null;
  country?: string | null;
  role: string;
};

export type ClientProfileStats = {
  classesVisited: number;
  hoursTrained: number;
  upcomingClasses: number;
  activePasses: number;
  reviewsLeft: number;
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

export async function fetchClientUser(): Promise<ClientProfileUser | null> {
  const raw = await apiClient.get<unknown>('/auth/user');
  const root = asRecord(raw);
  const user = asRecord(root?.user) ?? root;
  if (!user?.id) return null;
  return {
    id: String(user.id),
    email: String(user.email ?? ''),
    name: user.name ? String(user.name) : null,
    phone: user.phone ? String(user.phone) : null,
    avatarUrl: user.avatarUrl
      ? String(user.avatarUrl)
      : user.avatar_url
        ? String(user.avatar_url)
        : null,
    city: user.city ? String(user.city) : null,
    country: user.country ? String(user.country) : null,
    role: String(user.role ?? 'CLIENT'),
  };
}

export async function fetchClientProfileStats(): Promise<ClientProfileStats> {
  try {
    const raw = await apiClient.get<unknown>('/fitness/client/profile-stats');
    const m = asRecord(raw) ?? {};
    return {
      classesVisited: Number(m.classesVisited ?? m.classes_visited ?? 0) || 0,
      hoursTrained: Number(m.hoursTrained ?? m.hours_trained ?? 0) || 0,
      upcomingClasses:
        Number(m.upcomingClasses ?? m.upcoming_classes ?? 0) || 0,
      activePasses: Number(m.activePasses ?? m.active_passes ?? 0) || 0,
      reviewsLeft:
        Number(m.reviewsLeft ?? m.reviews_left ?? m.reviewsCount ?? 0) || 0,
    };
  } catch {
    return {
      classesVisited: 0,
      hoursTrained: 0,
      upcomingClasses: 0,
      activePasses: 0,
      reviewsLeft: 0,
    };
  }
}

export async function updateClientProfile(body: {
  name?: string;
  phone?: string;
  avatarUrl?: string | null;
}): Promise<void> {
  await apiClient.put('/auth/profile', body);
}

export async function deleteClientAccount(): Promise<void> {
  await apiClient.delete('/auth/account');
}

const STUDIO_PHOTOS_BUCKET = 'studio-photos';

/** Same path as mobile `uploadProfileAvatar`: `owners/{uid}/avatar.webp`. */
export async function uploadClientAvatar(file: File): Promise<string> {
  const { getPublicSupabase } = await import('@/lib/supabase-public');
  const supabase = getPublicSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) throw new Error('Not signed in');

  const path = `owners/${user.id}/avatar.webp`;
  const { error } = await supabase.storage
    .from(STUDIO_PHOTOS_BUCKET)
    .upload(path, file, {
      upsert: true,
      contentType: file.type || 'image/jpeg',
      cacheControl: '3600',
    });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage
    .from(STUDIO_PHOTOS_BUCKET)
    .getPublicUrl(path);
  const base = data.publicUrl.split('?')[0];
  return `${base}?v=${Date.now()}`;
}

export async function submitStudioReview(
  studioId: string,
  body: { rating: number; comment?: string; enrollmentId?: string },
): Promise<void> {
  await apiClient.post(
    `/studios/${encodeURIComponent(studioId)}/reviews`,
    body,
  );
}
