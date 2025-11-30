'use client';

import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	useMemo,
	ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import { extractLocaleFromPath, stripLocaleFromPath, type Locale } from '@/i18n/routing';
import { useTranslations as useBaseTranslations, useModuleTranslations } from '@/i18n/useTranslations';
import type { TranslationModule } from '@/i18n/modules';

type Language = Locale;

// Helper function to get nested translation by path
function getNestedTranslation(obj: any, path: string): string {
	const result = path.split('.').reduce((current: any, key: string) => {
		return current?.[key];
	}, obj);
	// If result is undefined, null, or empty string, return the path as fallback
	if (result === undefined || result === null || result === '') {
		return path;
	}
	return result;
}

type Dictionary = {
	[key: string]: any;
};

interface LanguageContextType {
	language: Language;
	setLanguage: (lang: Language) => void;
	t: Dictionary & ((path: string) => string);
}

const LanguageContext = createContext<LanguageContextType | undefined>(
	undefined
);

interface LanguageProviderProps {
	children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
	const [language, setLanguageState] = useState<Language>('en');
	const pathname = usePathname();
	
	// Determine which modules to load based on current path
	const pathNoLocale = stripLocaleFromPath(pathname);
	const isOwnerPage = pathNoLocale.startsWith('/owner-dashboard') || 
		pathNoLocale.startsWith('/salon-info') ||
		pathNoLocale.startsWith('/services') ||
		pathNoLocale.startsWith('/staff') ||
		pathNoLocale.startsWith('/calendar') ||
		pathNoLocale.startsWith('/marketing');
	
	const isClientPage = pathNoLocale.startsWith('/dashboard') ||
		pathNoLocale.startsWith('/favorites') ||
		pathNoLocale.startsWith('/reviews') ||
		pathNoLocale.startsWith('/settings');
	
	// Determine specific owner module based on path
	let ownerModule: TranslationModule | undefined;
	if (pathNoLocale.startsWith('/owner-dashboard')) {
		ownerModule = 'owner/dashboard';
	} else if (pathNoLocale.startsWith('/salon-info')) {
		ownerModule = 'owner/salonInfo';
	} else if (pathNoLocale.startsWith('/services')) {
		if (pathNoLocale.includes('/new')) {
			ownerModule = 'owner/servicesNew';
		} else {
			ownerModule = 'owner/services';
		}
	} else if (pathNoLocale.startsWith('/staff')) {
		if (pathNoLocale.includes('/new')) {
			ownerModule = 'owner/staffNew';
		} else {
			ownerModule = 'owner/staff';
		}
	} else if (pathNoLocale.startsWith('/calendar')) {
		ownerModule = 'owner/calendar';
	} else if (pathNoLocale.startsWith('/marketing')) {
		ownerModule = 'owner/marketing';
	}
	
	// Determine public module based on path
	const publicModules: TranslationModule[] = [];
	
	// Check for homepage (root path)
	if (pathNoLocale === '/' || pathNoLocale === '' || !pathNoLocale) {
		// Categories are also used on homepage
		publicModules.push('public/homepage', 'public/categories');
	} else if (pathNoLocale.startsWith('/salon/')) {
		publicModules.push('public/salon');
	} else if (pathNoLocale.startsWith('/booking')) {
		publicModules.push('public/booking');
	} else if (pathNoLocale.startsWith('/category/')) {
		publicModules.push('public/categories');
	} else if (pathNoLocale.startsWith('/map')) {
		publicModules.push('public/map');
	} else if (pathNoLocale.startsWith('/business')) {
		publicModules.push('public/business');
	} else if (pathNoLocale.startsWith('/contact')) {
		publicModules.push('public/contact');
	} else if (pathNoLocale.startsWith('/about')) {
		publicModules.push('public/about');
	}
	
	// Load base modules
	const baseT = useBaseTranslations();
	
	// Load additional modules based on page type
	const modulesToLoad: TranslationModule[] = [];
	if (ownerModule) {
		modulesToLoad.push(ownerModule);
	}
	if (isOwnerPage) {
		// Always load dashboard module for navigation (sidebar uses it)
		modulesToLoad.push('owner/dashboard');
		// Load services and staff modules for navigation (sidebar uses them)
		modulesToLoad.push('owner/services', 'owner/staff');
		modulesToLoad.push('owner/feedback');
	}
	// Add all public modules (can be multiple for homepage)
	modulesToLoad.push(...publicModules);
	if (isClientPage) {
		// Determine specific client module based on path
		if (pathNoLocale.startsWith('/dashboard')) {
			modulesToLoad.push('client/dashboard');
		} else if (pathNoLocale.startsWith('/favorites')) {
			modulesToLoad.push('client/favorites');
		} else if (pathNoLocale.startsWith('/reviews')) {
			modulesToLoad.push('client/reviews');
		} else if (pathNoLocale.startsWith('/settings')) {
			modulesToLoad.push('client/settings');
		}
	}
	// Load shared/auth for login and register pages
	if (pathNoLocale.startsWith('/login') || pathNoLocale.startsWith('/register')) {
		modulesToLoad.push('shared/auth');
	}
	
	const { dictionary: additionalDict } = useModuleTranslations(
		modulesToLoad,
		language
	);
	
	// Deep merge function for nested objects
	const deepMerge = (target: any, source: any) => {
		for (const key in source) {
			if (source.hasOwnProperty(key)) {
				if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key]) &&
					typeof target[key] === 'object' && target[key] !== null && !Array.isArray(target[key])) {
					target[key] = deepMerge(target[key], source[key]);
				} else {
					target[key] = source[key];
				}
			}
		}
		return target;
	};

	// Merge base and additional translations
	const t = useMemo(() => {
		const merged = { ...baseT };
		if (additionalDict && Object.keys(additionalDict).length > 0) {
			// Deep merge to preserve nested objects
			deepMerge(merged, additionalDict);
		}
		// Debug: log if calendar module is loaded (only in development)
		if (process.env.NODE_ENV === 'development' && pathNoLocale.startsWith('/calendar')) {
			console.log('Calendar translations loaded:', {
				hasOwner: !!merged.owner,
				hasCalendar: !!merged.owner?.calendar,
				calendarKeys: merged.owner?.calendar ? Object.keys(merged.owner.calendar) : [],
				hasCannotCreateBooking: !!merged.owner?.calendar?.cannotCreateBooking,
				cannotCreateBookingKeys: merged.owner?.calendar?.cannotCreateBooking ? Object.keys(merged.owner.calendar.cannotCreateBooking) : [],
				noServices: merged.owner?.calendar?.cannotCreateBooking?.noServices,
			});
		}
		// Debug: log if homepage module is loaded (only in development)
		if (process.env.NODE_ENV === 'development' && pathNoLocale === '/') {
			console.log('Homepage translations loaded:', {
				hasHomepage: !!merged.homepage,
				homepageKeys: merged.homepage ? Object.keys(merged.homepage) : [],
				topRatedTitle: merged.homepage?.topRatedTitle,
			});
		}
		return merged;
	}, [baseT, additionalDict, pathNoLocale]);

	// Load language from localStorage on mount
	useEffect(() => {
		if (typeof window !== 'undefined') {
			const savedLanguage = localStorage.getItem('henzo-language') as Language;
			if (
				savedLanguage &&
				(savedLanguage === 'vi' ||
					savedLanguage === 'en' ||
					savedLanguage === 'ru')
			) {
				setLanguageState(savedLanguage);
			}
		}
	}, []);

	// Derive language from URL on first load and when path changes
	useEffect(() => {
		if (typeof window === 'undefined') return;
		const locale = extractLocaleFromPath(pathname) ?? 'en';
		setLanguageState(locale);
		localStorage.setItem('henzo-language', locale);
		document.documentElement.lang = locale;
		document.documentElement.dir = 'ltr';
	}, [pathname]);

	const setLanguage = (lang: Language) => {
		setLanguageState(lang);

		if (typeof window !== 'undefined') {
			localStorage.setItem('henzo-language', lang);

			// Update document language attribute
			document.documentElement.lang = lang;

			// Update document direction if needed (Vietnamese uses LTR)
			document.documentElement.dir = 'ltr';
		}
	};

	// Create a function wrapper that supports both object access and string path access
	// Use Proxy to automatically handle both t('path.to.key') and t.path.to.key
	const baseFunction = ((path: string) => getNestedTranslation(t, path)) as any;
	
	const createProxy = (prefix = ''): any => {
		return new Proxy(baseFunction, {
			get: (_target, prop: string) => {
				// If accessing as function, return the function
				if (prop === 'apply' || prop === 'call' || prop === 'bind' || prop === 'toString') {
					return baseFunction[prop];
				}
				// Build the full path
				const fullPath = prefix ? `${prefix}.${prop}` : prop;
				// Try to get from translations object
				const value = prefix 
					? getNestedTranslation(t, fullPath)
					: t[prop];
				
				// If it's an object, return a proxy for nested access
				if (value !== undefined && typeof value === 'object' && value !== null && !Array.isArray(value)) {
					return createProxy(fullPath);
				}
				
				// If value exists, return it
				if (value !== undefined) {
					return value;
				}
				
				// Return a proxy for nested access that will resolve on next property access
				return createProxy(fullPath);
			},
		});
	};
	
	const tWrapper = createProxy() as Dictionary & ((path: string) => string);

	const value: LanguageContextType = {
		language,
		setLanguage,
		t: tWrapper as Dictionary & ((path: string) => string),
	};

	return (
		<LanguageContext.Provider value={value}>
			{children}
		</LanguageContext.Provider>
	);
}

export function useLanguage() {
	const context = useContext(LanguageContext);
	if (context === undefined) {
		throw new Error('useLanguage must be used within a LanguageProvider');
	}
	return context;
}

// Helper hook for easy translation access
export function useTranslation() {
	const { t } = useLanguage();
	return t;
}
