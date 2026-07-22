'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { withLocale, type Locale } from '@/i18n/routing';
import { useTranslation } from '@/contexts/LanguageContext';
import {
  publicHeaderLanguages,
  usePublicHeaderState,
} from '@/components/usePublicHeaderState';
import { PublicHeaderActions } from '@/components/publicHeaderActions';

function LandingHeaderContent({ sectionNavHref }: { sectionNavHref?: string }) {
  const {
    pathname,
    currentLocale,
    dropdownRef,
    isLanguageDropdownOpen,
    setIsLanguageDropdownOpen,
    selectedLanguage,
    handleLanguageSelect,
  } = usePublicHeaderState();
  const t = useTranslation();

  const navBenefits = String(t('homepage.studio.header.navBenefits'));
  const navPricing = String(t('homepage.studio.header.navPricing'));
  const navHowItWorks = String(t('homepage.studio.header.navHowItWorks'));
  const sectionNavBase = sectionNavHref ?? pathname.split('#')[0];
  const locale = currentLocale as Locale;

  return (
    <header className="relative z-40 bg-transparent">
      <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2.5 md:px-12 md:py-5 sm:gap-4">
        <Link
          href={withLocale('/', locale)}
          className="relative z-10 flex min-w-0 items-center gap-2 sm:gap-3"
        >
          <Image
            src="/logo.png"
            alt="Henzo"
            width={161}
            height={52}
            className="h-[40px] sm:h-[58px] w-auto shrink-0 object-contain"
          />
        </Link>

        <div className="flex items-center gap-12">
          <nav
            className="relative hidden gap-6 text-[1rem] font-medium text-[#3F3F3F] sm:flex md:gap-8"
            aria-label="Landing"
          >
            <a
              href={`${sectionNavBase}#benefits`}
              className="whitespace-nowrap transition hover:text-[#E86D4F]"
            >
              {navBenefits}
            </a>
            <a
              href={`${sectionNavBase}#pricing`}
              className="whitespace-nowrap transition hover:text-[#E86D4F]"
            >
              {navPricing}
            </a>
            <a
              href={`${sectionNavBase}#how-it-works`}
              className="whitespace-nowrap transition hover:text-[#E86D4F]"
            >
              {navHowItWorks}
            </a>
          </nav>

          <div className="relative z-10 shrink-0">
            <PublicHeaderActions
              dropdownRef={dropdownRef}
              isLanguageDropdownOpen={isLanguageDropdownOpen}
              setIsLanguageDropdownOpen={setIsLanguageDropdownOpen}
              selectedLanguage={selectedLanguage}
              languages={publicHeaderLanguages}
              onLanguageSelect={handleLanguageSelect}
              buttonClassName="flex items-center gap-1 rounded-full border border-[#eadfd7] bg-white/90 px-2.5 py-2 text-xs font-medium text-[#3F3F3F] transition hover:border-[#E86D4F]/40 hover:bg-white sm:gap-2 sm:px-3 sm:py-2 sm:text-sm"
              storeButtonClassName="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#3F3F3F] text-[#3F3F3F] transition hover:border-[#E86D4F]/40 hover:bg-white sm:h-10 sm:w-10"
            />
          </div>
        </div>
      </div>
    </header>
  );
}

export default function LandingHeader({
  sectionNavHref,
}: {
  sectionNavHref?: string;
}) {
  return (
    <Suspense
      fallback={
        <header className="relative z-40 bg-transparent">
          <div className="flex items-center justify-between gap-3 px-1 py-1 sm:px-2">
            <div className="h-8 w-28 rounded-md bg-[#eadfd7]/80 animate-pulse sm:h-10 sm:w-32" />
            <div className="h-9 w-[4.5rem] rounded-full bg-[#eadfd7]/80 animate-pulse sm:h-10 sm:w-24" />
          </div>
        </header>
      }
    >
      <LandingHeaderContent sectionNavHref={sectionNavHref} />
    </Suspense>
  );
}
