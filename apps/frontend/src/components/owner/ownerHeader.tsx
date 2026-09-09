'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  extractLocaleFromPath,
  hardNavigateToLocalePath,
  withLocale,
  type Locale,
} from '@/i18n/routing';
import { Bell, LogOut, ChevronDown, User } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { useOwnerStudio } from '@/contexts/OwnerStudioContext';
import { getPublicSupabase } from '@/lib/supabase-public';
import { clearOwnerAuthCookie } from '@/lib/owner/auth-session-cookie';
import { fetchOwnerAccountProfile } from '@/lib/owner/fetch-account';
import {
  OWNER_NOTIFICATIONS_QUERY_KEY,
  fetchOwnerNotificationsInbox,
  ownerUnreadCount,
} from '@/lib/owner/fetch-notifications';
import { ownerTheme } from '@/lib/owner/owner-theme';

function ownerInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'SO';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

export default function OwnerHeader() {
  const t = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const { studio } = useOwnerStudio();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const languageDropdownRef = useRef<HTMLDivElement>(null);

  const currentLocale = (extractLocaleFromPath(pathname) ?? 'en') as Locale;
  const path = (p: string) => withLocale(p, currentLocale);

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  ] as const;

  const profileQuery = useQuery({
    queryKey: ['owner-account-profile'],
    queryFn: fetchOwnerAccountProfile,
  });

  const notificationsQuery = useQuery({
    queryKey: OWNER_NOTIFICATIONS_QUERY_KEY,
    queryFn: fetchOwnerNotificationsInbox,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });

  const unreadCount = ownerUnreadCount(notificationsQuery.data ?? []);
  const hasUnread = unreadCount > 0;

  const ownerName =
    profileQuery.data?.name?.trim() || email?.split('@')[0] || 'Owner';
  const initials = useMemo(() => ownerInitials(ownerName), [ownerName]);
  const avatarUrl = profileQuery.data?.avatarUrl;

  useEffect(() => {
    void getPublicSupabase()
      .auth.getSession()
      .then(({ data }) => {
        setEmail(data.session?.user.email ?? null);
      });
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowProfileDropdown(false);
      }
      if (
        languageDropdownRef.current &&
        !languageDropdownRef.current.contains(event.target as Node)
      ) {
        setIsLanguageDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    try {
      setIsLoggingOut(true);
      setShowProfileDropdown(false);
      clearOwnerAuthCookie();
      await getPublicSupabase().auth.signOut({ scope: 'local' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      hardNavigateToLocalePath('/login', currentLocale);
    }
  };

  return (
    <header
      className="sticky top-0 z-[300] w-full border-b backdrop-blur-md"
      style={{
        backgroundColor: `${ownerTheme.bg}cc`,
        borderColor: ownerTheme.borderSoft,
      }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-end px-3 py-2.5 md:px-6 lg:px-8">
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Language */}
          <div className="relative" ref={languageDropdownRef}>
            <button
              type="button"
              onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
              className="flex h-10 items-center gap-1.5 rounded-[12px] border-0 bg-white px-3.5 text-sm font-semibold"
              style={{ color: ownerTheme.text }}
              aria-label="Change language"
            >
              <span>{currentLocale.toUpperCase()}</span>
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${
                  isLanguageDropdownOpen ? 'rotate-180' : ''
                }`}
                style={{ color: ownerTheme.textSecondary }}
              />
            </button>
            {isLanguageDropdownOpen ? (
              <div className="absolute right-0 top-full z-50 mt-1.5 w-44 overflow-hidden rounded-2xl bg-white py-1 shadow-lg">
                {languages.map((language) => (
                  <button
                    key={language.code}
                    type="button"
                    onClick={() => {
                      setIsLanguageDropdownOpen(false);
                      router.push(
                        withLocale(pathname, language.code as Locale),
                      );
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium transition-colors"
                    style={
                      currentLocale === language.code
                        ? {
                            backgroundColor: ownerTheme.accent,
                            color: '#FFFFFF',
                          }
                        : { color: ownerTheme.text }
                    }
                  >
                    <span className="text-base">{language.flag}</span>
                    <span>{language.name}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {/* Notifications — mobile parity: pill + count when unread */}
          <button
            type="button"
            className={
              hasUnread
                ? 'flex h-10 min-w-[52px] items-center justify-center gap-1.5 rounded-full border-0 px-3.5'
                : 'relative flex h-10 w-10 items-center justify-center rounded-full border-0 bg-white'
            }
            style={
              hasUnread
                ? { backgroundColor: ownerTheme.accent, color: '#fff' }
                : undefined
            }
            aria-label={
              hasUnread
                ? `Notifications, ${unreadCount} unread`
                : 'Notifications'
            }
            onClick={() => router.push(path('/notifications'))}
          >
            <Bell
              className="h-[18px] w-[18px] shrink-0"
              strokeWidth={1.75}
              style={{ color: hasUnread ? '#fff' : ownerTheme.text }}
            />
            {hasUnread ? (
              <span className="min-w-[0.75rem] text-[15px] font-bold leading-none tabular-nums text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            ) : null}
          </button>

          {/* Studio / profile */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="flex h-10 max-w-[220px] items-center gap-2 rounded-full bg-white py-0 pl-1 pr-2.5 transition-colors hover:bg-white sm:max-w-none"
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold"
                style={{
                  backgroundColor: ownerTheme.bgSoft,
                  color: ownerTheme.text,
                }}
              >
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials
                )}
              </span>
              <span className="hidden min-w-0 text-left sm:block">
                <span
                  className="block truncate text-[13px] font-bold leading-tight"
                  style={{ color: ownerTheme.text }}
                >
                  {ownerName}
                </span>
                <span
                  className="block truncate text-[11px] font-medium leading-tight"
                  style={{ color: ownerTheme.textSecondary }}
                >
                  Studio Owner
                </span>
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 shrink-0 transition-transform ${
                  showProfileDropdown ? 'rotate-180' : ''
                }`}
                style={{ color: ownerTheme.textSecondary }}
              />
            </button>

            {showProfileDropdown ? (
              <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-2xl bg-white py-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileDropdown(false);
                    router.push(path('/salon-info/account'));
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors hover:bg-[#FFFCF9]"
                  style={{ color: ownerTheme.text }}
                >
                  <User className="h-4 w-4" />
                  {t('header.profile') || 'Account'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  disabled={isLoggingOut}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                >
                  <LogOut className="h-4 w-4" />
                  {isLoggingOut
                    ? t('header.loggingOut') || 'Logging out...'
                    : t('header.logout') || 'Log out'}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
