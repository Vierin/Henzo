'use client';

import { usePathname } from 'next/navigation';
import { extractLocaleFromPath, type Locale } from './routing';
import { useMemo, useState, useEffect } from 'react';
import { loadModules, type TranslationModule } from './modules';

// Base modules that are always loaded
const BASE_MODULES: TranslationModule[] = [
	'core/common',
	'core/meta',
	'core/navigation',
	'core/weekdays',
	'core/months',
	'ui/header',
	'ui/footer',
	'ui/cookieBanner',
	'shared/forms',
	'shared/emptyStates',
	'public/booking', // Always load booking module as BookingModal can be used on any page
];

// Type for the merged dictionary
type Dictionary = {
	[key: string]: any;
};

/**
 * Hook to use translations with module support
 * @param modules - Optional array of modules to load. If not provided, loads base modules only.
 */
export function useTranslations(modules?: TranslationModule[]) {
	const pathname = usePathname();
	const [dictionary, setDictionary] = useState<Dictionary>({});
	const [isLoading, setIsLoading] = useState(true);

	const locale = useMemo(() => {
		return extractLocaleFromPath(pathname) ?? 'en';
	}, [pathname]);

	const modulesToLoad = useMemo(() => {
		return modules ? [...BASE_MODULES, ...modules] : BASE_MODULES;
	}, [modules]);

	useEffect(() => {
		let cancelled = false;

		async function loadDictionary() {
			setIsLoading(true);
			try {
				const loaded = await loadModules(locale, modulesToLoad);
				if (!cancelled) {
					setDictionary(loaded);
					setIsLoading(false);
				}
			} catch (error) {
				console.error('Failed to load translations:', error);
				if (!cancelled) {
					setDictionary({});
					setIsLoading(false);
				}
			}
		}

		loadDictionary();

		return () => {
			cancelled = true;
		};
	}, [locale, modulesToLoad]);

	return useMemo(() => {
		if (isLoading) {
			// Return a proxy that returns the key if translation is not loaded yet
			return new Proxy(
				{},
				{
					get: (_target, prop: string) => {
						return prop;
					},
				}
			) as Dictionary;
		}
		return dictionary;
	}, [dictionary, isLoading]);
}

/**
 * Hook for loading specific modules on demand
 * Useful for code-splitting translations per page/component
 */
export function useModuleTranslations(
	modules: TranslationModule[],
	locale?: Locale
) {
	const pathname = usePathname();
	const [dictionary, setDictionary] = useState<Dictionary>({});
	const [isLoading, setIsLoading] = useState(true);

	const currentLocale = useMemo(() => {
		return locale ?? (extractLocaleFromPath(pathname) ?? 'en');
	}, [locale, pathname]);

	useEffect(() => {
		let cancelled = false;

		async function loadDictionary() {
			setIsLoading(true);
			try {
				const loaded = await loadModules(currentLocale, modules);
				if (!cancelled) {
					setDictionary(loaded);
					setIsLoading(false);
				}
			} catch (error) {
				console.error('Failed to load module translations:', error);
				if (!cancelled) {
					setDictionary({});
					setIsLoading(false);
				}
			}
		}

		loadDictionary();

		return () => {
			cancelled = true;
		};
	}, [currentLocale, modules.join(',')]);

	return { dictionary, isLoading };
}
