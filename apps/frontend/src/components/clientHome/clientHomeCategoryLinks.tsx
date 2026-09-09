'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { fetchHomeTrainingCategoriesClient } from '@/lib/client/fetch-training-categories';
import {
  trainingCategoryHref,
  trainingCategoryLabel,
  type PublicTrainingCategory,
} from '@/lib/client/training-category';
import type { Locale } from '@/i18n/routing';

type Props = {
  initialCategories: PublicTrainingCategory[];
  locale: Locale;
};

function CategorySkeleton() {
  return (
    <div className="h-9 w-20 shrink-0 animate-pulse rounded-full bg-[#EDE8E3] sm:h-10 sm:w-24" />
  );
}

export function ClientHomeCategoryLinks({ initialCategories, locale }: Props) {
  const [categories, setCategories] = useState(initialCategories);
  const [isLoading, setIsLoading] = useState(initialCategories.length === 0);

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

  if (!isLoading && categories.length === 0) return null;

  return (
    <div className="mx-auto mt-6 max-w-7xl sm:mt-8">
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
