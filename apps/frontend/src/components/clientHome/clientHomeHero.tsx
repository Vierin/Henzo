'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Search } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { ClientHomeHeader } from '@/components/clientHome/clientHomeHeader';
import { ClientHomeCategoryLinks } from '@/components/clientHome/clientHomeCategoryLinks';
import { ClientLocationPicker } from '@/components/clientHome/clientLocationPicker';
import type { PublicTrainingCategory } from '@/lib/client/training-category';
import { withLocale, type Locale } from '@/i18n/routing';

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
  const locationFallback = String(
    t('homepage.client.header.location') || 'Set location',
  );

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    const base = withLocale('/studios', locale);
    router.push(q ? `${base}?search=${encodeURIComponent(q)}` : base);
  };

  return (
    <section className="relative flex min-h-[90svh] flex-col overflow-hidden bg-[#F9F4F0] font-wix-madefor-display">
      <div
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-[60%] bg-[url('/images/hero-bg.webp')] bg-cover bg-center lg:block [mask-image:linear-gradient(to_right,transparent_0%,black_32%)] [-webkit-mask-image:linear-gradient(to_right,transparent_0%,black_32%)]"
        aria-hidden
      />

      <ClientHomeHeader />

      <div className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-4 pb-12 pt-6 sm:px-6 sm:pb-16 sm:pt-10 lg:pb-20 lg:pt-14">
        <div className="max-w-xl lg:max-w-[52%]">
          <h1 className="text-[2.35rem] font-bold leading-[1.08] tracking-tight text-[#3F3F3F] sm:text-5xl lg:text-[3.4rem]">
            {line1} <span className="text-[#E86D4F]">{line2Highlight}</span>
          </h1>

          <p className="mt-4 max-w-lg text-base leading-relaxed text-[#878787] sm:mt-5 sm:text-lg">
            {subtitle}
          </p>

          <form
            className="mt-7 rounded-[28px] border border-[#E8E0D8] bg-white p-2 shadow-[0_12px_40px_-16px_rgba(63,50,135,0.18)] sm:mt-9 sm:rounded-full sm:p-1.5"
            onSubmit={onSearch}
            role="search"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-0">
              <label
                htmlFor="client-home-search"
                className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-3 py-2.5 sm:rounded-none sm:px-4 sm:py-1.5"
              >
                <Search
                  className="h-5 w-5 shrink-0 text-[#878787]"
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="sr-only">{searchPlaceholder}</span>
                  <input
                    id="client-home-search"
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="w-full bg-transparent py-1 text-[15px] font-medium text-[#3F3F3F] outline-none placeholder:text-[#3F3F3F]/70 sm:text-base"
                  />
                </span>
              </label>

              <div
                className="mx-3 hidden h-10 w-px shrink-0 bg-[#E8E0D8] sm:block"
                aria-hidden
              />

              <div className="flex items-center justify-between gap-2 px-2 pb-1 sm:justify-end sm:px-1 sm:pb-0 sm:pr-1">
                <ClientLocationPicker
                  variant="hero"
                  fallbackLabel={locationFallback}
                  className="min-w-0"
                />
                <button
                  type="submit"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E86D4F] text-white transition hover:bg-[#d85e42] sm:h-12 sm:w-12"
                  aria-label="Search"
                >
                  <ArrowRight className="h-5 w-5" aria-hidden />
                </button>
              </div>
            </div>
          </form>

          <ClientHomeCategoryLinks
            initialCategories={categories}
            locale={locale}
            variant="popular"
            className="mt-6 sm:mt-8"
          />
        </div>
      </div>
    </section>
  );
}
