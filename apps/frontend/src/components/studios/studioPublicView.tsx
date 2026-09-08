'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Globe,
  Heart,
  Instagram,
  Mail,
  MapPin,
  Phone,
  Share2,
  Star,
} from 'lucide-react';
import { ClientHomeHeader } from '@/components/clientHome/clientHomeHeader';
import {
  fetchPublicStudioScheduleClient,
  type PublicScheduleSession,
  type PublicStudioDetail,
  type PublicStudioReview,
} from '@/lib/client/fetch-studio-detail';
import { formatBrowseDistrictCity } from '@/lib/client/format-browse-address';
import {
  trainingCategoryLabel,
  type PublicTrainingCategory,
} from '@/lib/client/training-category';
import { type Locale } from '@/i18n/routing';

type Props = {
  studio: PublicStudioDetail;
  initialSessions: PublicScheduleSession[];
  locale: Locale;
  trainingCategories?: PublicTrainingCategory[];
};

const CHIP_FALLBACK: [string, string][] = [
  ['#FFEB3B', '#3F3F3F'],
  ['#E91E8C', '#FFFFFF'],
  ['#4D39A8', '#FFFFFF'],
  ['#5BC0EB', '#FFFFFF'],
  ['#8BC34A', '#3F3F3F'],
];

function formatSessionWhen(iso: string, timeZone?: string) {
  try {
    return new Intl.DateTimeFormat('en', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: timeZone || undefined,
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleString();
  }
}

function formatPrice(price: number) {
  if (!Number.isFinite(price)) return null;
  return new Intl.NumberFormat('en', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(price);
}

function directionsUrl(studio: PublicStudioDetail): string | null {
  if (
    typeof studio.latitude === 'number' &&
    typeof studio.longitude === 'number'
  ) {
    return `https://www.google.com/maps/dir/?api=1&destination=${studio.latitude},${studio.longitude}`;
  }
  if (studio.address?.trim()) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(studio.address.trim())}`;
  }
  return null;
}

function StarRow({ rating }: { rating: number }) {
  const filled = Math.round(Math.min(5, Math.max(0, rating)));
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i < filled
              ? 'fill-[#FFB800] text-[#FFB800]'
              : 'fill-transparent text-[#D6D0C8]'
          }`}
        />
      ))}
    </span>
  );
}

function AddressDirectionsBlock({
  address,
  mapsUrl,
  compact = false,
}: {
  address: string;
  mapsUrl: string | null;
  compact?: boolean;
}) {
  return (
    <div className={`flex gap-2 ${compact ? 'items-start' : 'items-start'}`}>
      <MapPin
        className={`mt-0.5 shrink-0 text-[#3F3F3F] ${compact ? 'h-4 w-4' : 'h-[18px] w-[18px]'}`}
        aria-hidden
      />
      <p
        className={`min-w-0 leading-snug text-[#3F3F3F] ${compact ? 'text-sm' : 'text-[15px]'}`}
      >
        <span>{address}</span>
        {mapsUrl ? (
          <>
            {' '}
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-[#1A73E8] hover:underline"
            >
              Get directions
            </a>
          </>
        ) : null}
      </p>
    </div>
  );
}

function PhotoSlider({ photos, name }: { photos: string[]; name: string }) {
  const [index, setIndex] = useState(0);
  const urls = photos.length > 0 ? photos : [];

  useEffect(() => {
    if (urls.length <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % urls.length), 6000);
    return () => clearInterval(t);
  }, [urls.length]);

  const go = (delta: number) => {
    if (urls.length <= 1) return;
    setIndex((i) => (i + delta + urls.length) % urls.length);
  };

  return (
    <div className="relative aspect-[16/11] w-full overflow-hidden rounded-2xl bg-[#FFE5DC] sm:aspect-[16/10] sm:min-h-[360px]">
      {urls.length > 0 ? (
        <Image
          key={urls[index]}
          src={urls[index]!}
          alt={`${name} — photo ${index + 1}`}
          fill
          priority
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 65vw"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-[#E86D4F]">
          <Dumbbell className="h-16 w-16" aria-hidden />
        </div>
      )}

      {urls.length > 1 ? (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#3F3F3F] shadow-sm hover:bg-white"
            aria-label="Previous photo"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#3F3F3F] shadow-sm hover:bg-white"
            aria-label="Next photo"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
            {urls.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Photo ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/55'
                }`}
              />
            ))}
          </div>
          <span className="absolute bottom-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white">
            {index + 1} / {urls.length}
          </span>
        </>
      ) : null}
    </div>
  );
}

function ContactLine({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-2.5 text-sm text-[#3F3F3F] hover:text-[#E86D4F]"
    >
      <span className="text-[#E86D4F]">{icon}</span>
      <span className="min-w-0 break-all">{label}</span>
    </a>
  );
}

function SocialCircle({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className="flex h-11 w-11 items-center justify-center rounded-full bg-[#E86D4F] text-white transition hover:bg-[#d85e42]"
    >
      {children}
    </a>
  );
}

function ReviewCard({ review }: { review: PublicStudioReview }) {
  const [expanded, setExpanded] = useState(false);
  const long = (review.comment?.length ?? 0) > 160;

  return (
    <article className="rounded-[14px] bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-[#3F3F3F]">
          {review.userName || 'Client'}
        </p>
        <span className="inline-flex items-center gap-1 text-sm font-semibold">
          <Star className="h-3.5 w-3.5 fill-[#FFB800] text-[#FFB800]" />
          {review.rating.toFixed(1)}
        </span>
      </div>
      {review.comment ? (
        <p className="mt-2 text-sm leading-relaxed text-[#5C5C5C]">
          {long && !expanded
            ? `${review.comment.slice(0, 160).trim()}…`
            : review.comment}
          {long ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="ml-1 font-semibold text-[#E86D4F]"
            >
              {expanded ? 'Read less' : 'Read more'}
            </button>
          ) : null}
        </p>
      ) : null}
    </article>
  );
}

function SessionCard({
  session,
  timezone,
}: {
  session: PublicScheduleSession;
  timezone?: string;
}) {
  const accent = session.displayColor || '#E86D4F';
  const price = session.price != null ? formatPrice(session.price) : null;
  const spots =
    session.capacity != null
      ? `${session.enrolledCount ?? 0}/${session.capacity}`
      : null;

  return (
    <article className="flex gap-3 rounded-[14px] bg-white p-3.5 sm:p-4">
      <div
        className="w-1 shrink-0 self-stretch rounded-full"
        style={{ backgroundColor: accent }}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-[#3F3F3F]">
          {session.trainingName || 'Class'}
        </p>
        <p className="mt-0.5 text-sm text-[#878787]">
          {formatSessionWhen(session.startsAt, timezone)}
          {session.durationMinutes ? ` · ${session.durationMinutes} min` : ''}
        </p>
        {(session.trainerName || session.locationName) && (
          <p className="mt-0.5 truncate text-sm text-[#878787]">
            {[session.trainerName, session.locationName]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}
        {spots ? (
          <p className="mt-1 text-xs text-[#878787]">{spots} spots</p>
        ) : null}
      </div>
      {price ? (
        <div className="shrink-0 self-center text-right">
          <p className="text-sm font-semibold" style={{ color: accent }}>
            {price}
          </p>
        </div>
      ) : null}
    </article>
  );
}

export function StudioPublicView({
  studio,
  initialSessions,
  locale,
  trainingCategories = [],
}: Props) {
  const [sessions, setSessions] = useState(initialSessions);
  const [descOpen, setDescOpen] = useState(false);
  const [showAllSessions, setShowAllSessions] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);

  useEffect(() => {
    if (initialSessions.length > 0) return;
    let cancelled = false;
    fetchPublicStudioScheduleClient(studio.id).then((next) => {
      if (!cancelled) setSessions(next);
    });
    return () => {
      cancelled = true;
    };
  }, [initialSessions.length, studio.id]);

  const upcoming = useMemo(
    () =>
      sessions.filter(
        (s) => new Date(s.startsAt).getTime() >= Date.now() - 60_000,
      ),
    [sessions],
  );

  const visibleSessions = showAllSessions ? upcoming : upcoming.slice(0, 3);
  const reviews = studio.reviews ?? [];
  const visibleReviews = showAllReviews ? reviews : reviews.slice(0, 1);
  const avg =
    studio.avgRating && studio.avgRating > 0
      ? studio.avgRating
      : reviews.length > 0
        ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
        : 0;
  const reviewCount = studio.reviewCount || reviews.length;

  const byId = new Map(trainingCategories.map((c) => [c.id, c]));
  const categoryIds =
    studio.categoryIds.length > 0
      ? studio.categoryIds
      : studio.categoryLabels.map((c) => c.id);

  const desc = studio.description?.trim() ?? '';
  const descLong = desc.length > 140;
  const mapsUrl = directionsUrl(studio);
  const shortAddress = formatBrowseDistrictCity(studio.address);
  const fullAddress = studio.address?.trim() || null;

  const sharePage = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    try {
      if (navigator.share) {
        await navigator.share({ title: studio.name, url });
        return;
      }
      await navigator.clipboard.writeText(url);
    } catch {
      // ignore
    }
  };

  const scrollToSchedule = () => {
    setShowAllSessions(true);
    document
      .getElementById('studio-schedule')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const igHref = studio.instagram
    ? studio.instagram.startsWith('http')
      ? studio.instagram
      : `https://instagram.com/${studio.instagram.replace(/^@/, '')}`
    : null;

  return (
    <div className="min-h-screen bg-[#F9F4F0] font-wix-madefor-display text-[#3F3F3F]">
      <ClientHomeHeader />

      <div className="mx-auto max-w-7xl px-4 pb-16 pt-5 sm:px-6 sm:pt-7">
        {/* Header: name, rating, address, Get directions — no hours */}
        <header className="mb-5 sm:mb-6">
          <div className="flex items-start gap-3">
            <h1 className="min-w-0 flex-1 text-[26px] font-extrabold leading-[1.15] tracking-[-0.02em] text-[#1A1A1A] sm:text-[34px]">
              {studio.name}
            </h1>
            <div className="flex shrink-0 items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => void sharePage()}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E8E0DA] bg-white text-[#3F3F3F] hover:border-[#E86D4F]/40"
                aria-label="Share"
              >
                <Share2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E8E0DA] bg-white text-[#FF5D7A] hover:border-[#FF5D7A]/40"
                aria-label="Favorite"
              >
                <Heart className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm text-[#3F3F3F]">
            {avg > 0 ? (
              <>
                <span className="inline-flex items-center gap-1.5">
                  <span className="font-bold">{avg.toFixed(1)}</span>
                  <StarRow rating={avg} />
                  {reviewCount > 0 ? (
                    <span className="text-[#878787]">
                      ({reviewCount.toLocaleString()})
                    </span>
                  ) : null}
                </span>
                {shortAddress || mapsUrl ? (
                  <span className="text-[#C4BBB3]" aria-hidden>
                    ·
                  </span>
                ) : null}
              </>
            ) : null}

            {shortAddress ? (
              <span className="text-[#5C5C5C]">{shortAddress}</span>
            ) : null}

            {mapsUrl ? (
              <>
                {(avg > 0 || shortAddress) && (
                  <span className="text-[#C4BBB3]" aria-hidden>
                    ·
                  </span>
                )}
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-[#6B4DE6] hover:underline"
                >
                  Get directions
                </a>
              </>
            ) : null}
          </div>
        </header>

        {/* Photo slider + sidebar */}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)] lg:gap-5">
          <PhotoSlider photos={studio.photos} name={studio.name} />

          <aside className="rounded-2xl border border-[#EDE8E3] bg-white p-4 sm:p-5">
            {desc ? (
              <div className="text-sm leading-relaxed text-[#5C5C5C]">
                <p className="whitespace-pre-line">
                  {descLong && !descOpen
                    ? `${desc.slice(0, 160).trim()}…`
                    : desc}
                </p>
                {descLong ? (
                  <button
                    type="button"
                    onClick={() => setDescOpen((v) => !v)}
                    className="mt-2 font-semibold text-[#E86D4F]"
                  >
                    {descOpen ? 'Read less' : 'Read more'}
                  </button>
                ) : null}
              </div>
            ) : null}

            {categoryIds.length > 0 ? (
              <div className={`flex flex-wrap gap-2 ${desc ? 'mt-5' : ''}`}>
                {categoryIds.map((id, index) => {
                  const cat = byId.get(id);
                  const fallback = studio.categoryLabels.find(
                    (c) => c.id === id,
                  );
                  const label = cat
                    ? trainingCategoryLabel(cat, locale)
                    : locale === 'ru'
                      ? fallback?.nameRu || fallback?.nameEn || 'Category'
                      : locale === 'vi'
                        ? fallback?.nameVn || fallback?.nameEn || 'Category'
                        : fallback?.nameEn || 'Category';
                  const palette = CHIP_FALLBACK[index % CHIP_FALLBACK.length]!;
                  const bg = cat?.chipBgHex || palette[0];
                  const fg = cat?.chipFgHex || palette[1];
                  return (
                    <span
                      key={id}
                      className="inline-flex h-8 items-center rounded-full px-3 text-xs font-semibold"
                      style={{ backgroundColor: bg, color: fg }}
                    >
                      {label}
                    </span>
                  );
                })}
              </div>
            ) : null}

            {fullAddress ? (
              <div
                className={desc || categoryIds.length > 0 ? 'mt-5' : undefined}
              >
                <AddressDirectionsBlock
                  address={fullAddress}
                  mapsUrl={mapsUrl}
                />
              </div>
            ) : !desc && categoryIds.length === 0 ? (
              <p className="text-sm text-[#878787]">
                Address not published yet.
              </p>
            ) : null}

            {(studio.phone || studio.email) && (
              <div className="mt-5 space-y-2.5">
                {studio.phone ? (
                  <ContactLine
                    href={`tel:${studio.phone}`}
                    icon={<Phone className="h-4 w-4" />}
                    label={studio.phone}
                  />
                ) : null}
                {studio.email ? (
                  <ContactLine
                    href={`mailto:${studio.email}`}
                    icon={<Mail className="h-4 w-4" />}
                    label={studio.email}
                  />
                ) : null}
              </div>
            )}

            {(studio.website || igHref) && (
              <div className="mt-5 flex flex-wrap gap-2.5">
                {igHref ? (
                  <SocialCircle href={igHref} label="Instagram">
                    <Instagram className="h-5 w-5" aria-hidden />
                  </SocialCircle>
                ) : null}
                {studio.website ? (
                  <SocialCircle href={studio.website} label="Website">
                    <Globe className="h-5 w-5" aria-hidden />
                  </SocialCircle>
                ) : null}
              </div>
            )}

            <button
              type="button"
              onClick={scrollToSchedule}
              className="relative mt-5 flex w-full items-center gap-3 rounded-[14px] bg-[#E86D4F] px-3.5 py-3.5 text-left text-white hover:bg-[#d85e42]"
            >
              <CalendarDays className="h-5 w-5 shrink-0" aria-hidden />
              <span className="min-w-0 flex-1 pr-5">
                <span className="block text-sm font-semibold">
                  View schedule
                </span>
                <span className="block text-[11px] text-white/90">
                  See all classes and book
                </span>
              </span>
              <ChevronRight className="absolute right-2 top-1/2 h-6 w-6 -translate-y-1/2" />
            </button>
          </aside>
        </div>

        {/* Reviews */}
        {reviews.length > 0 ? (
          <section className="mt-8 max-w-3xl">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.04em]">
                Reviews
              </h2>
              {reviews.length > 1 ? (
                <button
                  type="button"
                  onClick={() => setShowAllReviews((v) => !v)}
                  className="text-sm font-semibold uppercase text-[#E86D4F]"
                >
                  {showAllReviews ? 'Show less' : 'See more'}
                </button>
              ) : null}
            </div>
            <div className="mt-2.5 space-y-2.5">
              {visibleReviews.map((r) => (
                <ReviewCard key={r.id} review={r} />
              ))}
            </div>
          </section>
        ) : null}

        {/* Upcoming classes */}
        <section id="studio-schedule" className="mt-8 max-w-3xl scroll-mt-24">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.04em]">
              Upcoming classes
            </h2>
            {upcoming.length > 3 ? (
              <button
                type="button"
                onClick={() => setShowAllSessions((v) => !v)}
                className="text-sm font-semibold uppercase text-[#E86D4F]"
              >
                {showAllSessions ? 'Show less' : 'See more'}
              </button>
            ) : null}
          </div>

          {upcoming.length === 0 ? (
            <p className="mt-3 rounded-[14px] bg-white p-5 text-sm text-[#878787]">
              No upcoming classes published yet.
            </p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {visibleSessions.map((session) => (
                <li key={session.id}>
                  <SessionCard session={session} timezone={studio.timezone} />
                </li>
              ))}
            </ul>
          )}

          {!showAllSessions && upcoming.length > 3 ? (
            <button
              type="button"
              onClick={scrollToSchedule}
              className="mt-3 w-full rounded-[14px] border border-[#E8E0DA] bg-white py-3 text-sm font-semibold text-[#E86D4F]"
            >
              See all {upcoming.length} classes
            </button>
          ) : null}
        </section>
      </div>
    </div>
  );
}
