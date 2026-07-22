'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { extractLocaleFromPath, withLocale } from '@/i18n/routing';
import type { LanguageOption } from '@/components/landing/languageDropdown';
import { prepareScrollTriggersForLocaleNavigation } from '@/utils/viewport';

export const publicHeaderLanguages: readonly LanguageOption[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'cs', name: 'Čeština', flag: '🇨🇿' },
  { code: 'pl', name: 'Polski', flag: '🇵🇱' },
];

export function usePublicHeaderState() {
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('EN');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentLocale = extractLocaleFromPath(pathname) ?? 'en';

  const handleLanguageSelect = (lang: LanguageOption) => {
    if (lang.code === currentLocale) {
      setIsLanguageDropdownOpen(false);
      return;
    }

    const basePath = withLocale(pathname, lang.code);
    const query = searchParams.toString();
    const target = query ? `${basePath}?${query}` : basePath;
    setIsLanguageDropdownOpen(false);
    // Kill pins first — setLanguage() used to rebuild ST mid-scroll before reload.
    prepareScrollTriggersForLocaleNavigation();
    window.location.assign(target);
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

  return {
    pathname,
    currentLocale,
    dropdownRef,
    isLanguageDropdownOpen,
    setIsLanguageDropdownOpen,
    selectedLanguage,
    handleLanguageSelect,
  };
}
