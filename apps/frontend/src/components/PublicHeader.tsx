'use client';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronDown } from 'lucide-react';
import { extractLocaleFromPath, withLocale } from '@/i18n/routing';
import { useLanguage, useTranslation } from '@/contexts/LanguageContext';

type HeaderVariant = 'default' | 'landing';

function PublicHeaderContent({
	variant = 'default',
	embedded = false,
}: {
	variant?: HeaderVariant;
	/** Sits inside a card: no full-width sticky bar. */
	embedded?: boolean;
}) {
	const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
	const [selectedLanguage, setSelectedLanguage] = useState('EN');
	const dropdownRef = useRef<HTMLDivElement>(null);
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const router = useRouter();
	const { setLanguage } = useLanguage();
	const t = useTranslation();

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

	const getAppLabel =
		currentLocale === 'ru'
			? 'Скачать приложение'
			: currentLocale === 'vi'
				? 'Tải ứng dụng'
				: 'Get the app';

	const navBenefits =
		currentLocale === 'ru'
			? 'преимущества'
			: currentLocale === 'vi'
				? 'lợi ích'
				: 'benefits';
	const navPricing =
		currentLocale === 'ru'
			? 'цены'
			: currentLocale === 'vi'
				? 'bảng giá'
				: 'pricing';
	const navContact =
		currentLocale === 'ru'
			? 'контакты'
			: currentLocale === 'vi'
				? 'liên hệ'
				: 'contact';

	if (variant === 'landing') {
		const shellClass = embedded
			? 'relative z-40 bg-transparent'
			: 'sticky top-0 z-40 border-b border-[#eadfd7]/70 bg-[#F9F4F0]/85 backdrop-blur-md';

		if (embedded) {
			return (
				<header className={shellClass}>
					<div className="relative mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-3 sm:gap-4 sm:px-4">
						<Link
							href={withLocale('/', currentLocale as 'en' | 'ru' | 'vi')}
							className="relative z-10 flex min-w-0 items-center gap-2 sm:gap-3"
						>
							<Image
								src="/logo.png"
								alt="Henzo"
								width={161}
								height={52}
								className="h-[52px] w-auto shrink-0 object-contain"
							/>
						</Link>

						<nav
							className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 gap-6 text-[0.9375rem] font-medium lowercase text-[#3F3F3F]/85 md:flex md:gap-8"
							aria-label="Landing"
						>
							<a
								href={`${pathname.split('#')[0]}#benefits`}
								className="whitespace-nowrap transition hover:text-[#E86D4F]"
							>
								{navBenefits}
							</a>
							<a
								href={`${pathname.split('#')[0]}#pricing`}
								className="whitespace-nowrap transition hover:text-[#E86D4F]"
							>
								{navPricing}
							</a>
							<Link
								href={withLocale(
									'/contact',
									currentLocale as 'en' | 'ru' | 'vi',
								)}
								className="whitespace-nowrap transition hover:text-[#E86D4F]"
							>
								{navContact}
							</Link>
						</nav>

						<div className="relative z-10 shrink-0" ref={dropdownRef}>
							<button
								type="button"
								onClick={() =>
									setIsLanguageDropdownOpen(!isLanguageDropdownOpen)
								}
								className="flex items-center gap-1 rounded-full border border-[#eadfd7] bg-white/90 px-2.5 py-2 text-xs font-medium text-[#3F3F3F] shadow-sm transition hover:border-[#E86D4F]/40 hover:bg-white sm:gap-2 sm:px-3 sm:py-2 sm:text-sm"
								aria-expanded={isLanguageDropdownOpen}
								aria-haspopup="listbox"
							>
								<span>{selectedLanguage}</span>
								<ChevronDown
									className={`h-3.5 w-3.5 shrink-0 transition-transform sm:h-4 sm:w-4 ${
										isLanguageDropdownOpen ? 'rotate-180' : ''
									}`}
								/>
							</button>

							{isLanguageDropdownOpen && (
								<div
									className="absolute right-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-xl border border-[#eadfd7] bg-white shadow-lg sm:w-48"
									role="listbox"
								>
									{languages.map((language) => (
										<button
											key={language.code}
											type="button"
											role="option"
											aria-selected={
												selectedLanguage === language.code.toUpperCase()
											}
											onClick={() => handleLanguageSelect(language)}
											className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition sm:gap-3 sm:px-4 sm:py-3 ${
												selectedLanguage === language.code.toUpperCase()
													? 'bg-[#E86D4F] text-white hover:bg-[#d85e42]'
													: 'text-[#3F3F3F] hover:bg-[#F9F4F0]'
											}`}
										>
											<span className="text-base sm:text-lg">
												{language.flag}
											</span>
											<span className="font-medium">{language.name}</span>
										</button>
									))}
								</div>
							)}
						</div>
					</div>
				</header>
			);
		}

		return (
			<header className={shellClass}>
				<div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
					<Link
						href={withLocale('/', currentLocale as 'en' | 'ru' | 'vi')}
						className="flex min-w-0 items-center gap-2 sm:gap-3"
					>
						<Image
							src="/logo.png"
							alt="Henzo"
							width={88}
							height={40}
							className="h-9 w-auto shrink-0 object-contain sm:h-10"
						/>
					</Link>

					<div className="flex shrink-0 items-center gap-2 sm:gap-3">
						<div className="relative" ref={dropdownRef}>
							<button
								type="button"
								onClick={() =>
									setIsLanguageDropdownOpen(!isLanguageDropdownOpen)
								}
								className="flex items-center gap-1 rounded-full border border-[#eadfd7] bg-white/90 px-2.5 py-2 text-xs font-medium text-[#3F3F3F] shadow-sm transition hover:border-[#E86D4F]/40 hover:bg-white sm:gap-2 sm:px-3 sm:py-2.5 sm:text-sm"
								aria-expanded={isLanguageDropdownOpen}
								aria-haspopup="listbox"
							>
								<span>{selectedLanguage}</span>
								<ChevronDown
									className={`h-3.5 w-3.5 shrink-0 transition-transform sm:h-4 sm:w-4 ${
										isLanguageDropdownOpen ? 'rotate-180' : ''
									}`}
								/>
							</button>

							{isLanguageDropdownOpen && (
								<div
									className="absolute right-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-xl border border-[#eadfd7] bg-white shadow-lg sm:w-48"
									role="listbox"
								>
									{languages.map((language) => (
										<button
											key={language.code}
											type="button"
											role="option"
											aria-selected={
												selectedLanguage === language.code.toUpperCase()
											}
											onClick={() => handleLanguageSelect(language)}
											className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition sm:gap-3 sm:px-4 sm:py-3 ${
												selectedLanguage === language.code.toUpperCase()
													? 'bg-[#E86D4F] text-white hover:bg-[#d85e42]'
													: 'text-[#3F3F3F] hover:bg-[#F9F4F0]'
											}`}
										>
											<span className="text-base sm:text-lg">
												{language.flag}
											</span>
											<span className="font-medium">{language.name}</span>
										</button>
									))}
								</div>
							)}
						</div>
						<a
							href={`${pathname.split('#')[0]}#get-app`}
							className="inline-flex items-center rounded-full bg-[#E86D4F] px-3 py-2 text-xs font-semibold text-white shadow-[0_10px_28px_rgba(232,109,79,0.28)] transition hover:bg-[#d85e42] sm:px-4 sm:py-2.5 sm:text-sm"
						>
							{getAppLabel}
						</a>
					</div>
				</div>
			</header>
		);
	}

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
							{t('footer.contact')}
						</Link>

						<div className="relative" ref={dropdownRef}>
							<button
								onClick={() =>
									setIsLanguageDropdownOpen(!isLanguageDropdownOpen)
								}
								className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-colors border border-gray-200 rounded-lg text-gray-700 hover:text-[#ff5b5b] hover:border-[#ff5b5b] hover:bg-[#fff7f6]"
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
											<span className="text-base sm:text-lg">
												{language.flag}
											</span>
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

export default function PublicHeader({
	variant = 'default',
	embedded = false,
}: {
	variant?: HeaderVariant;
	embedded?: boolean;
}) {
	const landing = variant === 'landing';
	return (
		<Suspense
			fallback={
				<header
					className={
						landing && embedded
							? 'relative z-40 bg-transparent'
							: landing
								? 'sticky top-0 z-40 border-b border-[#eadfd7]/70 bg-[#F9F4F0]/85 backdrop-blur-md'
								: 'bg-white shadow-sm'
					}
				>
					<div
						className={
							landing && embedded
								? 'flex items-center justify-between gap-3 px-1 py-1 sm:px-2'
								: 'mx-auto max-w-7xl px-4 py-4 md:px-6'
						}
					>
						<div className="flex w-full items-center justify-between gap-3">
							<div className="h-8 w-28 rounded-md bg-[#eadfd7]/80 animate-pulse sm:h-10 sm:w-32" />
							<div className="h-9 w-[4.5rem] rounded-full bg-[#eadfd7]/80 animate-pulse sm:h-10 sm:w-24" />
						</div>
					</div>
				</header>
			}
		>
			<PublicHeaderContent variant={variant} embedded={embedded} />
		</Suspense>
	);
}
