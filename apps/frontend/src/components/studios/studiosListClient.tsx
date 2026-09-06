'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { ClientHomeHeader } from '@/components/clientHome/clientHomeHeader';
import { StudioCard } from '@/components/studios/studioCard';
import { fetchStudiosSearchClient } from '@/lib/client/fetch-studios-search';
import type { PublicStudioPreview } from '@/lib/client/studio-preview';
import { fetchHomeTrainingCategoriesClient } from '@/lib/client/fetch-training-categories';
import {
  trainingCategoryLabel,
  type PublicTrainingCategory,
} from '@/lib/client/training-category';
import { isLocale, withLocale, type Locale } from '@/i18n/routing';

type Props = {
  initialStudios: PublicStudioPreview[];
  initialTotal: number;
  initialCategories: PublicTrainingCategory[];
  title?: string;
  categorySlug?: string;
};

export function StudiosListClient({
  initialStudios,
  initialTotal,
  initialCategories,
  title = 'Studios',
  categorySlug,
}: Props) {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const localeRaw = params?.locale;
  const locale: Locale =
    typeof localeRaw === 'string' && isLocale(localeRaw) ? localeRaw : 'en';

  const [studios, setStudios] = useState(initialStudios);
  const [total, setTotal] = useState(initialTotal);
  const [categories, setCategories] = useState(initialCategories);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState(searchParams.get('search') ?? '');

  const activeCategory =
    categorySlug?.trim() || searchParams.get('category') || 'all';

  const queryKey = useMemo(
    () =>
      JSON.stringify({
        search: searchParams.get('search') ?? '',
        category: activeCategory,
        page: searchParams.get('page') ?? '1',
      }),
    [searchParams, activeCategory],
  );

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

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const page = Number(searchParams.get('page') ?? '1') || 1;
    fetchStudiosSearchClient({
      search: searchParams.get('search') ?? undefined,
      category: activeCategory === 'all' ? undefined : activeCategory,
      page,
      limit: 24,
    })
      .then((result) => {
        if (cancelled) return;
        setStudios(result.items);
        setTotal(result.total);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [queryKey, activeCategory, searchParams]);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = new URLSearchParams();
    if (search.trim()) q.set('search', search.trim());
    if (activeCategory !== 'all' && !categorySlug) {
      q.set('category', activeCategory);
    }
    const base = categorySlug
      ? withLocale(`/category/${categorySlug}`, locale)
      : withLocale('/studios', locale);
    const qs = q.toString();
    router.push(qs ? `${base}?${qs}` : base);
  };

  return (
    <div className="min-h-screen bg-[#F9F4F0] font-wix-madefor-display text-[#3F3F3F]">
      <ClientHomeHeader />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {title}
            </h1>
            <p className="mt-1 text-sm text-[#878787]">
              {total} studio{total === 1 ? '' : 's'}
            </p>
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

        {!categorySlug && categories.length > 0 ? (
          <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
            <Link
              href={withLocale('/studios', locale)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${
                activeCategory === 'all'
                  ? 'bg-[#3F3287] text-white'
                  : 'bg-white text-[#3F3F3F] hover:bg-[#EDE8E3]'
              }`}
            >
              All
            </Link>
            {categories.slice(0, 12).map((cat) => (
              <Link
                key={cat.id}
                href={withLocale(`/category/${cat.slug}`, locale)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${
                  activeCategory === cat.slug
                    ? 'bg-[#3F3287] text-white'
                    : 'bg-white text-[#3F3F3F] hover:bg-[#EDE8E3]'
                }`}
              >
                {trainingCategoryLabel(cat, locale)}
              </Link>
            ))}
          </div>
        ) : null}

        {loading && studios.length === 0 ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-[166px] animate-pulse rounded-xl bg-[#EDE8E3]"
              />
            ))}
          </div>
        ) : studios.length === 0 ? (
          <p className="rounded-2xl bg-white p-8 text-center text-[#878787]">
            No studios found. Try another search.
          </p>
        ) : (
          <div className="space-y-3">
            {studios.map((studio, index) => (
              <StudioCard
                key={studio.id}
                studio={studio}
                locale={locale}
                trainingCategories={categories}
                priority={index < 2}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
