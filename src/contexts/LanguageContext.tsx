'use client';

import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import { extractLocaleFromPath, type Locale } from '@/i18n/routing';
import { useTranslations } from '@/i18n/useTranslations';

type Language = Locale;

interface LanguageContextType {
	language: Language;
	setLanguage: (lang: Language) => void;
	t: ReturnType<typeof useTranslations>;
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
	const t = useTranslations();

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

	const value: LanguageContextType = {
		language,
		setLanguage,
		t,
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
