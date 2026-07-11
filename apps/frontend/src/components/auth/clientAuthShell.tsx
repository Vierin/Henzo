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
import { ClientLoginMarketingPanel } from '@/components/auth/clientLoginMarketingPanel';

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
    <div className="flex min-h-screen font-wix-madefor-display">
      <div className="flex min-h-screen w-full flex-col bg-[#FDF5F0] lg:w-1/2">
        <header className="flex items-center justify-between px-6 py-5 sm:px-10 sm:py-6">
          <Link href={homePath} className="shrink-0" aria-label="Henzo">
            <Image
              src="/logo.png"
              alt="Henzo"
              width={120}
              height={40}
              className="h-9 w-auto object-contain"
              priority
            />
          </Link>

          <LanguageDropdown
            dropdownRef={dropdownRef}
            isOpen={isLanguageDropdownOpen}
            selectedLanguage={selectedLanguage}
            languages={publicHeaderLanguages}
            onToggle={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
            onSelect={handleLanguageSelect}
            buttonClassName="flex items-center gap-1.5 rounded-full border border-[#E8E0D8] bg-white px-3 py-2 text-sm font-medium text-[#3F3F3F] transition hover:border-[#E86D4F]/40"
          />
        </header>

        <main className="flex flex-1 flex-col items-center justify-center px-6 pb-8 sm:px-10">
          <div className="w-full max-w-[400px]">{children}</div>
        </main>

        <footer className="px-6 pb-6 text-center text-xs text-[#878787] sm:px-10 sm:pb-8">
          <p>{String(t('auth.copyright'))}</p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <Link
              href={privacyPath}
              className="transition hover:text-[#E86D4F]"
            >
              {String(t('auth.privacyPolicy'))}
            </Link>
            <Link href={termsPath} className="transition hover:text-[#E86D4F]">
              {String(t('auth.termsOfService'))}
            </Link>
          </div>
        </footer>
      </div>

      <ClientLoginMarketingPanel />
    </div>
  );
}

export function ClientAuthShell({ children }: Props) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#FDF5F0]">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#E86D4F] border-t-transparent" />
        </div>
      }
    >
      <ClientAuthShellContent>{children}</ClientAuthShellContent>
    </Suspense>
  );
}
