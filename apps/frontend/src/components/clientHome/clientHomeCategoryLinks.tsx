'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { fetchTrainingCategoriesClient } from '@/lib/client/fetch-training-categories';
import {
  trainingCategoryHref,
  trainingCategoryIcon,
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
    <div className="flex w-[4.75rem] shrink-0 flex-col items-center gap-1.5 sm:w-[5.25rem]">
      <div className="h-[3.25rem] w-full animate-pulse rounded-2xl bg-[#EDE8E3] sm:h-14" />
      <div className="h-3 w-10 animate-pulse rounded bg-[#EDE8E3]" />
    </div>
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

    fetchTrainingCategoriesClient()
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
              const Icon = trainingCategoryIcon(category);
              const label = trainingCategoryLabel(category, locale);
              const href = trainingCategoryHref(category, locale);

              return (
                <Link
                  key={category.id}
                  href={href}
                  className="group flex w-[4.75rem] shrink-0 snap-start flex-col items-center gap-1.5 rounded-2xl px-2 py-2.5 transition hover:brightness-[0.97] sm:w-[5.25rem] sm:px-3 sm:py-3"
                  style={{
                    backgroundColor: category.chipBgHex,
                    color: category.chipFgHex ?? '#171717',
                  }}
                >
                  <Icon className="h-5 w-5 shrink-0 opacity-95" aria-hidden />
                  <span className="max-w-full truncate text-center text-xs font-semibold leading-tight sm:text-[0.8rem]">
                    {label}
                  </span>
                </Link>
              );
            })}
      </div>
    </div>
  );
}
