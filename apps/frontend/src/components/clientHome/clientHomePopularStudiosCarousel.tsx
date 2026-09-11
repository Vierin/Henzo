'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useClientLocation } from '@/contexts/ClientLocationContext';
import { fetchPopularStudiosClient } from '@/lib/client/fetch-popular-studios';
import type { PublicStudioPreview } from '@/lib/client/studio-preview';
import { PopularStudioCard } from '@/components/clientHome/popularStudioCard';
import { withLocale, type Locale } from '@/i18n/routing';

type Props = {
  initialStudios: PublicStudioPreview[];
  locale: Locale;
  title: string;
  seeAllLabel: string;
};

function StudioCardSkeleton() {
  return (
    <div className="w-[200px] shrink-0 snap-start sm:w-[280px]">
      <div className="overflow-hidden rounded-[18px] bg-white sm:rounded-[25px]">
        <div className="aspect-[180/118] w-full animate-pulse bg-[#EDE8E3]" />
        <div className="min-h-[78px] space-y-2 px-2.5 py-2.5 sm:min-h-[110px] sm:space-y-3 sm:px-3.5 sm:py-3.5">
          <div className="h-4 w-3/4 animate-pulse rounded bg-[#EDE8E3]" />
          <div className="h-3 w-full animate-pulse rounded bg-[#EDE8E3]" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-[#EDE8E3]" />
        </div>
      </div>
    </div>
  );
}

export function ClientHomePopularStudiosCarousel({
  initialStudios,
  locale,
  title,
  seeAllLabel,
}: Props) {
  const { location, isHydrated } = useClientLocation();
  const [studios, setStudios] = useState(initialStudios);
  const [isLoading, setIsLoading] = useState(initialStudios.length === 0);
  const seeAllHref = withLocale('/studios', locale);

  useEffect(() => {
    if (!isHydrated) return;

    let cancelled = false;
    setIsLoading(true);

    fetchPopularStudiosClient(8, {
      lat: location.lat,
      lng: location.lng,
    })
      .then((data) => {
        if (!cancelled) {
          setStudios(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStudios(initialStudios);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isHydrated, location.lat, location.lng, initialStudios]);

  if (!isLoading && studios.length === 0) {
    return null;
  }

  return (
    <section className="bg-[#F9F4F0] pb-10 pt-2 sm:pb-12">
      <div className="mx-auto min-w-0 max-w-7xl">
        <div className="mb-5 flex items-center justify-between gap-4 px-4 sm:mb-6 sm:px-6">
          <h2 className="text-xl font-medium tracking-tight text-[#3F3F3F] sm:text-2xl">
            {title}
          </h2>

          <div className="flex shrink-0 items-center">
            <Link
              href={seeAllHref}
              className="text-sm font-medium text-[#3F3F3F] transition hover:text-[#E86D4F]"
            >
              {seeAllLabel}
            </Link>
          </div>
        </div>

        <div className="flex min-w-0 gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide snap-x snap-mandatory scroll-px-4 sm:gap-5 sm:px-6 sm:scroll-px-6">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <StudioCardSkeleton key={`skeleton-${i}`} />
              ))
            : studios.map((studio) => (
                <PopularStudioCard
                  key={studio.id}
                  studio={studio}
                  locale={locale}
                />
              ))}
        </div>
      </div>
    </section>
  );
}
