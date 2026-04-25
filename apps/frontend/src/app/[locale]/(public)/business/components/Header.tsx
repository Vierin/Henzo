'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from './ui/button';
import Image from 'next/image';
import { ChevronDown } from 'lucide-react';
import { useTranslation, useLanguage } from '@/contexts/LanguageContext';
import { extractLocaleFromPath, withLocale } from '@/i18n/routing';

export function Header() {
	const t = useTranslation();
	const { setLanguage } = useLanguage();
	const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
	const [selectedLanguage, setSelectedLanguage] = useState('EN');
	const dropdownRef = useRef<HTMLDivElement>(null);
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const router = useRouter();

	// Текущая локаль из URL
	const currentLocale = extractLocaleFromPath(pathname) ?? 'en';

	const languages = [
		{ code: 'en', name: 'English', flag: '🇺🇸' },
		{ code: 'ru', name: 'Русский', flag: '🇷🇺' },
		{ code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
	] as const;

	const handleLanguageSelect = (lang: (typeof languages)[number]) => {
		// Обновляем язык в контексте
		setLanguage(lang.code as 'en' | 'ru' | 'vi');
		// Сохраняем query-параметры
		const basePath = withLocale('/business', lang.code as 'en' | 'ru' | 'vi');
		const query = searchParams.toString();
		const target = query ? `${basePath}?${query}` : basePath;
		setIsLanguageDropdownOpen(false);
		router.replace(target);
	};

	// selectedLanguage из URL
	useEffect(() => {
		setSelectedLanguage(currentLocale.toUpperCase());
	}, [currentLocale]);

	// Обработчик клика вне dropdown
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
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [handleClickOutside]);

	return (
		<header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
			<div className="container mx-auto px-4 py-4 flex items-center justify-between">
				<Link
					href={withLocale('/', currentLocale as 'en' | 'ru' | 'vi')}
					className="flex items-center gap-2 cursor-pointer"
				>
					<Image
						src="/logo.png"
						alt="Henzo Logo"
						width={88}
						height={40}
						priority
						sizes="88px"
					/>
				</Link>

				<nav className="hidden md:flex items-center gap-8">
					<a
						href="#features"
						className="text-foreground/70 hover:text-foreground transition-colors cursor-pointer"
					>
						{t('business.header.features')}
					</a>
					<a
						href="#benefits"
						className="text-foreground/70 hover:text-foreground transition-colors cursor-pointer"
					>
						{t('business.header.benefits')}
					</a>
					<a
						href="#beta-form"
						className="text-foreground/70 hover:text-foreground transition-colors cursor-pointer"
					>
						{t('business.header.betaAccess')}
					</a>
				</nav>

				<div className="flex items-center gap-3">
					{/* Language Dropdown */}
					<div className="relative" ref={dropdownRef}>
						<button
							onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
							className="flex items-center gap-1 sm:gap-2 px-3 py-2 text-sm text-foreground/70 hover:text-foreground font-medium transition-colors border border-border rounded-lg hover:border-primary hover:bg-primary/5"
						>
							<span>{selectedLanguage}</span>
							<ChevronDown
								className={`w-3 h-3 sm:w-4 sm:h-4 transition-transform ${
									isLanguageDropdownOpen ? 'rotate-180' : ''
								}`}
							/>
						</button>

						{isLanguageDropdownOpen && (
							<div className="absolute top-full right-0 mt-1 w-36 sm:w-48 bg-background border border-border rounded-lg shadow-lg z-50 overflow-hidden">
								{languages.map((language) => (
									<button
										key={language.code}
										onClick={() => handleLanguageSelect(language)}
										className={`w-full text-left px-4 py-2 text-sm transition-colors ${
											currentLocale === language.code
												? 'bg-primary/10 text-primary font-medium'
												: 'text-foreground/70 hover:bg-primary/5 hover:text-foreground'
										}`}
									>
										<div className="flex items-center gap-2">
											<span>{language.flag}</span>
											<span>{language.name}</span>
										</div>
									</button>
								))}
							</div>
						)}
					</div>

					<Link href="#beta-form" className="cursor-pointer">
						<Button className="bg-primary text-white hover:bg-primary/90">
							{t('business.header.startFree')}
						</Button>
					</Link>
				</div>
			</div>
		</header>
	);
}
