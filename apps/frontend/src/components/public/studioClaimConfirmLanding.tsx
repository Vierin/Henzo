'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
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
import { publicEnv } from '@/lib/public-env';
import {
  buildStudioClaimDeepLink,
  copyDeepLinkForDeferredOpen,
  getMobilePlatform,
  playStoreUrlWithDeepLink,
  storeUrlForPlatform,
  tryOpenDeepLink,
  type MobilePlatform,
} from '@/lib/appOpenFallback';

type ConfirmResult = {
  success: boolean;
  alreadyConfirmed?: boolean;
  studioName?: string | null;
  trainingName?: string;
  clientName?: string;
  startsAt?: string;
  manageUrl?: string;
};

function formatStartsAt(raw?: string, locale?: string): string {
  if (!raw) return '—';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  try {
    return new Intl.DateTimeFormat(locale || 'en', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(d);
  } catch {
    return d.toLocaleString();
  }
}

export function StudioClaimConfirmLanding({ token }: { token: string }) {
  const t = useTranslation();
  const {
    dropdownRef,
    isLanguageDropdownOpen,
    setIsLanguageDropdownOpen,
    selectedLanguage,
    currentLocale,
    handleLanguageSelect,
  } = usePublicHeaderState();
  const [platform, setPlatform] = useState<MobilePlatform>('other');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ConfirmResult | null>(null);

  const manageDeepLink = buildStudioClaimDeepLink(token, 'manage');
  const manageHref = `/${currentLocale}/studio-claim/${encodeURIComponent(token)}?action=manage`;

  useEffect(() => {
    setPlatform(getMobilePlatform());
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${publicEnv.apiUrl}/studios/claim/${encodeURIComponent(token)}/confirm-booking`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          },
        );
        const body = (await res.json().catch(() => ({}))) as ConfirmResult & {
          message?: string | string[];
          statusCode?: number;
        };
        if (!res.ok) {
          const msg = Array.isArray(body.message)
            ? body.message[0]
            : body.message;
          throw new Error(msg || t('appOpen.studioClaimConfirm.errorGeneric'));
        }
        if (!cancelled) setResult(body);
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? e.message
              : t('appOpen.studioClaimConfirm.errorGeneric'),
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [token, t]);

  async function handleManageInApp() {
    await copyDeepLinkForDeferredOpen(manageDeepLink);
    tryOpenDeepLink(manageDeepLink);
  }

  const androidStoreUrl = playStoreUrlWithDeepLink(manageDeepLink);
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
        {loading ? (
          <p className="text-sm text-gray-400">
            {t('appOpen.studioClaimConfirm.loading')}
          </p>
        ) : error ? (
          <>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-2xl">
              !
            </div>
            <div>
              <h1 className="mb-2 text-xl font-bold text-gray-900">
                {t('appOpen.studioClaimConfirm.errorTitle')}
              </h1>
              <p className="text-sm leading-relaxed text-gray-500">{error}</p>
            </div>
            <Link
              href={manageHref}
              className="w-full rounded-xl border-2 border-[#ff5b5b] px-6 py-3 text-center font-semibold text-[#ff5b5b] transition-colors hover:bg-orange-50"
            >
              {t('appOpen.studioClaimConfirm.manageCta')}
            </Link>
          </>
        ) : (
          <>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
              >
                <path
                  d="M9 12.5l2 2 4-4.5"
                  stroke="#059669"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="#059669"
                  strokeWidth="2"
                />
              </svg>
            </div>

            <div>
              <h1 className="mb-2 text-xl font-bold text-gray-900">
                {result?.alreadyConfirmed
                  ? t('appOpen.studioClaimConfirm.alreadyTitle')
                  : t('appOpen.studioClaimConfirm.title')}
              </h1>
              <p className="text-sm leading-relaxed text-gray-500">
                {t('appOpen.studioClaimConfirm.description').replace(
                  '{studio}',
                  result?.studioName || 'studio',
                )}
              </p>
            </div>

            <div className="w-full rounded-xl bg-[#FAF6F2] px-4 py-3 text-left text-sm text-gray-700">
              <div>
                <span className="text-gray-500">
                  {t('appOpen.studioClaimConfirm.client')}:{' '}
                </span>
                {result?.clientName || '—'}
              </div>
              <div>
                <span className="text-gray-500">
                  {t('appOpen.studioClaimConfirm.class')}:{' '}
                </span>
                {result?.trainingName || '—'}
              </div>
              <div>
                <span className="text-gray-500">
                  {t('appOpen.studioClaimConfirm.when')}:{' '}
                </span>
                {formatStartsAt(result?.startsAt, currentLocale)}
              </div>
            </div>

            <button
              type="button"
              onClick={() => void handleManageInApp()}
              className="w-full rounded-xl bg-[#ff5b5b] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#e54f4f]"
            >
              {t('appOpen.studioClaimConfirm.manageCta')}
            </button>

            <p className="text-xs text-gray-400">
              {t('appOpen.didntOpen')}{' '}
              <Link
                href={manageHref}
                className="font-medium text-[#ff5b5b] underline"
              >
                {t('appOpen.studioClaimConfirm.openManagePage')}
              </Link>
              {' · '}
              <a
                href={storeUrl}
                className="font-medium text-[#ff5b5b] underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('appOpen.download')}
              </a>
            </p>

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
                  void copyDeepLinkForDeferredOpen(manageDeepLink);
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
                  void copyDeepLinkForDeferredOpen(manageDeepLink);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 transition-colors hover:bg-gray-50"
              >
                <GooglePlayIcon className="h-5 w-5" />
                <span className="text-sm font-medium text-gray-800">
                  {t('appOpen.googlePlay')}
                </span>
              </a>
            </div>
          </>
        )}
      </div>

      <p className="mt-8 text-xs text-gray-400">
        © {new Date().getFullYear()} Henzo
      </p>
    </div>
  );
}
