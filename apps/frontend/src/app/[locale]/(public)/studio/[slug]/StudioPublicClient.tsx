'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Share2, Star } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import type { Locale } from '@/i18n/routing';
import type { PublicStudioPayload } from './types';

type Props = {
  locale: Locale;
  studio: PublicStudioPayload;
};

function serviceName(s: PublicStudioPayload['services'][0]): string {
  return s.name;
}

function categoryLabel(
  c: PublicStudioPayload['services'][0]['trainingCategory'],
  loc: Locale,
): string {
  if (!c) return '';
  if (loc === 'ru' && c.nameRu) return c.nameRu;
  if (loc === 'vi' && c.nameVn) return c.nameVn;
  return c.nameEn || '';
}

function studioDescription(studio: PublicStudioPayload, loc: Locale): string {
  if (loc === 'ru' && studio.descriptionRu) return studio.descriptionRu;
  if (loc === 'vi' && studio.descriptionVi) return studio.descriptionVi;
  if (studio.descriptionEn) return studio.descriptionEn;
  return studio.description || '';
}

export default function StudioPublicClient({ locale, studio }: Props) {
  const router = useRouter();
  const scheduleRef = useRef<HTMLDivElement>(null);
  const pricingRef = useRef<HTMLDivElement>(null);

  const photos =
    studio.photos?.filter(Boolean).length > 0
      ? studio.photos.filter(Boolean)
      : [];

  const categoryParts = Array.from(
    new Set(
      studio.services
        .map((s) => categoryLabel(s.trainingCategory, locale))
        .filter(Boolean),
    ),
  );

  const copy = {
    en: {
      reviews: (n: number) => `${n} reviews`,
      viewSchedule: 'View schedule',
      viewPricing: 'View pricing',
      services: 'Services & schedule',
      pricing: 'Pricing',
      duration: 'min',
      call: 'Call',
      email: 'Email',
      linkCopied: 'Link copied',
    },
    ru: {
      reviews: (n: number) =>
        n === 1 ? '1 отзыв' : n < 5 ? `${n} отзыва` : `${n} отзывов`,
      viewSchedule: 'Расписание',
      viewPricing: 'Цены',
      services: 'Услуги и расписание',
      pricing: 'Прайс',
      duration: 'мин',
      call: 'Позвонить',
      email: 'Почта',
      linkCopied: 'Ссылка скопирована',
    },
    vi: {
      reviews: (n: number) => `${n} đánh giá`,
      viewSchedule: 'Lịch',
      viewPricing: 'Bảng giá',
      services: 'Dịch vụ & lịch',
      pricing: 'Giá',
      duration: 'phút',
      call: 'Gọi',
      email: 'Email',
      linkCopied: 'Đã sao chép liên kết',
    },
  } as const;
  const t = copy[locale] ?? copy.en;

  const scrollTo = (el: React.RefObject<HTMLDivElement | null>) => {
    el.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const onShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    try {
      if (navigator.share) {
        await navigator.share({ title: studio.name, url });
      } else {
        await navigator.clipboard.writeText(url);
        alert(t.linkCopied);
      }
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        alert(t.linkCopied);
      } catch {
        // ignore
      }
    }
  };

  const lat = studio.latitude;
  const lon = studio.longitude;
  const mapOk =
    typeof lat === 'number' &&
    typeof lon === 'number' &&
    !Number.isNaN(lat) &&
    !Number.isNaN(lon);

  const rating = studio.avgRating ?? 0;
  const reviewCount = studio.reviewCount ?? 0;
  const fullStars = Math.round(rating);

  return (
    <div className="min-h-dvh bg-[#F8F5F2] pb-28">
      {/* Hero */}
      <div className="relative h-[min(42vh,320px)] w-full overflow-hidden bg-neutral-800">
        {photos.length > 0 ? (
          <Swiper
            modules={[Pagination]}
            pagination={{ clickable: true }}
            className="h-full w-full [&_.swiper-pagination-bullet]:bg-white/70 [&_.swiper-pagination-bullet-active]:bg-white"
            loop={photos.length > 1}
          >
            {photos.map((src) => (
              <SwiperSlide key={src} className="!h-[min(42vh,320px)]">
                <img
                  src={src}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="eager"
                />
              </SwiperSlide>
            ))}
          </Swiper>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-neutral-700 to-neutral-900 text-4xl font-semibold text-white/90">
            {studio.name.slice(0, 1).toUpperCase()}
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/20" />

        <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between px-3 pt-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition hover:bg-black/40"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <p className="pointer-events-none line-clamp-1 max-w-[50%] text-center text-xs font-semibold uppercase tracking-widest text-white drop-shadow">
            {studio.name}
          </p>
          <button
            type="button"
            onClick={onShare}
            className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition hover:bg-black/40"
            aria-label="Share"
          >
            <Share2 className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Info card */}
      <div className="relative z-[1] -mt-4 rounded-t-3xl bg-white px-4 pb-6 pt-5 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]">
        <div className="flex gap-3">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-[#f1e9e5] bg-[#F8F5F2]">
            {photos[0] ? (
              <img
                src={photos[0]}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-lg font-bold text-[#ff5b5b]">
                {studio.name.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold leading-tight text-gray-900">
              {studio.name}
            </h1>
            {categoryParts.length > 0 && (
              <p className="mt-1.5 text-sm text-gray-500">
                {categoryParts.join(' | ')}
              </p>
            )}
            {studio.address && (
              <p className="mt-2 text-sm text-gray-500">{studio.address}</p>
            )}
            <div className="mt-2 flex items-center gap-1.5 text-sm text-gray-500">
              <div className="flex text-amber-500">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star
                    key={i}
                    className="h-4 w-4"
                    fill={i < fullStars ? 'currentColor' : 'none'}
                  />
                ))}
              </div>
              <span>
                {reviewCount > 0
                  ? t.reviews(reviewCount)
                  : locale === 'ru'
                    ? 'Нет отзывов'
                    : 'No reviews yet'}
              </span>
            </div>
          </div>
        </div>

        {descriptionText(studio, locale) && (
          <p className="mt-4 text-sm leading-relaxed text-gray-600">
            {descriptionText(studio, locale)}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {studio.phone && (
            <a
              href={`tel:${studio.phone}`}
              className="inline-flex rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-50"
            >
              {t.call}
            </a>
          )}
          {studio.email && (
            <a
              href={`mailto:${studio.email}`}
              className="inline-flex rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-50"
            >
              {t.email}
            </a>
          )}
        </div>
      </div>

      {/* Map */}
      {mapOk && (
        <div className="mx-4 mt-4 overflow-hidden rounded-2xl border border-[#f1e9e5] bg-white shadow-sm">
          <p className="border-b border-[#f1e9e5] px-3 py-2 text-xs font-medium text-gray-500">
            Map
          </p>
          <iframe
            title="Map"
            className="h-[220px] w-full border-0"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${lon! - 0.015}%2C${lat! - 0.01}%2C${lon! + 0.015}%2C${lat! + 0.01}&layer=mapnik&marker=${lat}%2C${lon}`}
            loading="lazy"
          />
          <p className="px-3 py-1 text-right text-[10px] text-gray-400">
            <a
              href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              OpenStreetMap
            </a>
          </p>
        </div>
      )}

      <div ref={scheduleRef} id="schedule" className="mx-4 mt-6 scroll-mt-28">
        <h2 className="text-lg font-semibold text-gray-900">{t.services}</h2>
        <ul className="mt-3 space-y-2">
          {studio.services.map((s) => (
            <li
              key={s.id}
              className="rounded-xl border border-[#f1e9e5] bg-white px-4 py-3 text-sm text-gray-800 shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
            >
              <div className="font-medium">{serviceName(s)}</div>
              <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
                {s.duration != null && (
                  <span>
                    {s.duration} {t.duration}
                  </span>
                )}
                {categoryLabel(s.trainingCategory, locale) && (
                  <span>{categoryLabel(s.trainingCategory, locale)}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div ref={pricingRef} id="pricing" className="mx-4 mt-8 scroll-mt-28">
        <h2 className="text-lg font-semibold text-gray-900">{t.pricing}</h2>
        <ul className="mt-3 space-y-2">
          {studio.services.map((s) => (
            <li
              key={`p-${s.id}`}
              className="flex items-center justify-between rounded-xl border border-[#f1e9e5] bg-white px-4 py-3 text-sm shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
            >
              <span className="text-gray-800">{serviceName(s)}</span>
              <span className="font-semibold text-gray-900">
                {s.price != null
                  ? new Intl.NumberFormat(
                      locale === 'vi'
                        ? 'vi-VN'
                        : locale === 'ru'
                          ? 'ru-RU'
                          : 'en-US',
                      { maximumFractionDigits: 0 },
                    ).format(s.price)
                  : '—'}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="pb-8 pt-6 text-center">
        <Link
          href={`/${locale}`}
          className="text-sm font-medium text-[#ff5b5b] hover:underline"
        >
          Henzo
        </Link>
      </p>

      {/* Sticky CTAs */}
      <div className="fixed bottom-0 left-0 right-0 z-20 flex gap-2 border-t border-gray-200 bg-white/95 px-3 py-3 backdrop-blur-md">
        <button
          type="button"
          onClick={() => scrollTo(scheduleRef)}
          className="flex-1 rounded-lg bg-gray-900 py-3 text-center text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-black"
        >
          {t.viewSchedule}
        </button>
      </div>
    </div>
  );
}

function descriptionText(studio: PublicStudioPayload, locale: Locale): string {
  const d = studioDescription(studio, locale);
  return d?.trim() || '';
}
