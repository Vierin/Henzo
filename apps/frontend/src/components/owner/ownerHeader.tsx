'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  extractLocaleFromPath,
  hardNavigateToLocalePath,
  withLocale,
  type Locale,
} from '@/i18n/routing';
import { User, LogOut, ChevronDown } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { getPublicSupabase } from '@/lib/supabase-public';
import { clearOwnerAuthCookie } from '@/lib/owner/auth-session-cookie';
import { useOwnerStudio } from '@/contexts/OwnerStudioContext';

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

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
    { code: 'cs', name: 'Čeština', flag: '🇨🇿' },
    { code: 'pl', name: 'Polski', flag: '🇵🇱' },
  ] as const;

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
      hardNavigateToLocalePath('/business/login', currentLocale);
    }
  };

  return (
    <header className="sticky w-full top-0 bg-white/80 backdrop-blur border-b border-[#f1d9d7] z-[300]">
      <div className="mx-auto max-w-7xl md:px-6 px-4 py-2 flex items-center justify-between">
        <div className="hidden md:block text-sm text-gray-600 font-medium truncate pl-2">
          {studio?.name ?? ''}
        </div>
        <div className="flex items-center gap-4 ml-auto mr-10 md:mr-0">
          <div className="relative" ref={languageDropdownRef}>
            <button
              onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-[#ff5b5b] font-medium transition-colors border border-gray-200 rounded-lg hover:border-[#ff5b5b]"
            >
              <span>{currentLocale.toUpperCase()}</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${
                  isLanguageDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
            {isLanguageDropdownOpen && (
              <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                {languages.map((language) => (
                  <button
                    key={language.code}
                    onClick={() => {
                      setIsLanguageDropdownOpen(false);
                      router.push(
                        withLocale(pathname, language.code as Locale),
                      );
                    }}
                    className={`w-full px-4 py-3 text-left hover:bg-[#ff5b5b]/30 transition-colors flex items-center gap-3 first:rounded-t-lg last:rounded-b-lg ${
                      currentLocale === language.code
                        ? 'bg-[#ff5b5b] text-white'
                        : 'text-gray-700'
                    }`}
                  >
                    <span className="text-lg">{language.flag}</span>
                    <span className="font-medium">{language.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="hidden md:block relative" ref={dropdownRef}>
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="flex items-center gap-2 text-sm text-gray-700 font-medium hover:text-gray-900 transition-colors"
            >
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-gray-600" />
              </div>
              <span>{t('header.profile') || 'Profile'}</span>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>
            {showProfileDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-100">
                  <div className="font-medium truncate">
                    {email?.split('@')[0] || email || 'Owner'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {t('header.owner') || 'Owner'}
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <LogOut className="w-4 h-4" />
                  {isLoggingOut
                    ? t('header.loggingOut') || 'Logging out...'
                    : t('header.logout') || 'Log out'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
