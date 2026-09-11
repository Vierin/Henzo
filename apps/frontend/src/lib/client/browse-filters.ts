import type { BrowseClassItem } from '@/lib/client/browse-studio-classes';
import type { PublicStudioPreview } from '@/lib/client/studio-preview';
import type { PublicTrainingCategory } from '@/lib/client/training-category';

/** Mobile Distance chip → API radius km */
export type BrowseDistanceFilter = 'auto' | '5' | '10' | '15' | '30+';
export type BrowseSortBy = 'recommended' | 'ratings' | 'distance';
export type BrowseTimePeriod = 'morning' | 'afternoon' | 'evening';

export const BROWSE_DISTANCE_OPTIONS: {
  value: BrowseDistanceFilter;
  label: string;
}[] = [
  { value: 'auto', label: 'Auto (20 km)' },
  { value: '5', label: '5 km' },
  { value: '10', label: '10 km' },
  { value: '15', label: '15 km' },
  { value: '30+', label: '30+ km' },
];

export const BROWSE_SORT_OPTIONS: { value: BrowseSortBy; label: string }[] = [
  { value: 'recommended', label: 'Recommended for you' },
  { value: 'ratings', label: 'Ratings' },
  { value: 'distance', label: 'Nearest to farthest' },
];

export const BROWSE_TIME_PERIODS: {
  value: BrowseTimePeriod;
  label: string;
}[] = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
];

export const BROWSE_LANGUAGES: { value: string; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'ru', label: 'Русский' },
  { value: 'vi', label: 'Tiếng Việt' },
];

export function distanceFilterToRadiusKm(filter: BrowseDistanceFilter): number {
  switch (filter) {
    case '5':
      return 5;
    case '10':
      return 10;
    case '15':
      return 15;
    case '30+':
      return 50;
    case 'auto':
    default:
      return 20;
  }
}

/** Matches mobile `ClientExploreDerivedLists.activeFilterCount`. */
export function countActiveBrowseFilters(opts: {
  selectedCategoryId: number | null;
  languages: Set<string>;
  timePeriods: Set<BrowseTimePeriod>;
  distance: BrowseDistanceFilter;
  sortBy: BrowseSortBy;
  /** When true, category is page-scoped and not counted as a user filter. */
  ignoreCategory?: boolean;
}): number {
  let count = 0;
  if (!opts.ignoreCategory && opts.selectedCategoryId != null) count++;
  if (opts.languages.size > 0) count++;
  if (opts.timePeriods.size > 0) count++;
  if (opts.distance !== 'auto') count++;
  if (opts.sortBy !== 'recommended') count++;
  return count;
}

export function isClassInTimePeriods(
  startsAt: string,
  periods: Set<BrowseTimePeriod>,
): boolean {
  if (periods.size === 0) return true;
  const hour = new Date(startsAt).getHours();
  if (periods.has('morning') && hour >= 5 && hour < 12) return true;
  if (periods.has('afternoon') && hour >= 12 && hour < 16) return true;
  if (periods.has('evening') && hour >= 16 && hour < 20) return true;
  return false;
}

export function classMatchesLanguages(
  item: BrowseClassItem,
  languages: Set<string>,
): boolean {
  if (languages.size === 0) return true;
  const lang = item.language?.trim().toLowerCase();
  if (!lang) return false;
  return languages.has(lang);
}

export function studioMatchesCategory(
  studio: PublicStudioPreview,
  categoryId: number | null,
  categories: PublicTrainingCategory[],
  classes: BrowseClassItem[],
): boolean {
  if (categoryId == null) return true;
  if (studio.categoryIds.includes(categoryId)) return true;
  if (classes.some((c) => c.trainingCategoryId === categoryId)) return true;

  const opt = categories.find((c) => c.id === categoryId);
  if (!opt || studio.categories.length === 0) {
    return studio.categoryIds.length === 0 && studio.categories.length === 0;
  }
  const labels = new Set(
    [opt.nameEn, opt.nameRu, opt.nameVn]
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
  return studio.categories.some((n) => labels.has(n.trim().toLowerCase()));
}

export function filterBrowseStudios(args: {
  studios: PublicStudioPreview[];
  classesByStudio: Map<string, BrowseClassItem[]>;
  categoryId: number | null;
  categories: PublicTrainingCategory[];
  languages: Set<string>;
  timePeriods: Set<BrowseTimePeriod>;
  searchQuery: string;
}): {
  studios: PublicStudioPreview[];
  classesByStudio: Map<string, BrowseClassItem[]>;
} {
  const q = args.searchQuery.trim().toLowerCase();
  const filteredClasses = new Map<string, BrowseClassItem[]>();

  const studios = args.studios.filter((studio) => {
    const allClasses = args.classesByStudio.get(studio.id) ?? [];
    const dayClasses = allClasses.filter(
      (c) =>
        isClassInTimePeriods(c.startsAt, args.timePeriods) &&
        classMatchesLanguages(c, args.languages),
    );
    filteredClasses.set(studio.id, dayClasses);

    if (
      !studioMatchesCategory(
        studio,
        args.categoryId,
        args.categories,
        allClasses,
      )
    ) {
      return false;
    }

    if (args.languages.size > 0) {
      const hasLang = allClasses.some((c) =>
        classMatchesLanguages(c, args.languages),
      );
      if (!hasLang) return false;
    }

    if (q) {
      const hay = `${studio.studioName} ${studio.address}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }

    return true;
  });

  return { studios, classesByStudio: filteredClasses };
}

export function sortBrowseStudios(
  studios: PublicStudioPreview[],
  sortBy: BrowseSortBy,
): PublicStudioPreview[] {
  const list = [...studios];
  if (sortBy === 'ratings') {
    list.sort(
      (a, b) =>
        b.rating - a.rating ||
        b.reviewCount - a.reviewCount ||
        (a.distanceKm ?? 999) - (b.distanceKm ?? 999),
    );
    return list;
  }
  if (sortBy === 'distance') {
    list.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
    return list;
  }
  // recommended
  list.sort((a, b) => {
    const scoreA = a.rating * 10 + a.reviewCount * 0.02;
    const scoreB = b.rating * 10 + b.reviewCount * 0.02;
    return scoreB - scoreA || (a.distanceKm ?? 999) - (b.distanceKm ?? 999);
  });
  return list;
}
