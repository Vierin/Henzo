'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Dumbbell, Star } from 'lucide-react';
import {
  formatCategoryPreview,
  formatStudioDistanceLabel,
  type PublicStudioPreview,
} from '@/lib/client/studio-preview';
import { withLocale, type Locale } from '@/i18n/routing';
import { useTranslation } from '@/contexts/LanguageContext';

type Props = {
  studio: PublicStudioPreview;
  locale: Locale;
};

export function PopularStudioCard({ studio, locale }: Props) {
  const t = useTranslation();
  const categoryPreview = formatCategoryPreview(studio.categories);
  const distanceLabel = formatStudioDistanceLabel(studio.distanceKm, {
    meters: String(t('homepage.client.popularStudios.distanceMeters')),
    kilometers: String(t('homepage.client.popularStudios.distanceKilometers')),
  });
  const hasCategories = categoryPreview.visible.length > 0;

  const slugOrId = studio.slug?.trim() || studio.id;
  const href = `${withLocale(`/studio/${slugOrId}`, locale)}?name=${encodeURIComponent(studio.studioName)}`;

  return (
    <Link href={href} className="group block w-[200px] shrink-0 snap-start">
      <article className="flex flex-col overflow-hidden rounded-[18px] bg-white transition group-hover:shadow-[0_12px_32px_-12px_rgba(63,50,135,0.18)]">
        <div className="relative aspect-[180/118] w-full overflow-hidden bg-[#FFE5DC]">
          {studio.photoUrl ? (
            <Image
              src={studio.photoUrl}
              alt=""
              fill
              sizes="200px"
              className="object-cover object-center transition duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[#E86D4F]">
              <Dumbbell className="h-8 w-8" aria-hidden />
            </div>
          )}
        </div>

        <div className="flex min-h-[78px] flex-col px-2.5 pb-2.5 pt-2">
          <h3 className="truncate text-[14px] font-semibold leading-[1.2] text-[#3F3F3F]">
            {studio.studioName}
          </h3>

          {hasCategories ? (
            <p className="mt-1.5 truncate text-[12px] leading-[1.1] text-[#878787]">
              {categoryPreview.visible.join(' • ')}
              {categoryPreview.moreCount > 0 ? (
                <span className="font-semibold text-[#878787]">
                  {`  +${categoryPreview.moreCount}`}
                </span>
              ) : null}
            </p>
          ) : null}

          <div
            className={`flex items-end justify-between gap-2 ${
              hasCategories ? 'mt-2' : 'mt-auto pt-2'
            }`}
          >
            {studio.rating > 0 ? (
              <div className="flex min-w-0 items-center gap-0.5 text-[11px] leading-none">
                <Star
                  className="h-3 w-3 shrink-0 fill-[#FFB800] text-[#FFB800]"
                  aria-hidden
                />
                <span className="font-semibold text-[#3F3F3F]">
                  {studio.rating.toFixed(1)}
                </span>
                {studio.reviewCount > 0 ? (
                  <span className="truncate text-[#878787]">
                    {` (${studio.reviewCount})`}
                  </span>
                ) : null}
              </div>
            ) : (
              <span className="min-w-0 flex-1" />
            )}

            {distanceLabel ? (
              <span className="shrink-0 text-[11px] leading-none text-[#3F3F3F]/40">
                {distanceLabel}
              </span>
            ) : null}
          </div>
        </div>
      </article>
    </Link>
  );
}
