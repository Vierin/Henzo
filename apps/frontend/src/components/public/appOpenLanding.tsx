'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Image from 'next/image';
import {
  AppleStoreIcon,
  GooglePlayIcon,
} from '@/components/landing/storeIcons';
import { LanguageDropdown } from '@/components/landing/languageDropdown';
import {
  publicHeaderLanguages,
  usePublicHeaderState,
} from '@/components/usePublicHeaderState';
import { useTranslation } from '@/contexts/LanguageContext';
import { appStoreUrl } from '@/constants/appStores';
import {
  getMobilePlatform,
  playStoreUrlWithDeepLink,
  copyDeepLinkForDeferredOpen,
  storeUrlForPlatform,
  tryOpenDeepLink,
  type MobilePlatform,
} from '@/lib/appOpenFallback';

type AppOpenLandingProps = {
  title: string;
  description: string;
  deepLink: string;
  /** Auto-attempt deep link on mobile (Universal Link fallback). */
  autoOpenOnMobile?: boolean;
  footer?: ReactNode;
  icon?: 'class' | 'studio' | 'invite';
};

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 13 12"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M0.5 4.77778H12.5M3.16667 0.5V1.72222M9.83333 0.5V1.72222M2.63333 11.5H10.3667C11.1134 11.5 11.4868 11.5 11.772 11.3668C12.0229 11.2496 12.2269 11.0626 12.3547 10.8327C12.5 10.5712 12.5 10.2289 12.5 9.54444V3.67778C12.5 2.99327 12.5 2.65101 12.3547 2.38957C12.2269 2.15959 12.0229 1.97261 11.772 1.85544C11.4868 1.72222 11.1134 1.72222 10.3667 1.72222H2.63333C1.8866 1.72222 1.51323 1.72222 1.22801 1.85544C0.977127 1.97261 0.773153 2.15959 0.645327 2.38957C0.5 2.65101 0.5 2.99327 0.5 3.67778V9.54444C0.5 10.2289 0.5 10.5712 0.645327 10.8327C0.773153 11.0626 0.977127 11.2496 1.22801 11.3668C1.51323 11.5 1.88659 11.5 2.63333 11.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LandingIcon({ kind }: { kind: AppOpenLandingProps['icon'] }) {
  if (kind === 'class') {
    return <CalendarIcon className="h-8 w-8 text-[#ff5b5b]" />;
  }
  if (kind === 'studio') {
    return (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
          fill="#ff5b5b"
        />
        <circle cx="12" cy="9" r="2.5" fill="white" />
      </svg>
    );
  }
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
        fill="#ff5b5b"
      />
      <circle cx="12" cy="9" r="2.5" fill="white" />
    </svg>
  );
}

export function AppOpenLanding({
  title,
  description,
  deepLink,
  autoOpenOnMobile = false,
  footer,
  icon = 'invite',
}: AppOpenLandingProps) {
  const t = useTranslation();
  const {
    dropdownRef,
    isLanguageDropdownOpen,
    setIsLanguageDropdownOpen,
    selectedLanguage,
    handleLanguageSelect,
  } = usePublicHeaderState();
  const [platform, setPlatform] = useState<MobilePlatform>('other');
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    setPlatform(getMobilePlatform());
  }, []);

  useEffect(() => {
    if (!autoOpenOnMobile || platform === 'other') return;
    const timer = window.setTimeout(() => {
      void copyDeepLinkForDeferredOpen(deepLink);
      tryOpenDeepLink(deepLink);
      setAttempted(true);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [autoOpenOnMobile, deepLink, platform]);

  async function handleOpenApp() {
    await copyDeepLinkForDeferredOpen(deepLink);
    tryOpenDeepLink(deepLink);
    setAttempted(true);
  }

  const androidStoreUrl = playStoreUrlWithDeepLink(deepLink);
  const storeUrl =
    platform === 'android' ? androidStoreUrl : storeUrlForPlatform(platform);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-white px-6 py-12">
      <div className="absolute right-4 top-4 z-50">
        <LanguageDropdown
          dropdownRef={dropdownRef}
          isOpen={isLanguageDropdownOpen}
          selectedLanguage={selectedLanguage}
          languages={publicHeaderLanguages}
          onToggle={() => setIsLanguageDropdownOpen((v) => !v)}
          onSelect={handleLanguageSelect}
          buttonClassName="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        />
      </div>

      <div className="mb-10">
        <Image src="/logo.png" alt="Henzo" width={160} height={56} priority />
      </div>

      <div className="flex w-full max-w-sm flex-col items-center gap-6 rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50">
          <LandingIcon kind={icon} />
        </div>

        <div>
          <h1 className="mb-2 text-xl font-bold text-gray-900">{title}</h1>
          <p className="text-sm leading-relaxed text-gray-500">{description}</p>
        </div>

        <button
          type="button"
          onClick={handleOpenApp}
          className="w-full rounded-xl bg-[#ff5b5b] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#e54f4f]"
        >
          {t('appOpen.openApp')}
        </button>

        {attempted && (
          <p className="text-xs text-gray-400">
            {t('appOpen.didntOpen')}{' '}
            <a
              href={storeUrl}
              className="font-medium text-[#ff5b5b] underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('appOpen.download')}
            </a>
          </p>
        )}

        <div className="flex w-full items-center gap-3">
          <div className="h-px flex-1 bg-gray-100" />
          <span className="text-xs text-gray-400">
            {t('appOpen.orDownload')}
          </span>
          <div className="h-px flex-1 bg-gray-100" />
        </div>

        <div className="flex w-full flex-col gap-3">
          <a
            href={appStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              void copyDeepLinkForDeferredOpen(deepLink);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 transition-colors hover:bg-gray-50"
          >
            <AppleStoreIcon className="h-5 w-5" />
            <span className="text-sm font-medium text-gray-800">
              {t('appOpen.appStore')}
            </span>
          </a>
          <a
            href={androidStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              void copyDeepLinkForDeferredOpen(deepLink);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 transition-colors hover:bg-gray-50"
          >
            <GooglePlayIcon className="h-5 w-5" />
            <span className="text-sm font-medium text-gray-800">
              {t('appOpen.googlePlay')}
            </span>
          </a>
        </div>

        {footer}
      </div>

      <p className="mt-8 text-xs text-gray-400">
        © {new Date().getFullYear()} Henzo
      </p>
    </div>
  );
}
