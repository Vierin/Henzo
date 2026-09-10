import { apiClient } from '@/lib/api-client';
import {
  parsePublicStudioPreview,
  type PublicStudioPreview,
} from '@/lib/client/studio-preview';

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

export async function fetchClientFavorites(): Promise<PublicStudioPreview[]> {
  const raw = await apiClient.get<unknown>('/auth/favorites');
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(asRecord(raw)?.favorites)
      ? (asRecord(raw)!.favorites as unknown[])
      : Array.isArray(asRecord(raw)?.data)
        ? (asRecord(raw)!.data as unknown[])
        : [];
  return list
    .map((item) => parsePublicStudioPreview(item))
    .filter((s): s is PublicStudioPreview => s != null);
}

export async function addFavoriteStudio(studioId: string): Promise<void> {
  await apiClient.post(`/auth/favorites/${encodeURIComponent(studioId)}`, {});
}

export async function removeFavoriteStudio(studioId: string): Promise<void> {
  await apiClient.delete(`/auth/favorites/${encodeURIComponent(studioId)}`);
}
