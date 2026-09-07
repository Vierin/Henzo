'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight, Dumbbell, MapPin, Star } from 'lucide-react';
import type { PublicStudioPreview } from '@/lib/client/studio-preview';
import { formatStudioDistanceLabel } from '@/lib/client/studio-preview';
import {
  isOtherTrainingCategory,
  trainingCategoryLabel,
  type PublicTrainingCategory,
} from '@/lib/client/training-category';
import { withLocale, type Locale } from '@/i18n/routing';
import { resolveStudioPublicSlug } from '@/utils/slug';

type Props = {
  studio: PublicStudioPreview;
  locale: Locale;
  trainingCategories?: PublicTrainingCategory[];
  priority?: boolean;
};

function sortCategoryIds(
  ids: number[],
  byId: Map<number, PublicTrainingCategory>,
): number[] {
  const rest: number[] = [];
  const other: number[] = [];
  for (const id of ids) {
    const cat = byId.get(id);
    if (cat && isOtherTrainingCategory(cat)) other.push(id);
    else rest.push(id);
  }
  return [...rest, ...other];
}

function sortCategoryNames(
  names: string[],
  categories: PublicTrainingCategory[],
): string[] {
  const isOther = (name: string) => {
    const n = name.trim().toLowerCase();
    if (n === 'other') return true;
    return categories.some(
      (c) =>
        isOtherTrainingCategory(c) &&
        (c.nameEn.trim().toLowerCase() === n ||
          c.nameRu.trim().toLowerCase() === n ||
          c.nameVn.trim().toLowerCase() === n),
    );
  };
  const rest: string[] = [];
  const other: string[] = [];
  for (const name of names) {
    if (isOther(name)) other.push(name);
    else rest.push(name);
  }
  return [...rest, ...other];
}

function CategoryPill({
  label,
  category,
}: {
  label: string;
  category?: PublicTrainingCategory | null;
}) {
  const isOther = !category || isOtherTrainingCategory(category);
  const bg = isOther ? '#FFFFFF' : category.chipBgHex;
  const fg = isOther ? '#3F3F3F' : (category.chipFgHex ?? '#171717');

  return (
    <span
      className={`inline-flex h-[22px] items-center rounded-full px-2.5 text-[11px] font-semibold tracking-[-0.02em] ${
        isOther ? 'border border-[#F9A48F]' : ''
      }`}
      style={{ backgroundColor: bg, color: fg }}
    >
      {label}
    </span>
  );
}

export function StudioCard({
  studio,
  locale,
  trainingCategories = [],
  priority = false,
}: Props) {
  const publicSlug = resolveStudioPublicSlug({
    id: studio.id,
    name: studio.studioName,
    slug: studio.slug,
  });
  const href = withLocale(`/studio/${publicSlug}`, locale);
  const byId = new Map(trainingCategories.map((c) => [c.id, c]));

  const sortedIds = sortCategoryIds(studio.categoryIds, byId);
  const visibleIds = sortedIds.slice(0, 2);
  const moreFromIds = Math.max(0, sortedIds.length - visibleIds.length);

  const sortedNames = sortCategoryNames(studio.categories, trainingCategories);
  const fallbackNames = sortedNames.slice(0, 2);
  const moreFromNames = Math.max(0, sortedNames.length - 2);

  const locationLabel =
    studio.locationName?.trim() ||
    (studio.address && studio.address !== '—' ? studio.address : null);

  const distanceLabel = formatStudioDistanceLabel(studio.distanceKm, {
    meters: '{value} m',
    kilometers: '{value} km',
  });

  const ratingText = studio.rating.toFixed(1).replace('.', ',');

  return (
    <Link
      href={href}
      className="group flex min-h-[166px] overflow-hidden rounded-xl bg-white"
    >
      <div className="relative w-[121px] shrink-0 self-stretch bg-[#FDF9E7]">
        {studio.photoUrl ? (
          <Image
            src={studio.photoUrl}
            alt=""
            fill
            priority={priority}
            sizes="121px"
            className="object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full min-h-[166px] items-center justify-center text-[#E86D4F]">
            <Dumbbell className="h-8 w-8" aria-hidden />
          </div>
        )}

        {studio.rating > 0 ? (
          <span className="absolute bottom-2 right-1.5 inline-flex items-center gap-0.5 rounded-full bg-white px-2 py-1 text-[12px] leading-none tracking-[-0.03em]">
            <Star
              className="h-3.5 w-3.5 fill-[#FFB800] text-[#FFB800]"
              aria-hidden
            />
            <span className="font-bold text-[#3F3F3F]">{ratingText}</span>
            {studio.reviewCount > 0 ? (
              <span className="font-normal text-[#3F3F3F]/60">
                {` (${studio.reviewCount})`}
              </span>
            ) : null}
          </span>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col px-2 py-2.5">
        <div className="flex items-start gap-2">
          <h2 className="min-w-0 flex-1 text-[15px] font-bold leading-[1.15] tracking-[-0.03em] text-[#3F3F3F] line-clamp-2">
            {studio.studioName}
          </h2>
          {distanceLabel ? (
            <span className="shrink-0 pt-0.5 text-[12px] leading-[1.1] tracking-[-0.03em] text-[#3F3F3F]/60">
              {distanceLabel}
            </span>
          ) : null}
        </div>

        {locationLabel ? (
          <p className="mt-2 flex items-start gap-1 text-[14px] leading-snug text-[#3F3F3F]">
            <MapPin
              className="mt-0.5 h-3 w-3 shrink-0 text-[#E86D4F]"
              aria-hidden
            />
            <span className="truncate">{locationLabel}</span>
          </p>
        ) : null}

        {visibleIds.length > 0 || fallbackNames.length > 0 ? (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {visibleIds.length > 0
              ? visibleIds.map((id) => {
                  const cat = byId.get(id);
                  const label = cat
                    ? trainingCategoryLabel(cat, locale)
                    : (studio.categories[studio.categoryIds.indexOf(id)] ??
                      'Category');
                  return <CategoryPill key={id} label={label} category={cat} />;
                })
              : fallbackNames.map((name) => (
                  <CategoryPill key={name} label={name} />
                ))}
            {(moreFromIds > 0 ||
              (visibleIds.length === 0 && moreFromNames > 0)) && (
              <span className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full border border-[#E86D4F] text-[10px] font-semibold text-[#3F3F3F]">
                +{moreFromIds > 0 ? moreFromIds : moreFromNames}
              </span>
            )}
          </div>
        ) : null}

        <div className="mt-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.02em] text-[#3F3F3F]">
              Classes
            </span>
            <span className="inline-flex items-center text-[11px] font-medium uppercase tracking-wide text-[#E86D4F]">
              See all
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </span>
          </div>
          <p className="mt-1.5 text-[12px] text-[#3F3F3F]">No classes today</p>
        </div>
      </div>
    </Link>
  );
}
