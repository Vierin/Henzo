'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { ClientHomeHeader } from '@/components/clientHome/clientHomeHeader';
import { ClientLocationPicker } from '@/components/clientHome/clientLocationPicker';
import { StudioCard } from '@/components/studios/studioCard';
import { StudiosBrowseFilters } from '@/components/studios/studiosBrowseFilters';
import { useClientLocation } from '@/contexts/ClientLocationContext';
import { useTranslation } from '@/contexts/LanguageContext';
import {
  distanceFilterToRadiusKm,
  filterBrowseStudios,
  sortBrowseStudios,
  type BrowseDistanceFilter,
  type BrowseSortBy,
  type BrowseTimePeriod,
} from '@/lib/client/browse-filters';
import {
  fetchBrowseClassesByStudio,
  type BrowseClassItem,
} from '@/lib/client/browse-studio-classes';
import { fetchPopularStudiosClient } from '@/lib/client/fetch-popular-studios';
import { fetchStudiosSearchClient } from '@/lib/client/fetch-studios-search';
import type { PublicStudioPreview } from '@/lib/client/studio-preview';
import { fetchHomeTrainingCategoriesClient } from '@/lib/client/fetch-training-categories';
import type { PublicTrainingCategory } from '@/lib/client/training-category';
import { CLIENT_AUTH_COOKIE } from '@/lib/client-panel/auth-session-cookie';
import {
  addFavoriteStudio,
  fetchClientFavorites,
  removeFavoriteStudio,
} from '@/lib/client-panel/fetch-favorites';
import { isLocale, withLocale, type Locale } from '@/i18n/routing';

function hasClientCookie() {
  if (typeof document === 'undefined') return false;
  return document.cookie
    .split(';')
    .some((c) => c.trim().startsWith(`${CLIENT_AUTH_COOKIE}=`));
}

type Props = {
  initialStudios: PublicStudioPreview[];
  initialTotal: number;
  initialCategories: PublicTrainingCategory[];
  title?: string;
  categorySlug?: string;
};

export function StudiosListClient({
  initialStudios,
  initialTotal: _initialTotal,
  initialCategories,
  title = 'Studios',
  categorySlug,
}: Props) {
  const router = useRouter();
  const params = useParams();
  const t = useTranslation();
  const { location, isHydrated } = useClientLocation();
  const localeRaw = params?.locale;
  const locale: Locale =
    typeof localeRaw === 'string' && isLocale(localeRaw) ? localeRaw : 'en';
  const locationFallback = String(
    t('homepage.client.header.location') || 'Set location',
  );

  const [rawStudios, setRawStudios] = useState(initialStudios);
  const [categories, setCategories] = useState(initialCategories);
  const [classesByStudio, setClassesByStudio] = useState<
    Map<string, BrowseClassItem[]>
  >(new Map());
  const [loading, setLoading] = useState(false);
  const [classesLoading, setClassesLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');

  const lockedCategory = useMemo(() => {
    if (!categorySlug) return null;
    return (
      categories.find((c) => c.slug === categorySlug) ??
      initialCategories.find((c) => c.slug === categorySlug) ??
      null
    );
  }, [categories, categorySlug, initialCategories]);

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    lockedCategory?.id ?? null,
  );
  const [languages, setLanguages] = useState<Set<string>>(new Set());
  const [timePeriods, setTimePeriods] = useState<Set<BrowseTimePeriod>>(
    new Set(),
  );
  const [distance, setDistance] = useState<BrowseDistanceFilter>('auto');
  const [sortBy, setSortBy] = useState<BrowseSortBy>('recommended');
  const [isClientAuthed, setIsClientAuthed] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [favoriteBusyId, setFavoriteBusyId] = useState<string | null>(null);

  useEffect(() => {
    const authed = hasClientCookie();
    setIsClientAuthed(authed);
    if (!authed) {
      setFavoriteIds(new Set());
      return;
    }
    let cancelled = false;
    void fetchClientFavorites()
      .then((list) => {
        if (cancelled) return;
        setFavoriteIds(new Set(list.map((s) => s.id)));
      })
      .catch(() => {
        if (!cancelled) setFavoriteIds(new Set());
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleFavorite = useCallback(
    async (studioId: string) => {
      if (!isClientAuthed) {
        router.push(withLocale('/login', locale));
        return;
      }
      if (favoriteBusyId) return;

      const wasFavorite = favoriteIds.has(studioId);
      setFavoriteBusyId(studioId);
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (wasFavorite) next.delete(studioId);
        else next.add(studioId);
        return next;
      });

      try {
        if (wasFavorite) await removeFavoriteStudio(studioId);
        else await addFavoriteStudio(studioId);
      } catch {
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          if (wasFavorite) next.add(studioId);
          else next.delete(studioId);
          return next;
        });
      } finally {
        setFavoriteBusyId(null);
      }
    },
    [favoriteBusyId, favoriteIds, isClientAuthed, locale, router],
  );

  useEffect(() => {
    if (lockedCategory) setSelectedCategoryId(lockedCategory.id);
  }, [lockedCategory]);

  useEffect(() => {
    if (initialCategories.length > 0) return;
    let cancelled = false;
    fetchHomeTrainingCategoriesClient().then((next) => {
      if (!cancelled) setCategories(next);
    });
    return () => {
      cancelled = true;
    };
  }, [initialCategories.length]);

  // Load nearby studios when location / distance / category changes
  useEffect(() => {
    if (!isHydrated) return;
    let cancelled = false;
    setLoading(true);

    const radius = distanceFilterToRadiusKm(distance);
    const run = async () => {
      try {
        let items = await fetchPopularStudiosClient(
          50,
          { lat: location.lat, lng: location.lng },
          radius,
        );

        // Fallback to search if nearby empty
        if (items.length === 0) {
          const category =
            lockedCategory?.slug ??
            categories.find((c) => c.id === selectedCategoryId)?.slug;
          const result = await fetchStudiosSearchClient({
            category: category ?? undefined,
            limit: 50,
            search: appliedSearch || undefined,
          });
          items = result.items;
        }

        if (!cancelled) {
          setRawStudios(items);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [
    isHydrated,
    location.lat,
    location.lng,
    distance,
    lockedCategory?.slug,
    categories,
    selectedCategoryId,
    appliedSearch,
  ]);

  // Schedules for nearest-class slot
  useEffect(() => {
    if (rawStudios.length === 0) {
      setClassesByStudio(new Map());
      return;
    }
    let cancelled = false;
    setClassesLoading(true);
    fetchBrowseClassesByStudio(rawStudios, {
      clientSide: true,
      limitStudios: 40,
    })
      .then((map) => {
        if (!cancelled) setClassesByStudio(map);
      })
      .finally(() => {
        if (!cancelled) setClassesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [rawStudios]);

  const derived = useMemo(() => {
    return filterBrowseStudios({
      studios: rawStudios,
      classesByStudio,
      categoryId: selectedCategoryId,
      categories,
      languages,
      timePeriods,
      searchQuery: appliedSearch,
    });
  }, [
    rawStudios,
    classesByStudio,
    selectedCategoryId,
    categories,
    languages,
    timePeriods,
    appliedSearch,
  ]);

  const studios = useMemo(
    () => sortBrowseStudios(derived.studios, sortBy),
    [derived.studios, sortBy],
  );

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    setAppliedSearch(search.trim());
  };

  const onCategoryChange = (id: number | null) => {
    if (categorySlug) {
      // Navigate between category pages
      if (id == null) {
        router.push(withLocale('/studios', locale));
        return;
      }
      const cat = categories.find((c) => c.id === id);
      if (cat) router.push(withLocale(`/category/${cat.slug}`, locale));
      return;
    }
    setSelectedCategoryId(id);
  };

  return (
    <div className="min-h-screen bg-[#F9F4F0] font-wix-madefor-display text-[#3F3F3F]">
      <ClientHomeHeader />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-5 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {title}
              </h1>
              <p className="mt-1 text-sm text-[#878787]">
                {loading
                  ? 'Loading…'
                  : `${studios.length} studio${studios.length === 1 ? '' : 's'}`}
                {classesLoading ? ' · updating classes' : ''}
              </p>
            </div>
            <div className="shrink-0 sm:hidden">
              <ClientLocationPicker fallbackLabel={locationFallback} />
            </div>
          </div>

          <form
            onSubmit={onSearch}
            className="flex w-full max-w-md items-center rounded-full border border-[#E8E0D8] bg-white p-1.5"
            role="search"
          >
            <Search className="ml-3 h-4 w-4 text-[#878787]" aria-hidden />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search studios..."
              className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm outline-none"
            />
            <button
              type="submit"
              className="rounded-full bg-[#E86D4F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#d85e42]"
            >
              Search
            </button>
          </form>
        </div>

        <div className="mb-6">
          <StudiosBrowseFilters
            locale={locale}
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            onCategoryChange={onCategoryChange}
            languages={languages}
            onLanguagesChange={setLanguages}
            timePeriods={timePeriods}
            onTimePeriodsChange={setTimePeriods}
            distance={distance}
            onDistanceChange={setDistance}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            hideTypes={Boolean(categorySlug)}
          />
        </div>

        {loading && studios.length === 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-[207px] animate-pulse rounded-2xl bg-[#EDE8E3]"
              />
            ))}
          </div>
        ) : studios.length === 0 ? (
          <p className="rounded-2xl bg-white p-8 text-center text-[#878787]">
            No studios found. Try changing filters or widening distance.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {studios.map((studio, index) => (
              <StudioCard
                key={studio.id}
                studio={studio}
                locale={locale}
                trainingCategories={categories}
                nextClasses={derived.classesByStudio.get(studio.id) ?? []}
                priority={index < 2}
                isFavorite={favoriteIds.has(studio.id)}
                onToggleFavorite={() => void toggleFavorite(studio.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
