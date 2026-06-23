'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { withLocale } from '@/i18n/routing';
import {
  publicHeaderLanguages,
  usePublicHeaderState,
} from '@/components/usePublicHeaderState';
import { PublicHeaderActions } from '@/components/publicHeaderActions';

function PublicHeaderContent({
  hideLanguageSwitcher = false,
}: {
  hideLanguageSwitcher?: boolean;
}) {
  const {
    currentLocale,
    dropdownRef,
    isLanguageDropdownOpen,
    setIsLanguageDropdownOpen,
    selectedLanguage,
    handleLanguageSelect,
  } = usePublicHeaderState();
  const locale = currentLocale as 'en' | 'ru' | 'vi';
  const homePath = withLocale('/', locale);

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link
          href={homePath}
          className="flex min-w-0 items-center gap-2 sm:gap-3"
        >
          <Image
            src="/logo.png"
            alt="Henzo"
            width={88}
            height={40}
            className="h-9 w-auto shrink-0 object-contain sm:h-10"
          />
        </Link>

        <PublicHeaderActions
          dropdownRef={dropdownRef}
          isLanguageDropdownOpen={isLanguageDropdownOpen}
          setIsLanguageDropdownOpen={setIsLanguageDropdownOpen}
          selectedLanguage={selectedLanguage}
          languages={publicHeaderLanguages}
          onLanguageSelect={handleLanguageSelect}
          hideLanguageSwitcher={hideLanguageSwitcher}
          hideGetApp
        />
      </div>
    </header>
  );
}

export default function PublicHeader({
  hideLanguageSwitcher = false,
}: {
  hideLanguageSwitcher?: boolean;
}) {
  return (
    <Suspense
      fallback={
        <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div className="h-8 w-28 rounded-md bg-gray-100 animate-pulse sm:h-10 sm:w-32" />
              <div className="h-9 w-[4.5rem] rounded-full bg-gray-100 animate-pulse sm:h-10 sm:w-24" />
            </div>
          </div>
        </header>
      }
    >
      <PublicHeaderContent hideLanguageSwitcher={hideLanguageSwitcher} />
    </Suspense>
  );
}
