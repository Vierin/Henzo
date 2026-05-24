'use client';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  AppleStoreIcon,
  GooglePlayIcon,
} from '@/components/landing/storeIcons';
import { extractLocaleFromPath, withLocale } from '@/i18n/routing';
import { useLanguage, useTranslation } from '@/contexts/LanguageContext';
import { appStoreUrl, playStoreUrl } from '@/constants/appStores';
import {
  LanguageDropdown,
  type LanguageOption,
} from '@/components/landing/languageDropdown';

function PublicHeaderContent({
  embedded = false,
}: {
  /** Sits inside a card: no full-width sticky bar. */
  embedded?: boolean;
}) {
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('EN');
  const [isScrolledDown, setIsScrolledDown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setLanguage } = useLanguage();
  const t = useTranslation();

  const currentLocale = extractLocaleFromPath(pathname) ?? 'en';

  const languages: readonly LanguageOption[] = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  ];

  const handleLanguageSelect = (lang: LanguageOption) => {
    setLanguage(lang.code as 'en' | 'ru' | 'vi');
    const basePath = withLocale(pathname, lang.code as 'en' | 'ru' | 'vi');
    const query = searchParams.toString();
    const target = query ? `${basePath}?${query}` : basePath;
    setIsLanguageDropdownOpen(false);
    router.replace(target);
  };

  useEffect(() => {
    setSelectedLanguage(currentLocale.toUpperCase());
  }, [currentLocale]);

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (
      dropdownRef.current &&
      !dropdownRef.current.contains(event.target as Node)
    ) {
      setIsLanguageDropdownOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

  useEffect(() => {
    if (embedded) {
      return;
    }

    const handleScroll = () => {
      setIsScrolledDown(window.scrollY > 0);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [embedded]);

  const getAppLabel = String(t('homepage.studio.header.getApp'));
  const navBenefits = String(t('homepage.studio.header.navBenefits'));
  const navPricing = String(t('homepage.studio.header.navPricing'));
  const navHowItWorks = String(t('homepage.studio.header.navHowItWorks'));

  const shellClass = embedded
    ? 'relative z-40 bg-transparent'
    : `sticky top-0 z-40 border-b border-[#eadfd7]/70 bg-[#F9F4F0]/85 backdrop-blur-md will-change-transform transition-[transform,opacity] duration-300 ${
        isScrolledDown
          ? '-translate-y-1/2 opacity-70'
          : 'translate-y-0 opacity-100'
      }`;

  if (embedded) {
    return (
      <header className={shellClass}>
        <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2.5 md:px-12 md:py-5 sm:gap-4">
          <Link
            href={withLocale('/', currentLocale as 'en' | 'ru' | 'vi')}
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
              className="relative gap-6 text-[1rem] font-medium text-[#3F3F3F] hidden md:gap-8 sm:flex"
              aria-label="Landing"
            >
              <a
                href={`${pathname.split('#')[0]}#benefits`}
                className="whitespace-nowrap transition hover:text-[#E86D4F]"
              >
                {navBenefits}
              </a>
              <a
                href={`${pathname.split('#')[0]}#pricing`}
                className="whitespace-nowrap transition hover:text-[#E86D4F]"
              >
                {navPricing}
              </a>
              <a
                href={`${pathname.split('#')[0]}#how-it-works`}
                className="whitespace-nowrap transition hover:text-[#E86D4F]"
              >
                {navHowItWorks}
              </a>
            </nav>

            <div className="relative z-10 shrink-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <LanguageDropdown
                  dropdownRef={dropdownRef}
                  isOpen={isLanguageDropdownOpen}
                  selectedLanguage={selectedLanguage}
                  languages={languages}
                  onToggle={() =>
                    setIsLanguageDropdownOpen(!isLanguageDropdownOpen)
                  }
                  onSelect={handleLanguageSelect}
                  buttonClassName="flex items-center gap-1 rounded-full border border-[#eadfd7] bg-white/90 px-2.5 py-2 text-xs font-medium text-[#3F3F3F] transition hover:border-[#E86D4F]/40 hover:bg-white sm:gap-2 sm:px-3 sm:py-2 sm:text-sm"
                />
                <a
                  href={appStoreUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="App Store"
                  className="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#3F3F3F] text-[#3F3F3F] transition hover:border-[#E86D4F]/40 hover:bg-white sm:h-10 sm:w-10"
                >
                  <AppleStoreIcon className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                </a>
                <a
                  href={playStoreUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Google Play"
                  className="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#3F3F3F] text-[#3F3F3F] transition hover:border-[#E86D4F]/40 hover:bg-white sm:h-10 sm:w-10"
                >
                  <GooglePlayIcon className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className={shellClass}>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link
          href={withLocale('/', currentLocale as 'en' | 'ru' | 'vi')}
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

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <LanguageDropdown
            dropdownRef={dropdownRef}
            isOpen={isLanguageDropdownOpen}
            selectedLanguage={selectedLanguage}
            languages={languages}
            onToggle={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
            onSelect={handleLanguageSelect}
            buttonClassName="flex items-center gap-1 rounded-full border border-[#eadfd7] bg-white/90 px-2.5 py-2 text-xs font-medium text-[#3F3F3F] shadow-sm transition hover:border-[#E86D4F]/40 hover:bg-white sm:gap-2 sm:px-3 sm:py-2.5 sm:text-sm"
          />
          <a
            href={appStoreUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="App Store"
            className="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#eadfd7] bg-white/90 text-[#3F3F3F] shadow-sm transition hover:border-[#E86D4F]/40 hover:bg-white sm:h-10 sm:w-10"
          >
            <AppleStoreIcon className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
          </a>
          <a
            href={playStoreUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="Google Play"
            className="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#eadfd7] bg-white/90 text-[#3F3F3F] shadow-sm transition hover:border-[#E86D4F]/40 hover:bg-white sm:h-10 sm:w-10"
          >
            <GooglePlayIcon className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
          </a>
          <a
            href={`${pathname.split('#')[0]}#get-app`}
            className="inline-flex items-center rounded-full bg-[#E86D4F] px-3 py-2 text-xs font-semibold text-white shadow-[0_10px_28px_rgba(232,109,79,0.28)] transition hover:bg-[#d85e42] sm:px-4 sm:py-2.5 sm:text-sm"
          >
            {getAppLabel}
          </a>
        </div>
      </div>
    </header>
  );
}

export default function PublicHeader({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  return (
    <Suspense
      fallback={
        <header
          className={
            embedded
              ? 'relative z-40 bg-transparent'
              : 'sticky top-0 z-40 border-b border-[#eadfd7]/70 bg-[#F9F4F0]/85 backdrop-blur-md'
          }
        >
          <div
            className={
              embedded
                ? 'flex items-center justify-between gap-3 px-1 py-1 sm:px-2'
                : 'mx-auto max-w-7xl px-4 py-4 md:px-6'
            }
          >
            <div className="flex w-full items-center justify-between gap-3">
              <div className="h-8 w-28 rounded-md bg-[#eadfd7]/80 animate-pulse sm:h-10 sm:w-32" />
              <div className="h-9 w-[4.5rem] rounded-full bg-[#eadfd7]/80 animate-pulse sm:h-10 sm:w-24" />
            </div>
          </div>
        </header>
      }
    >
      <PublicHeaderContent embedded={embedded} />
    </Suspense>
  );
}
