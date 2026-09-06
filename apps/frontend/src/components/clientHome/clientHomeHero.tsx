'use client';

import { FormEvent, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Calendar,
  Clock,
  Heart,
  Search,
  Smartphone,
} from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { ClientHomeHeader } from '@/components/clientHome/clientHomeHeader';
import { ClientHomeCategoryLinks } from '@/components/clientHome/clientHomeCategoryLinks';
import type { PublicTrainingCategory } from '@/lib/client/training-category';
import { withLocale, type Locale } from '@/i18n/routing';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=900&q=85';

const AVATAR_URLS = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&q=80',
];

const BASE = 'homepage.client.hero';

type Props = {
  categories: PublicTrainingCategory[];
  locale: Locale;
};

export function ClientHomeHero({ categories, locale }: Props) {
  const t = useTranslation();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const line1 = String(t(`${BASE}.line1`));
  const line2Highlight = String(t(`${BASE}.line2Highlight`));
  const subtitle = String(t(`${BASE}.subtitle`));
  const searchPlaceholder = String(t(`${BASE}.searchPlaceholder`));
  const floatingTitle = String(t(`${BASE}.floatingCardTitle`));
  const floatingSubtitle = String(t(`${BASE}.floatingCardSubtitle`));

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    const base = withLocale('/studios', locale);
    router.push(q ? `${base}?search=${encodeURIComponent(q)}` : base);
  };

  const features = [
    {
      icon: Calendar,
      color: 'bg-[#E86D4F]',
      title: String(t(`${BASE}.features.findClasses.title`)),
      subtitle: String(t(`${BASE}.features.findClasses.subtitle`)),
    },
    {
      icon: Clock,
      color: 'bg-[#3F3287]',
      title: String(t(`${BASE}.features.bookFast.title`)),
      subtitle: String(t(`${BASE}.features.bookFast.subtitle`)),
    },
    {
      icon: Heart,
      color: 'bg-[#FF6B4A]',
      title: String(t(`${BASE}.features.reminders.title`)),
      subtitle: String(t(`${BASE}.features.reminders.subtitle`)),
    },
    {
      icon: Smartphone,
      color: 'bg-[#5B8DEF]',
      title: String(t(`${BASE}.features.allInOne.title`)),
      subtitle: String(t(`${BASE}.features.allInOne.subtitle`)),
    },
  ];

  return (
    <section className="relative overflow-hidden bg-[#F9F4F0] font-wix-madefor-display">
      <ClientHomeHeader />

      <div className="mx-auto max-w-7xl px-4 pb-8 pt-4 sm:px-6 sm:pb-12 sm:pt-6 lg:pb-16">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-8 xl:gap-12">
          {/* Left */}
          <div className="relative z-10">
            <h1 className="text-[2.25rem] font-bold leading-[1.08] tracking-tight text-[#3F3F3F] sm:text-5xl lg:text-[3.5rem]">
              {line1}
              <span className="mt-1 block text-[#E86D4F]">
                {line2Highlight}
              </span>
            </h1>

            <p className="mt-4 max-w-md text-base leading-relaxed text-[#878787] sm:mt-5 sm:text-lg">
              {subtitle}
            </p>

            <form
              className="mt-7 flex items-center rounded-full border border-[#E8E0D8] bg-white p-1.5 shadow-[0_8px_30px_-12px_rgba(63,50,135,0.15)] sm:mt-8"
              onSubmit={onSearch}
              role="search"
            >
              <label htmlFor="client-home-search" className="sr-only">
                {searchPlaceholder}
              </label>
              <div className="flex min-w-0 flex-1 items-center gap-2 pl-3 sm:pl-4">
                <Search
                  className="h-5 w-5 shrink-0 text-[#878787]"
                  aria-hidden
                />
                <input
                  id="client-home-search"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-[#3F3F3F] outline-none placeholder:text-[#878787] sm:text-base"
                />
              </div>
              <button
                type="submit"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E86D4F] text-white transition hover:bg-[#d85e42] sm:h-12 sm:w-12"
                aria-label="Search"
              >
                <ArrowRight className="h-5 w-5" aria-hidden />
              </button>
            </form>
          </div>

          {/* Right ÔÇö visual */}
          <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
            <div
              className="pointer-events-none absolute -right-4 top-8 h-48 w-48 rounded-full bg-[#FDF5F0] sm:h-64 sm:w-64"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute right-12 top-24 h-32 w-32 rounded-full bg-[#FFE5DC] sm:h-40 sm:w-40"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -left-4 bottom-16 h-40 w-56 rounded-[3rem] bg-[#EDE8F5] sm:h-52 sm:w-72"
              aria-hidden
            />

            <div
              className="pointer-events-none absolute right-0 top-1/2 hidden -translate-y-1/2 opacity-20 lg:block"
              aria-hidden
            >
              <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
                <path
                  d="M60 100 C60 100 20 70 20 45 C20 30 35 15 60 15 C85 15 100 30 100 45 C100 70 60 100 60 100Z"
                  stroke="#E86D4F"
                  strokeWidth="2"
                  fill="none"
                />
              </svg>
            </div>

            <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] sm:rounded-[2.5rem]">
              <Image
                src={HERO_IMAGE}
                alt=""
                fill
                priority
                sizes="(max-width: 1024px) 90vw, 45vw"
                className="object-cover object-center"
              />
            </div>

            <div className="absolute -bottom-2 right-0 z-10 flex max-w-[16rem] items-center gap-3 rounded-2xl border border-[#F0EBE6] bg-white p-3 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.12)] sm:-bottom-4 sm:right-4 sm:max-w-xs sm:rounded-3xl sm:p-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#3F3F3F]">
                  {floatingTitle}
                </p>
                <p className="mt-0.5 text-xs text-[#878787]">
                  {floatingSubtitle}
                </p>
                <div className="mt-2 flex items-center">
                  {AVATAR_URLS.map((url, i) => (
                    <div
                      key={url}
                      className="relative -ml-2 first:ml-0 h-7 w-7 overflow-hidden rounded-full border-2 border-white sm:h-8 sm:w-8"
                      style={{ zIndex: AVATAR_URLS.length - i }}
                    >
                      <Image
                        src={url}
                        alt=""
                        fill
                        sizes="32px"
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <button
                type="button"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#3F3F3F] text-white transition hover:bg-[#2a2a2a] sm:h-10 sm:w-10"
                aria-label={floatingTitle}
              >
                <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
        </div>

        <ClientHomeCategoryLinks
          initialCategories={categories}
          locale={locale}
        />

        {/* Feature bar */}
        <div className="mt-10 grid gap-3 sm:mt-14 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {features.map(({ icon: Icon, color, title, subtitle: sub }) => (
            <div
              key={title}
              className="flex items-start gap-3 rounded-2xl border border-[#F0EBE6] bg-white p-4 sm:rounded-3xl sm:p-5"
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${color} text-white`}
              >
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-snug text-[#3F3F3F] sm:text-[0.95rem]">
                  {title}
                </p>
                <p className="mt-0.5 text-xs text-[#878787] sm:text-sm">
                  {sub}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
