'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { appStoreUrl, playStoreUrl } from '@/constants/appStores';
import {
  getMobilePlatform,
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

function LandingIcon({ kind }: { kind: AppOpenLandingProps['icon'] }) {
  if (kind === 'class') {
    return (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="4" width="18" height="17" rx="3" fill="#ff5b5b" />
        <path
          d="M8 2v4M16 2v4M3 10h18"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
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
  const [platform, setPlatform] = useState<MobilePlatform>('other');
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    setPlatform(getMobilePlatform());
  }, []);

  useEffect(() => {
    if (!autoOpenOnMobile || platform === 'other') return;
    const timer = window.setTimeout(() => {
      tryOpenDeepLink(deepLink);
      setAttempted(true);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [autoOpenOnMobile, deepLink, platform]);

  function handleOpenApp() {
    tryOpenDeepLink(deepLink);
    setAttempted(true);
  }

  const storeUrl = storeUrlForPlatform(platform);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 py-12">
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
          Open Henzo App
        </button>

        {attempted && (
          <p className="text-xs text-gray-400">
            App didn&apos;t open?{' '}
            <a
              href={storeUrl}
              className="font-medium text-[#ff5b5b] underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Download Henzo
            </a>
          </p>
        )}

        <div className="flex w-full items-center gap-3">
          <div className="h-px flex-1 bg-gray-100" />
          <span className="text-xs text-gray-400">or download the app</span>
          <div className="h-px flex-1 bg-gray-100" />
        </div>

        <div className="flex w-full flex-col gap-3">
          <a
            href={appStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 transition-colors hover:bg-gray-50"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98l-.09.06c-.22.14-2.15 1.26-2.13 3.75.03 2.98 2.61 3.97 2.64 3.98l-.06.29zM13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
            </svg>
            <span className="text-sm font-medium text-gray-800">App Store</span>
          </a>
          <a
            href={playStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 transition-colors hover:bg-gray-50"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3.18 23.76c.3.17.65.19.96.07l12.14-7.37-2.76-2.76-10.34 10zm16.35-9.75L5.82 5.92c-.36-.18-.78-.14-1.1.1L16.86 18.16l2.67-4.15zM2.22 6.44c-.14.27-.22.56-.22.88v9.36c0 .32.08.61.22.88l10.4-10.4-10.4-.72zM19.77 10.5l-1.96-1.2-3.08 3.08 3.08 3.08 1.98-1.21c.56-.34.9-.94.9-1.57s-.36-1.24-.92-1.18z" />
            </svg>
            <span className="text-sm font-medium text-gray-800">
              Google Play
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
