'use client';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronDown } from 'lucide-react';
import {
	extractLocaleFromPath,
	withLocale,
} from '@/i18n/routing';
import { useLanguage } from '@/contexts/LanguageContext';

function PublicHeaderContent() {
	const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
	const [selectedLanguage, setSelectedLanguage] = useState('EN');
	const dropdownRef = useRef<HTMLDivElement>(null);
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const router = useRouter();
	const { setLanguage } = useLanguage();

	const currentLocale = extractLocaleFromPath(pathname) ?? 'en';

	const languages = [
		{ code: 'en', name: 'English', flag: '🇺🇸' },
		{ code: 'ru', name: 'Русский', flag: '🇷🇺' },
		{ code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
	] as const;

	const handleLanguageSelect = (lang: (typeof languages)[number]) => {
		setLanguage(lang.code as 'en' | 'ru' | 'vi');
		const basePath = withLocale(pathname, lang.code as 'en' | 'ru' | 'vi');
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

	return (
		<header className="bg-white shadow-sm">
			<div className="mx-auto max-w-7xl md:px-6 px-4 py-2">
				<div className="flex items-center justify-between">
					<Link
						href={withLocale('/', currentLocale as 'en' | 'ru' | 'vi')}
						className="flex max-w-20 md:max-w-full md:h-12 h-10 items-center gap-3"
					>
						<Image
							src="/logo.png"
							alt="Henzo Logo"
							width={88}
							height={40}
							className="h-full object-contain"
							style={{ width: 'auto', height: 'auto' }}
						/>
					</Link>

					<div className="flex items-center gap-4">
						<Link
							href={withLocale('/contact', currentLocale as 'en' | 'ru' | 'vi')}
							className="hidden sm:block text-sm text-gray-700 hover:text-[#8B4513] font-medium transition-colors"
						>
							Contact
						</Link>

						<div className="relative" ref={dropdownRef}>
							<button
								onClick={() =>
									setIsLanguageDropdownOpen(!isLanguageDropdownOpen)
								}
								className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-700 hover:text-[#ff5b5b] font-medium transition-colors border border-gray-200 rounded-lg hover:border-[#ff5b5b] hover:bg-[#fff7f6]"
							>
								<span>{selectedLanguage}</span>
								<ChevronDown
									className={`w-3 h-3 sm:w-4 sm:h-4 transition-transform ${
										isLanguageDropdownOpen ? 'rotate-180' : ''
									}`}
								/>
							</button>

							{isLanguageDropdownOpen && (
								<div className="absolute top-full right-0 mt-1 w-36 sm:w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
									{languages.map((language) => (
										<button
											key={language.code}
											onClick={() => handleLanguageSelect(language)}
											className={`w-full px-3 sm:px-4 py-2 sm:py-3 text-left transition-colors flex items-center gap-2 sm:gap-3 ${
												selectedLanguage === language.code.toUpperCase()
													? 'bg-[#ff5b5b] text-white hover:bg-[#e04a4a]'
													: 'text-gray-700 hover:text-[#ff5b5b] hover:bg-[#ff5b5b]/30'
											}`}
										>
											<span className="text-base sm:text-lg">{language.flag}</span>
											<span className="font-medium text-sm sm:text-base">
												{language.name}
											</span>
										</button>
									))}
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</header>
	);
}

export default function PublicHeader() {
	return (
		<Suspense
			fallback={
				<header className="bg-white shadow-sm">
					<div className="mx-auto max-w-7xl md:px-6 px-4 py-2">
						<div className="flex items-center justify-between">
							<div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
							<div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
						</div>
					</div>
				</header>
			}
		>
			<PublicHeaderContent />
		</Suspense>
	);
}
