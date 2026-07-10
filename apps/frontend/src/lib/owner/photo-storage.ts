import { supabase } from '@/lib/supabase';

const BUCKET = 'studio-photos';

export async function uploadOwnerPhoto(
  file: File,
  fileName: string,
): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) throw new Error('Not authenticated');

  const path = `owners/${user.id}/${fileName}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || 'image/webp',
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function adoptBackendSession(
  session: {
    access_token?: string;
    refresh_token?: string;
  } | null,
): Promise<void> {
  if (!session?.refresh_token) {
    if (session?.access_token) {
      await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token ?? '',
      });
    }
    return;
  }
  await supabase.auth.setSession({
    access_token: session.access_token ?? '',
    refresh_token: session.refresh_token,
  });
}
