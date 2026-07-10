import { fetchPublicApiJson } from '@/lib/client/fetch-popular-studios';
import {
  parsePublicTrainingCategories,
  type PublicTrainingCategory,
} from '@/lib/client/training-category';

/** Server-side fetch (RSC). */
export async function fetchTrainingCategories(): Promise<
  PublicTrainingCategory[]
> {
  const raw = await fetchPublicApiJson('/trainings/categories', 300);
  return parsePublicTrainingCategories(raw);
}

/** Client-side fetch fallback when SSR returned no categories. */
export async function fetchTrainingCategoriesClient(): Promise<
  PublicTrainingCategory[]
> {
  const { resolvePopularStudiosApiBases } = await import(
    '@/lib/client/fetch-popular-studios'
  );

  for (const base of resolvePopularStudiosApiBases()) {
    try {
      const res = await fetch(`${base}/trainings/categories`);
      if (!res.ok) continue;
      const categories = parsePublicTrainingCategories(await res.json());
      if (categories.length > 0) return categories;
    } catch {
      // try next base
    }
  }

  return [];
}
