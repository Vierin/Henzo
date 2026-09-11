'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { UserRound } from 'lucide-react';
import { stripLocaleFromPath, withLocale, type Locale } from '@/i18n/routing';
import { useTranslation } from '@/contexts/LanguageContext';
import {
  publicHeaderLanguages,
  usePublicHeaderState,
} from '@/components/usePublicHeaderState';
import { LanguageDropdown } from '@/components/landing/languageDropdown';
import { ClientLocationPicker } from '@/components/clientHome/clientLocationPicker';
import { CLIENT_AUTH_COOKIE } from '@/lib/client-panel/auth-session-cookie';
import {
  fetchClientUser,
  type ClientProfileUser,
} from '@/lib/client-panel/fetch-profile';

function hasClientCookie() {
  if (typeof document === 'undefined') return false;
  return document.cookie
    .split(';')
    .some((c) => c.trim().startsWith(`${CLIENT_AUTH_COOKIE}=`));
}

/** Location chip in header on browse/studio pages — not on home (picker lives in hero). */
function shouldShowHeaderLocation(pathname: string | null): boolean {
  if (!pathname) return false;
  const path = stripLocaleFromPath(pathname);
  return (
    path === '/studios' ||
    path.startsWith('/studios/') ||
    path.startsWith('/studio/') ||
    path.startsWith('/category/') ||
    path.startsWith('/class')
  );
}

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
  const pathname = usePathname();
  const locale = currentLocale as Locale;
  const homePath = withLocale('/', locale);
  const showLocation = useMemo(
    () => shouldShowHeaderLocation(pathname),
    [pathname],
  );
  const [isClientAuthed, setIsClientAuthed] = useState(false);
  const [clientUser, setClientUser] = useState<ClientProfileUser | null>(null);

  useEffect(() => {
    const authed = hasClientCookie();
    setIsClientAuthed(authed);
    if (!authed) {
      setClientUser(null);
      return;
    }
    let cancelled = false;
    void fetchClientUser()
      .then((user) => {
        if (!cancelled) setClientUser(user);
      })
      .catch(() => {
        if (!cancelled) setClientUser(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = String(t('homepage.client.header.login'));
  const signUp = String(t('homepage.client.header.signUp'));
  const forBusiness = String(
    t('homepage.client.header.forBusiness') || 'Business',
  );
  const locationFallback = String(
    t('homepage.client.header.location') || 'Set location',
  );

  const displayName =
    clientUser?.name?.trim() || clientUser?.email?.split('@')[0] || 'Profile';

  // No display utilities here — callers add `hidden` / `inline-flex` (Tailwind
  // source order otherwise lets `inline-flex` override `hidden`).
  const ghostBtn =
    'h-10 items-center rounded-full bg-white/90 px-3.5 text-sm font-medium text-[#3F3F3F] transition hover:bg-white hover:text-[#E86D4F] sm:px-4';

  return (
    <header className="relative z-40 bg-transparent">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
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
        </div>

        <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
          {showLocation ? (
            <ClientLocationPicker
              fallbackLabel={locationFallback}
              className="min-w-0"
            />
          ) : null}

          <LanguageDropdown
            dropdownRef={dropdownRef}
            isOpen={isLanguageDropdownOpen}
            selectedLanguage={selectedLanguage}
            languages={publicHeaderLanguages}
            onToggle={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
            onSelect={handleLanguageSelect}
            buttonClassName="flex h-10 items-center gap-1 rounded-full bg-white/90 px-2.5 text-xs font-medium text-[#3F3F3F] transition hover:bg-white sm:gap-2 sm:px-3 sm:text-sm"
          />

          {!isClientAuthed ? (
            <Link
              href={withLocale('/business', locale)}
              className={`hidden md:inline-flex ${ghostBtn}`}
            >
              {forBusiness}
            </Link>
          ) : null}

          {isClientAuthed ? (
            <Link
              href={withLocale('/profile', locale)}
              className="flex h-10 max-w-[min(100%,220px)] items-center gap-2 rounded-full bg-white/90 py-0 pl-1 pr-2.5 transition hover:bg-white sm:max-w-[280px]"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#F8EDE5] text-[#3F3F3F]">
                {clientUser?.avatarUrl ? (
                  <img
                    src={clientUser.avatarUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserRound className="h-[18px] w-[18px]" />
                )}
              </span>
              <span className="min-w-0 truncate text-sm font-semibold text-[#3F3F3F]">
                {displayName}
              </span>
            </Link>
          ) : (
            <>
              <Link
                href={withLocale('/login', locale)}
                className={`inline-flex ${ghostBtn}`}
              >
                {login}
              </Link>

              <Link
                href={withLocale('/register', locale)}
                className="hidden h-10 items-center rounded-full bg-[#E86D4F] px-4 text-sm font-semibold text-white transition hover:bg-[#d85e42] sm:inline-flex sm:px-5"
              >
                {signUp}
              </Link>
            </>
          )}
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
