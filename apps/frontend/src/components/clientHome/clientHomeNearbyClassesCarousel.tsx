'use client';

import { useEffect, useState } from 'react';
import { Calendar, ChevronRight } from 'lucide-react';
import { playStoreUrl } from '@/constants/appStores';
import { useClientLocation } from '@/contexts/ClientLocationContext';
import { fetchNearbyClassGroupsClient } from '@/lib/client/fetch-nearby-classes';
import type { NearbyClassesDayGroup } from '@/lib/client/nearby-class-session';
import { NearbyClassCard } from '@/components/clientHome/nearbyClassCard';
import type { Locale } from '@/i18n/routing';

type Copy = {
  titleLead: string;
  titleHighlight: string;
  subtitle: string;
  seeAll: string;
  today: string;
  tomorrow: string;
};

type Props = {
  initialGroups: NearbyClassesDayGroup[];
  locale: Locale;
  copy: Copy;
};

function ClassRowSkeleton() {
  return (
    <div className="w-[min(100%,380px)] shrink-0 snap-start sm:w-[420px]">
      <div className="h-[120px] animate-pulse rounded-[16px] bg-[#EDE8E3]" />
    </div>
  );
}

export function ClientHomeNearbyClassesCarousel({
  initialGroups,
  locale,
  copy,
}: Props) {
  const { location, isHydrated } = useClientLocation();
  const [groups, setGroups] = useState(initialGroups);
  const [isLoading, setIsLoading] = useState(initialGroups.length === 0);

  useEffect(() => {
    if (!isHydrated) return;

    let cancelled = false;
    setIsLoading(true);

    fetchNearbyClassGroupsClient(
      locale,
      { today: copy.today, tomorrow: copy.tomorrow },
      { lat: location.lat, lng: location.lng },
    )
      .then((data) => {
        if (!cancelled) {
          setGroups(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setGroups(initialGroups);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    isHydrated,
    location.lat,
    location.lng,
    locale,
    copy.today,
    copy.tomorrow,
    initialGroups,
  ]);

  if (!isLoading && groups.length === 0) {
    return null;
  }

  const subtitle = copy.subtitle.includes('{city}')
    ? copy.subtitle.replace('{city}', location.city)
    : copy.subtitle.replace(/Da Nang/gi, location.city || 'your area');

  return (
    <section
      id="nearby-classes"
      className="bg-[#F9F4F0] px-4 py-10 sm:px-6 sm:py-12"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 max-w-2xl sm:mb-8">
          <h2 className="text-2xl font-bold tracking-tight text-[#3F3F3F] sm:text-3xl lg:text-[2rem]">
            {copy.titleLead}{' '}
            <span className="text-[#E86D4F]">{copy.titleHighlight}</span>
          </h2>
          <p className="mt-3 text-base leading-relaxed text-[#878787] sm:text-lg">
            {subtitle}
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#878787]" aria-hidden />
              <div className="h-4 w-32 animate-pulse rounded bg-[#EDE8E3]" />
            </div>
            <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <ClassRowSkeleton key={`sk-${i}`} />
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {groups.map((group) => (
              <div key={group.dayKey}>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#3F3F3F] sm:text-base">
                    <Calendar className="h-4 w-4 text-[#878787]" aria-hidden />
                    {group.label}
                  </div>
                  <a
                    href={playStoreUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-medium text-[#878787] transition hover:text-[#E86D4F]"
                  >
                    {copy.seeAll}
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </a>
                </div>

                <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-1 scrollbar-hide snap-x snap-mandatory">
                  {group.classes.map((session) => (
                    <NearbyClassCard
                      key={session.sessionId}
                      session={session}
                      locale={locale}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
