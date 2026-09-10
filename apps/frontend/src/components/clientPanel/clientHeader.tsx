'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, LogOut, User } from 'lucide-react';
import {
  extractLocaleFromPath,
  hardNavigateToLocalePath,
  withLocale,
  type Locale,
} from '@/i18n/routing';
import { clearClientAuthCookie } from '@/lib/client-panel/auth-session-cookie';
import { clientTheme } from '@/lib/client-panel/client-theme';
import { fetchClientUser } from '@/lib/client-panel/fetch-profile';
import { getPublicSupabase } from '@/lib/supabase-public';

function clientInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'CL';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

export default function ClientHeader() {
  const pathname = usePathname();
  const router = useRouter();
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
    queryKey: ['client-user'],
    queryFn: fetchClientUser,
  });

  const clientName =
    profileQuery.data?.name?.trim() || email?.split('@')[0] || 'Client';
  const initials = useMemo(() => clientInitials(clientName), [clientName]);
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
      clearClientAuthCookie();
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
        backgroundColor: `${clientTheme.bg}cc`,
        borderColor: clientTheme.borderSoft,
      }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-end px-3 py-2.5 md:px-6 lg:px-8">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="relative" ref={languageDropdownRef}>
            <button
              type="button"
              onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
              className="flex h-10 items-center gap-1.5 rounded-[12px] border-0 bg-white px-3.5 text-sm font-semibold"
              style={{ color: clientTheme.text }}
              aria-label="Change language"
            >
              <span>{currentLocale.toUpperCase()}</span>
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${
                  isLanguageDropdownOpen ? 'rotate-180' : ''
                }`}
                style={{ color: clientTheme.textSecondary }}
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
                            backgroundColor: clientTheme.accent,
                            color: '#FFFFFF',
                          }
                        : { color: clientTheme.text }
                    }
                  >
                    <span className="text-base">{language.flag}</span>
                    <span>{language.name}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="flex h-10 max-w-[220px] items-center gap-2 rounded-full bg-white py-0 pl-1 pr-2.5 transition-colors hover:bg-white sm:max-w-none"
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold"
                style={{
                  backgroundColor: clientTheme.bgSoft,
                  color: clientTheme.text,
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
                  style={{ color: clientTheme.text }}
                >
                  {clientName}
                </span>
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 shrink-0 transition-transform ${
                  showProfileDropdown ? 'rotate-180' : ''
                }`}
                style={{ color: clientTheme.textSecondary }}
              />
            </button>

            {showProfileDropdown ? (
              <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-2xl bg-white py-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileDropdown(false);
                    router.push(path('/profile'));
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors hover:bg-[#FFFCF9]"
                  style={{ color: clientTheme.text }}
                >
                  <User className="h-4 w-4" />
                  Profile
                </button>
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  disabled={isLoggingOut}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                >
                  <LogOut className="h-4 w-4" />
                  {isLoggingOut ? 'Logging out...' : 'Log out'}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
