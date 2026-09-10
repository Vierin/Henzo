'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { fetchHomeTrainingCategoriesClient } from '@/lib/client/fetch-training-categories';
import {
  trainingCategoryHref,
  trainingCategoryLabel,
  type PublicTrainingCategory,
} from '@/lib/client/training-category';
import type { Locale } from '@/i18n/routing';
import { useTranslation } from '@/contexts/LanguageContext';

type Props = {
  initialCategories: PublicTrainingCategory[];
  locale: Locale;
  className?: string;
  /** Screenshot-style chips under hero search. */
  variant?: 'colored' | 'popular';
};

const POPULAR_LIMIT = 5;

function CategorySkeleton({ outline }: { outline?: boolean }) {
  return (
    <div
      className={`h-9 w-20 shrink-0 animate-pulse rounded-full sm:h-10 sm:w-24 ${
        outline ? 'border border-[#E8E0D8] bg-white' : 'bg-[#EDE8E3]'
      }`}
    />
  );
}

export function ClientHomeCategoryLinks({
  initialCategories,
  locale,
  className,
  variant = 'colored',
}: Props) {
  const t = useTranslation();
  const [categories, setCategories] = useState(initialCategories);
  const [isLoading, setIsLoading] = useState(initialCategories.length === 0);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (initialCategories.length > 0) {
      setCategories(initialCategories);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    fetchHomeTrainingCategoriesClient()
      .then((next) => {
        if (cancelled) return;
        setCategories(next);
        setIsLoading(false);
      })
      .catch(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [initialCategories]);

  const visible = useMemo(() => {
    if (variant !== 'popular' || expanded) return categories;
    return categories.slice(0, POPULAR_LIMIT);
  }, [categories, expanded, variant]);

  const hasMore =
    variant === 'popular' && !expanded && categories.length > POPULAR_LIMIT;

  if (!isLoading && categories.length === 0) return null;

  if (variant === 'popular') {
    const popularLabel = String(
      t('homepage.client.hero.popularNearYou') || 'Popular near you',
    );
    const moreLabel = String(
      t('homepage.client.hero.categories.more') || 'More',
    );

    return (
      <div className={className ?? 'mt-6 sm:mt-8'}>
        <p className="mb-2.5 text-sm text-[#878787]">{popularLabel}</p>
        <div className="-mx-1 flex flex-wrap gap-2 px-1 sm:gap-2.5">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <CategorySkeleton key={`cat-skel-${i}`} outline />
              ))
            : visible.map((category) => {
                const label = trainingCategoryLabel(category, locale);
                const href = trainingCategoryHref(category, locale);

                return (
                  <Link
                    key={category.id}
                    href={href}
                    className="inline-flex h-9 shrink-0 items-center rounded-full px-4 text-sm font-semibold transition hover:brightness-[0.97] sm:h-10 sm:px-5"
                    style={{
                      backgroundColor: category.chipBgHex,
                      color: category.chipFgHex ?? '#171717',
                    }}
                  >
                    {label}
                  </Link>
                );
              })}
          {hasMore ? (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full border border-[#E8E0D8] bg-white px-4 text-sm font-medium text-[#3F3F3F] transition hover:border-[#E86D4F]/35 sm:h-10 sm:px-5"
            >
              {moreLabel}
              <ChevronDown className="h-4 w-4 text-[#878787]" aria-hidden />
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className={className ?? 'mt-6 sm:mt-8'}>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-hide sm:gap-2.5">
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => (
              <CategorySkeleton key={`cat-skel-${i}`} />
            ))
          : categories.map((category) => {
              const label = trainingCategoryLabel(category, locale);
              const href = trainingCategoryHref(category, locale);

              return (
                <Link
                  key={category.id}
                  href={href}
                  className="inline-flex h-9 shrink-0 snap-start items-center rounded-full px-4 text-sm font-semibold transition hover:brightness-[0.97] sm:h-10 sm:px-5 sm:text-[0.9375rem]"
                  style={{
                    backgroundColor: category.chipBgHex,
                    color: category.chipFgHex ?? '#171717',
                  }}
                >
                  {label}
                </Link>
              );
            })}
      </div>
    </div>
  );
}
