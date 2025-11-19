'use client';

import { usePathname } from 'next/navigation';
import { extractLocaleFromPath, type Locale } from './routing';
import { useMemo } from 'react';

type Dictionary = typeof import('./locales/en.json');

// Import dictionaries statically for client components
// Next.js will bundle these at build time
import enDict from './locales/en.json';
import ruDict from './locales/ru.json';
import viDict from './locales/vi.json';

const dictionaries: Record<Locale, Dictionary> = {
	en: enDict as Dictionary,
	ru: ruDict as Dictionary,
	vi: viDict as Dictionary,
};

export function useTranslations() {
	const pathname = usePathname();
	const locale = useMemo(() => {
		return extractLocaleFromPath(pathname) ?? 'en';
	}, [pathname]);

	return useMemo(() => {
		return dictionaries[locale] || dictionaries.en;
	}, [locale]);
}
