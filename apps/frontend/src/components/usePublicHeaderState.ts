'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { extractLocaleFromPath, withLocale } from '@/i18n/routing';
import { useLanguage } from '@/contexts/LanguageContext';
import type { LanguageOption } from '@/components/landing/languageDropdown';

export const publicHeaderLanguages: readonly LanguageOption[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
];

export function usePublicHeaderState() {
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('EN');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setLanguage } = useLanguage();

  const currentLocale = extractLocaleFromPath(pathname) ?? 'en';

  const handleLanguageSelect = (lang: LanguageOption) => {
    setLanguage(lang.code);
    const basePath = withLocale(pathname, lang.code);
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
