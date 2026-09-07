'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronRight,
  Copy,
  Dumbbell,
  Globe,
  Instagram,
  Mail,
  MapPin,
  Phone,
  Star,
} from 'lucide-react';
import { ClientHomeHeader } from '@/components/clientHome/clientHomeHeader';
import {
  fetchPublicStudioScheduleClient,
  type PublicScheduleSession,
  type PublicStudioDetail,
  type PublicStudioReview,
} from '@/lib/client/fetch-studio-detail';
import {
  trainingCategoryLabel,
  type PublicTrainingCategory,
} from '@/lib/client/training-category';
import { withLocale, type Locale } from '@/i18n/routing';

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

function PhotoHero({ photos, name }: { photos: string[]; name: string }) {
  const [index, setIndex] = useState(0);
  const urls = photos.length > 0 ? photos : [];

  useEffect(() => {
    if (urls.length <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % urls.length), 5000);
    return () => clearInterval(t);
  }, [urls.length]);

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#FFE5DC] sm:aspect-[21/9] sm:max-h-[420px]">
      {urls.length > 0 ? (
        <Image
          key={urls[index]}
          src={urls[index]!}
          alt={name}
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-[#E86D4F]">
          <Dumbbell className="h-16 w-16" aria-hidden />
        </div>
      )}
      {urls.length > 1 ? (
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
      ) : null}
    </div>
  );
}

function ContactChip({
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
      target={href.startsWith('http') ? '_blank' : undefined}
      rel={href.startsWith('http') ? 'noreferrer' : undefined}
      className="inline-flex h-10 items-center gap-2 rounded-full border border-[#E8E0DA] bg-white px-3.5 text-sm font-medium text-[#3F3F3F] hover:border-[#E86D4F]/40"
    >
      {icon}
      <span className="max-w-[140px] truncate">{label}</span>
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
  const [copied, setCopied] = useState(false);

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

  const copyAddress = async () => {
    if (!studio.address) return;
    try {
      await navigator.clipboard.writeText(studio.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
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

      <PhotoHero photos={studio.photos} name={studio.name} />

      <div className="mx-auto max-w-3xl px-4 pb-16 pt-4 sm:px-6 sm:pt-6">
        {/* Name + rating */}
        <div className="flex items-start gap-3">
          <h1 className="min-w-0 flex-1 text-[22px] font-extrabold leading-[1.1] tracking-[-0.02em] sm:text-[28px]">
            {studio.name}
          </h1>
          {avg > 0 ? (
            <div className="flex shrink-0 items-center gap-1 pt-1 text-sm">
              <Star className="h-4 w-4 fill-[#FFB800] text-[#FFB800]" />
              <span className="font-bold">{avg.toFixed(1)}</span>
              {reviewCount > 0 ? (
                <span className="text-[#878787]">({reviewCount})</span>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Address */}
        {studio.address ? (
          <div className="mt-3 flex gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#E86D4F]" />
            <div className="min-w-0 flex-1">
              {studio.locationName ? (
                <p className="font-bold text-[#3F3F3F]">
                  {studio.locationName}
                </p>
              ) : null}
              <div className="flex items-start gap-2">
                <p className="min-w-0 flex-1 text-sm leading-snug text-[#878787]">
                  {studio.address}
                </p>
                <button
                  type="button"
                  onClick={() => void copyAddress()}
                  className="shrink-0 rounded-md p-1 text-[#3F3F3F] hover:bg-black/5"
                  aria-label={copied ? 'Copied' : 'Copy address'}
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Contacts */}
        {(studio.phone || studio.email || studio.website || igHref) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {studio.phone ? (
              <ContactChip
                href={`tel:${studio.phone}`}
                icon={<Phone className="h-4 w-4 text-[#E86D4F]" />}
                label={studio.phone}
              />
            ) : null}
            {studio.email ? (
              <ContactChip
                href={`mailto:${studio.email}`}
                icon={<Mail className="h-4 w-4 text-[#E86D4F]" />}
                label={studio.email}
              />
            ) : null}
            {studio.website ? (
              <ContactChip
                href={studio.website}
                icon={<Globe className="h-4 w-4 text-[#E86D4F]" />}
                label="Website"
              />
            ) : null}
            {igHref ? (
              <ContactChip
                href={igHref}
                icon={<Instagram className="h-4 w-4 text-[#E86D4F]" />}
                label="Instagram"
              />
            ) : null}
          </div>
        )}

        {/* View schedule CTA */}
        <button
          type="button"
          onClick={scrollToSchedule}
          className="relative mt-4 flex w-full items-center gap-4 rounded-[14px] bg-[#E86D4F] px-3.5 py-3.5 text-left text-white hover:bg-[#d85e42]"
        >
          <CalendarDays className="h-6 w-6 shrink-0" aria-hidden />
          <span className="min-w-0 flex-1 pr-6">
            <span className="block text-sm font-semibold">View schedule</span>
            <span className="block text-[11px] text-white/90">
              See all classes and book
            </span>
          </span>
          <ChevronRight className="absolute right-2 top-1/2 h-7 w-7 -translate-y-1/2" />
        </button>

        {/* About */}
        {desc ? (
          <section className="mt-6">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.04em] text-[#3F3F3F]">
              About
            </h2>
            <div className="mt-3 rounded-[14px] bg-white p-3.5 text-sm leading-relaxed text-[#5C5C5C]">
              <p className="whitespace-pre-line">
                {descLong && !descOpen ? `${desc.slice(0, 140).trim()}…` : desc}
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
          </section>
        ) : null}

        {/* Categories */}
        {categoryIds.length > 0 ? (
          <div className="mt-5 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {categoryIds.map((id, index) => {
              const cat = byId.get(id);
              const fallback = studio.categoryLabels.find((c) => c.id === id);
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
                  className="inline-flex h-8 shrink-0 items-center rounded-full px-3 text-xs font-semibold"
                  style={{ backgroundColor: bg, color: fg }}
                >
                  {label}
                </span>
              );
            })}
          </div>
        ) : null}

        {/* Reviews */}
        {reviews.length > 0 ? (
          <section className="mt-6">
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
        <section id="studio-schedule" className="mt-6 scroll-mt-24">
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

        <p className="mt-8 text-center text-xs text-[#878787]">
          <a
            href={withLocale('/studios', locale)}
            className="hover:text-[#E86D4F]"
          >
            ← All studios
          </a>
        </p>
      </div>
    </div>
  );
}
