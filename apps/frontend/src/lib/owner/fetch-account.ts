import { apiClient } from '@/lib/api-client';
import { getPublicSupabase } from '@/lib/supabase-public';

export type OwnerAccountProfile = {
  id: string;
  email: string;
  name: string;
  phone: string;
  avatarUrl: string | null;
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

export async function fetchOwnerAccountProfile(): Promise<OwnerAccountProfile | null> {
  const raw = await apiClient.get<unknown>('/auth/user');
  const root = asRecord(raw);
  const user = asRecord(root?.user) ?? root;
  if (!user?.id) return null;
  return {
    id: String(user.id),
    email: String(user.email ?? ''),
    name: String(user.name ?? '').trim(),
    phone: String(user.phone ?? '').trim(),
    avatarUrl: user.avatarUrl
      ? String(user.avatarUrl)
      : user.avatar_url
        ? String(user.avatar_url)
        : null,
  };
}

export async function updateOwnerAccountProfile(body: {
  name?: string;
  phone?: string;
  avatarUrl?: string;
}): Promise<void> {
  await apiClient.put('/auth/profile', body);
}

export async function deleteOwnerAccount(): Promise<void> {
  await apiClient.delete('/auth/account');
}

const STUDIO_PHOTOS_BUCKET = 'studio-photos';

/** Mobile parity: `owners/{uid}/avatar.webp` in studio-photos. */
export async function uploadOwnerAvatar(file: File): Promise<string> {
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
