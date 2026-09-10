import {
  fetchPopularStudios,
  fetchPublicApiJson,
} from '@/lib/client/fetch-popular-studios';
import {
  parsePublicTrainingCategories,
  rankHomeCategoriesByStudioFill,
  type PublicTrainingCategory,
} from '@/lib/client/training-category';
import {
  extractStudiosListFromNearby,
  parsePublicStudioPreview,
  type PublicStudioPreview,
} from '@/lib/client/studio-preview';

async function loadRawCategories(): Promise<PublicTrainingCategory[]> {
  const raw = await fetchPublicApiJson('/trainings/categories', 300);
  return parsePublicTrainingCategories(raw);
}

/** All backend training categories (unsorted fill). */
export async function fetchTrainingCategories(): Promise<
  PublicTrainingCategory[]
> {
  return loadRawCategories();
}

/**
 * Homepage chips: same source as mobile (`/trainings/categories` + nearby
 * studio fill). Empty categories hidden; sorted most-filled → least.
 */
export async function fetchHomeTrainingCategories(
  studioLimit = 40,
): Promise<PublicTrainingCategory[]> {
  const [categories, studios] = await Promise.all([
    loadRawCategories(),
    fetchPopularStudios(studioLimit),
  ]);
  return rankHomeCategoriesByStudioFill(categories, studios);
}

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

export async function fetchHomeTrainingCategoriesClient(
  studioLimit = 40,
): Promise<PublicTrainingCategory[]> {
  const { resolvePopularStudiosApiBases, DEFAULT_LAT, DEFAULT_LNG } =
    await import('@/lib/client/fetch-popular-studios');

  for (const base of resolvePopularStudiosApiBases()) {
    try {
      const [catRes, nearbyRes, featuredRes] = await Promise.all([
        fetch(`${base}/trainings/categories`),
        fetch(
          `${base}/studios/nearby?lat=${DEFAULT_LAT}&lng=${DEFAULT_LNG}&limit=${studioLimit}&radius=50`,
        ),
        fetch(`${base}/studios/featured?limit=${studioLimit}`),
      ]);

      if (!catRes.ok) continue;
      const categories = parsePublicTrainingCategories(await catRes.json());
      if (categories.length === 0) continue;

      let studios: PublicStudioPreview[] = [];
      if (nearbyRes.ok) {
        studios = extractStudiosListFromNearby(await nearbyRes.json())
          .map((item) => parsePublicStudioPreview(item))
          .filter((s): s is PublicStudioPreview => s != null);
      }
      if (studios.length === 0 && featuredRes.ok) {
        studios = extractStudiosListFromNearby(await featuredRes.json())
          .map((item) => parsePublicStudioPreview(item))
          .filter((s): s is PublicStudioPreview => s != null);
      }

      return rankHomeCategoriesByStudioFill(categories, studios);
    } catch {
      // try next base
    }
  }

  return [];
}
