'use client';

import { Suspense, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { withLocale } from '@/i18n/routing';
import { useTranslation } from '@/contexts/LanguageContext';
import {
  publicHeaderLanguages,
  usePublicHeaderState,
} from '@/components/usePublicHeaderState';
import { LanguageDropdown } from '@/components/landing/languageDropdown';

type Props = {
  children: ReactNode;
};

function ClientAuthShellContent({ children }: Props) {
  const t = useTranslation();
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
  const privacyPath = withLocale('/privacy-policy', locale);
  const termsPath = withLocale('/terms-of-service', locale);

  return (
    <div className="relative min-h-screen bg-[#FEFDF9] font-wix-madefor-display">
      {/* Desktop: image pinned right (matches DevTools tweak: 80% / left auto) */}
      <div
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-[80%] lg:block"
        aria-hidden
      >
        <Image
          src="/images/bg-login.webp"
          alt=""
          fill
          priority
          sizes="80vw"
          className="object-cover object-center"
        />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="relative z-40">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2.5 sm:gap-4 md:px-12 md:py-5">
            <Link href={homePath} className="shrink-0" aria-label="Henzo">
              <Image
                src="/logo.png"
                alt="Henzo"
                width={161}
                height={52}
                className="h-[40px] w-auto object-contain sm:h-[58px]"
                priority
              />
            </Link>

            <LanguageDropdown
              dropdownRef={dropdownRef}
              isOpen={isLanguageDropdownOpen}
              selectedLanguage={selectedLanguage}
              languages={publicHeaderLanguages}
              onToggle={() =>
                setIsLanguageDropdownOpen(!isLanguageDropdownOpen)
              }
              onSelect={handleLanguageSelect}
              buttonClassName="flex items-center gap-1.5 rounded-full border border-[#E8E0D8] bg-white px-3 py-2 text-sm font-medium text-[#3F3F3F] transition hover:border-[#E86D4F]/40"
            />
          </div>
        </header>

        <main className="flex flex-1 flex-col justify-center py-8">
          <div className="mx-auto w-full max-w-6xl px-3 md:px-12">
            <div className="w-full max-w-[400px]">{children}</div>
          </div>
        </main>

        <footer className="pb-6 sm:pb-8">
          <div className="mx-auto max-w-6xl px-3 text-left text-xs text-[#878787] md:px-12">
            <p>{String(t('auth.copyright'))}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
              <Link
                href={privacyPath}
                className="transition hover:text-[#E86D4F]"
              >
                {String(t('auth.privacyPolicy'))}
              </Link>
              <Link
                href={termsPath}
                className="transition hover:text-[#E86D4F]"
              >
                {String(t('auth.termsOfService'))}
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export function ClientAuthShell({ children }: Props) {
  return (
    <Suspense
      fallback={
        <div className="relative flex min-h-screen items-center justify-center bg-[#FEFDF9]">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#E86D4F] border-t-transparent" />
        </div>
      }
    >
      <ClientAuthShellContent>{children}</ClientAuthShellContent>
    </Suspense>
  );
}
