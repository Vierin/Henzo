'use client';

import Link from 'next/link';
import { useTranslation } from '@/contexts/LanguageContext';
import { extractLocaleFromPath, withLocale } from '@/i18n/routing';
import { usePathname } from 'next/navigation';
import PublicHeader from '@/components/PublicHeader';
import { useModuleTranslations } from '@/i18n/useTranslations';
import { useMemo } from 'react';

export default function NotFoundClient() {
  const pathname = usePathname();
  const locale = extractLocaleFromPath(pathname) ?? 'en';

  // Explicitly load notFound module
  const { dictionary: notFoundDict } = useModuleTranslations(
    ['public/notFound'],
    locale,
  );

  // Get base translations function
  const baseT = useTranslation();

  // Create merged translation function
  const t = useMemo(() => {
    // Module 'public/notFound' is mapped to 'notFound' in the dictionary (see modules.ts line 195)
    // We need to access it as 'notFound' and then map to 'public.notFound'
    const notFoundData = notFoundDict?.notFound;

    return (key: string) => {
      // If key starts with 'public.notFound.', try to get from notFound module first
      if (key.startsWith('public.notFound.')) {
        const notFoundKey = key.replace('public.notFound.', '');
        if (notFoundData && notFoundData[notFoundKey] !== undefined) {
          return notFoundData[notFoundKey];
        }
      }

      // Fallback to base translations
      return baseT(key);
    };
  }, [baseT, notFoundDict]);

  return (
    <>
      <PublicHeader />
      <div className="min-h-screen bg-[#fff7f6] flex items-center justify-center px-4">
        <div className="text-center max-w-md mx-auto">
          {/* Title */}
          <h1 className="text-7xl font-bold text-gray-900 mb-4">
            {t('public.notFound.title')}
          </h1>

          {/* Subtitle */}
          <h2 className="text-2xl font-semibold text-[#ff5b5b] mb-4">
            {t('public.notFound.subtitle')}
          </h2>

          {/* Description */}
          <p className="text-gray-600 mb-8 text-lg">
            {t('public.notFound.description')}
          </p>

          {/* Single Button */}
          <Link
            href={withLocale('/', locale as 'en' | 'ru' | 'vi')}
            className="inline-block bg-[#ff5b5b] text-white px-8 py-3 rounded-lg font-medium hover:bg-[#e04a4a] transition-colors duration-200"
          >
            {t('public.notFound.returnHome')}
          </Link>
        </div>
      </div>
    </>
  );
}
