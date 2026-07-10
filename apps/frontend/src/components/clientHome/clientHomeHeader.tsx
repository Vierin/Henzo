'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronDown, MapPin } from 'lucide-react';
import { withLocale } from '@/i18n/routing';
import { useTranslation } from '@/contexts/LanguageContext';
import {
  publicHeaderLanguages,
  usePublicHeaderState,
} from '@/components/usePublicHeaderState';
import { LanguageDropdown } from '@/components/landing/languageDropdown';
import { appStoreUrl, playStoreUrl } from '@/constants/appStores';

function ClientHomeHeaderContent() {
  const {
    currentLocale,
    dropdownRef,
    isLanguageDropdownOpen,
    setIsLanguageDropdownOpen,
    selectedLanguage,
    handleLanguageSelect,
  } = usePublicHeaderState();
  const t = useTranslation();
  const locale = currentLocale as 'en' | 'ru' | 'vi';
  const homePath = withLocale('/', locale);

  const location = String(t('homepage.client.header.location'));
  const login = String(t('homepage.client.header.login'));
  const signUp = String(t('homepage.client.header.signUp'));

  return (
    <header className="relative z-40 bg-transparent">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
        <Link
          href={homePath}
          className="flex min-w-0 shrink-0 items-center"
          aria-label="Henzo"
        >
          <Image
            src="/logo.png"
            alt="Henzo"
            width={120}
            height={40}
            className="h-8 w-auto object-contain sm:h-10"
            priority
          />
        </Link>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            className="hidden items-center gap-1.5 rounded-full border border-[#E8E0D8] bg-white/80 px-3 py-2 text-sm font-medium text-[#3F3F3F] transition hover:border-[#E86D4F]/30 sm:flex"
            aria-label={location}
          >
            <MapPin className="h-4 w-4 text-[#E86D4F]" aria-hidden />
            <span className="max-w-[9rem] truncate">{location}</span>
            <ChevronDown className="h-4 w-4 text-[#878787]" aria-hidden />
          </button>

          <LanguageDropdown
            dropdownRef={dropdownRef}
            isOpen={isLanguageDropdownOpen}
            selectedLanguage={selectedLanguage}
            languages={publicHeaderLanguages}
            onToggle={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
            onSelect={handleLanguageSelect}
            buttonClassName="flex h-9 w-9 items-center justify-center rounded-full border border-[#E8E0D8] bg-white/80 text-xs font-medium text-[#3F3F3F] transition hover:border-[#E86D4F]/30 sm:h-10 sm:w-10"
          />

          <a
            href={appStoreUrl}
            target="_blank"
            rel="noreferrer"
            className="hidden text-sm font-medium text-[#3F3F3F] transition hover:text-[#E86D4F] sm:inline"
          >
            {login}
          </a>

          <a
            href={playStoreUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-full bg-[#E86D4F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#d85e42] sm:px-5 sm:py-2.5"
          >
            {signUp}
          </a>
        </div>
      </div>
    </header>
  );
}

export function ClientHomeHeader() {
  return (
    <Suspense
      fallback={
        <header className="relative z-40 bg-transparent">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
            <div className="h-8 w-24 animate-pulse rounded-md bg-[#E8E0D8]/80 sm:h-10 sm:w-28" />
            <div className="h-9 w-20 animate-pulse rounded-full bg-[#E8E0D8]/80" />
          </div>
        </header>
      }
    >
      <ClientHomeHeaderContent />
    </Suspense>
  );
}
