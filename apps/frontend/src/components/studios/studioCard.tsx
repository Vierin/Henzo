'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  ChevronRight,
  Dumbbell,
  Flame,
  Heart,
  MapPin,
  Star,
} from 'lucide-react';
import type { PublicStudioPreview } from '@/lib/client/studio-preview';
import { formatStudioDistanceLabel } from '@/lib/client/studio-preview';
import { formatBrowseDistrictCity } from '@/lib/client/format-browse-address';
import {
  formatBrowseClassPrice,
  formatBrowseClassTime,
  type BrowseClassItem,
} from '@/lib/client/browse-studio-classes';
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
  nextClasses?: BrowseClassItem[];
  priority?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  showPopularBadge?: boolean;
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
  const bg = isOther ? '#F3F0EC' : category.chipBgHex;
  const fg = isOther ? '#3F3F3F' : (category.chipFgHex ?? '#171717');

  return (
    <span
      className="inline-flex h-[22px] items-center rounded-full px-2.5 text-[11px] font-normal tracking-[-0.02em]"
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
  nextClasses = [],
  priority = false,
  isFavorite = false,
  onToggleFavorite,
  showPopularBadge = false,
}: Props) {
  const publicSlug = resolveStudioPublicSlug({
    id: studio.id,
    name: studio.studioName,
    slug: studio.slug,
  });
  const href = withLocale(`/studio/${publicSlug}`, locale);
  const byId = new Map(trainingCategories.map((c) => [c.id, c]));

  const sortedIds = sortCategoryIds(studio.categoryIds, byId);
  const visibleIds = sortedIds.slice(0, 3);
  const moreFromIds = Math.max(0, sortedIds.length - visibleIds.length);

  const sortedNames = sortCategoryNames(studio.categories, trainingCategories);
  const fallbackNames = sortedNames.slice(0, 3);
  const moreFromNames = Math.max(0, sortedNames.length - 3);

  // Web browse: always use address (not locationName — often duplicates studio name)
  const addressLabel = formatBrowseDistrictCity(studio.address);

  const distanceLabel = formatStudioDistanceLabel(studio.distanceKm, {
    meters: '{value} m',
    kilometers: '{value} km',
  });

  const ratingText = studio.rating.toFixed(1);
  const firstClass = nextClasses[0] ?? null;
  const classHref = firstClass
    ? `${withLocale('/class', locale)}?${new URLSearchParams({
        studioId: firstClass.studioId,
        sessionId: firstClass.sessionId,
        startsAt: firstClass.startsAt,
      }).toString()}`
    : null;
  const popular =
    showPopularBadge || (studio.rating >= 4.7 && studio.reviewCount >= 20);

  return (
    <article className="group flex min-h-[207px] overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(63,63,63,0.04)]">
      <div className="relative w-[160px] shrink-0 self-stretch bg-[#FDF9E7] sm:w-[176px]">
        {studio.photoUrl ? (
          <Image
            src={studio.photoUrl}
            alt=""
            fill
            priority={priority}
            sizes="176px"
            className="object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full min-h-[207px] items-center justify-center text-[#E86D4F]">
            <Dumbbell className="h-8 w-8" aria-hidden />
          </div>
        )}

        {popular ? (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-[#FFF1ED]/95 px-2 py-1 text-[11px] font-normal text-[#E86D4F]">
            <Flame className="h-3 w-3" aria-hidden />
            Popular
          </span>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-3 sm:p-3.5">
        <div className="flex items-start gap-2">
          <Link href={href} className="min-w-0 flex-1">
            <h2 className="text-[15px] font-normal leading-[1.2] tracking-[-0.03em] text-[#2B2B2B] line-clamp-2 hover:text-[#E86D4F] sm:text-base">
              {studio.studioName}
            </h2>
          </Link>

          <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
            {studio.rating > 0 ? (
              <span className="inline-flex items-center gap-0.5 text-[12px] text-[#3F3F3F]">
                <Star
                  className="h-3.5 w-3.5 fill-[#FFB800] text-[#FFB800]"
                  aria-hidden
                />
                <span className="font-normal">{ratingText}</span>
                {studio.reviewCount > 0 ? (
                  <span className="text-[#878787]">({studio.reviewCount})</span>
                ) : null}
              </span>
            ) : null}
            {onToggleFavorite ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleFavorite();
                }}
                className="rounded-full p-1 text-[#FF5D7A] hover:bg-[#FFF1ED]"
                aria-label={
                  isFavorite ? 'Remove from favorites' : 'Add to favorites'
                }
              >
                <Heart
                  className={`h-4 w-4 ${isFavorite ? 'fill-[#FF5D7A]' : ''}`}
                  aria-hidden
                />
              </button>
            ) : (
              <Heart className="h-4 w-4 text-[#FF5D7A]/70" aria-hidden />
            )}
          </div>
        </div>

        {addressLabel || distanceLabel ? (
          <p className="mt-1.5 flex items-start gap-1 text-[13px] leading-snug text-[#878787]">
            <MapPin
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#E86D4F]"
              aria-hidden
            />
            <span className="min-w-0 line-clamp-1">
              {addressLabel ? (
                <>
                  {addressLabel}
                  {distanceLabel ? (
                    <span className="text-[#3F3F3F]/55">
                      {' '}
                      · {distanceLabel}
                    </span>
                  ) : null}
                </>
              ) : (
                distanceLabel
              )}
            </span>
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
              <span className="text-[11px] font-normal text-[#878787]">
                +{moreFromIds > 0 ? moreFromIds : moreFromNames} more
              </span>
            )}
          </div>
        ) : null}

        {/* Nearest trainings slot — mobile browse parity, no description */}
        <div className="mt-auto pt-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-normal uppercase tracking-[0.04em] text-[#3F3F3F]">
              Classes
            </span>
            <Link
              href={href}
              className="inline-flex items-center text-[11px] font-normal uppercase tracking-wide text-[#E86D4F] hover:underline"
            >
              See all
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>

          {firstClass && classHref ? (
            <Link
              href={classHref}
              className="mt-1.5 flex items-center gap-2 rounded-lg bg-[#F8F3EB] px-2 py-2 transition hover:bg-[#F3EBDF]"
            >
              <span className="shrink-0 text-[12px] font-normal text-[#E86D4F]">
                {formatBrowseClassTime(firstClass.startsAt, locale)}
              </span>
              <span className="min-w-0 flex-1 truncate text-[12px] font-normal text-[#3F3F3F]">
                {firstClass.className}
              </span>
              {formatBrowseClassPrice(
                firstClass.price,
                studio.currency ?? 'EUR',
              ) ? (
                <span className="shrink-0 text-[11px] font-normal text-[#3F3F3F]">
                  {formatBrowseClassPrice(
                    firstClass.price,
                    studio.currency ?? 'EUR',
                  )}
                </span>
              ) : null}
            </Link>
          ) : (
            <p className="mt-1.5 text-[12px] text-[#3F3F3F]">
              No classes today
            </p>
          )}

          <div className="mt-2.5 flex justify-end">
            <Link
              href={href}
              className="inline-flex items-center gap-1 rounded-full bg-[#E86D4F] px-3.5 py-1.5 text-[12px] font-normal text-white transition hover:bg-[#d85e42]"
            >
              View studio
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
