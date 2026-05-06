'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Facebook, Instagram, Linkedin } from 'lucide-react';
import { AppleStoreIcon, GooglePlayIcon } from '@/components/landing/storeIcons';
import { appStoreUrl, playStoreUrl } from '@/constants/appStores';
import { useTranslation, useLanguage } from '@/contexts/LanguageContext';
import { extractLocaleFromPath, withLocale } from '@/i18n/routing';

export default function Footer() {
	const pathname = usePathname();
	const { language } = useLanguage();
	const locale = extractLocaleFromPath(pathname) ?? language;
	const t = useTranslation();
	const homePath = withLocale('/', (locale as 'en' | 'ru' | 'vi') || 'en');
	const navBenefits =
		locale === 'ru' ? 'Преимущества' : locale === 'vi' ? 'Lợi ích' : 'Benefits';
	const navPricing =
		locale === 'ru' ? 'Цены' : locale === 'vi' ? 'Bảng giá' : 'Pricing';
	const navHowItWorks =
		locale === 'ru'
			? 'Как это работает'
			: locale === 'vi'
				? 'Cách hoạt động'
				: 'How it works';
	const ctaTitle =
		locale === 'ru'
			? 'Запустите свой бизнес уже сегодня.'
			: locale === 'vi'
				? 'Bắt đầu kinh doanh ngay hôm nay.'
				: 'Start your business today.';

	return (
		<footer
			className="bg-[#F9F4F0] px-6 pb-10 pt-8 md:px-10 md:pb-14 md:pt-10"
			suppressHydrationWarning
		>
			<div className="mx-auto max-w-[1220px]">
				<div className="grid gap-8 md:grid-cols-[1fr_minmax(420px,520px)] md:gap-10 md:items-end">
					<div>
						<Link
							href={homePath}
							className="inline-flex items-center"
							aria-label="Henzo home"
						>
							<Image
								src="/logo.png"
								alt="Henzo"
								width={166}
								height={54}
								className="h-[54px] w-auto object-contain"
							/>
						</Link>
						<nav
							aria-label="Footer"
							className="mt-8 flex flex-wrap items-center gap-x-9 gap-y-3 text-[1.02rem] font-medium text-[#3F3F3F]"
						>
							<Link
								href={`${homePath}#benefits`}
								className="transition hover:text-[#E86D4F]"
							>
								{navBenefits}
							</Link>
							<Link
								href={`${homePath}#pricing`}
								className="transition hover:text-[#E86D4F]"
							>
								{navPricing}
							</Link>
							<Link
								href={`${homePath}#how-it-works`}
								className="transition hover:text-[#E86D4F]"
							>
								{navHowItWorks}
							</Link>
						</nav>
						<div className="mt-8 flex flex-wrap items-center gap-4">
							<a
								href="https://facebook.com"
								target="_blank"
								rel="noreferrer"
								aria-label="Facebook"
								className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E4E7ED] bg-white text-[#3F3F3F] transition hover:text-[#E86D4F]"
							>
								<Facebook className="h-[18px] w-[18px]" strokeWidth={2.1} />
							</a>
							<a
								href="https://linkedin.com"
								target="_blank"
								rel="noreferrer"
								aria-label="LinkedIn"
								className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E4E7ED] bg-white text-[#3F3F3F] transition hover:text-[#E86D4F]"
							>
								<Linkedin className="h-[18px] w-[18px]" strokeWidth={2.1} />
							</a>
							<a
								href="https://instagram.com"
								target="_blank"
								rel="noreferrer"
								aria-label="Instagram"
								className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E4E7ED] bg-white text-[#3F3F3F] transition hover:text-[#E86D4F]"
							>
								<Instagram className="h-[18px] w-[18px]" strokeWidth={2.1} />
							</a>
							<a
								href="mailto:hello.henzo@gmail.com"
								className="ml-2 text-[1.06rem] text-[#3F3F3F] transition hover:text-[#E86D4F]"
							>
								hello.henzo@gmail.com
							</a>
						</div>
					</div>
					<div className="md:pb-1">
						<div className="rounded-[1.15rem] bg-white px-6 py-5 md:flex md:items-center md:justify-between md:px-8">
							<p className="text-[clamp(1.5rem,2.2vw,2.9rem)] leading-[1.03] tracking-tight text-[#3B3B3F]">
								{ctaTitle}
							</p>
							<div className="mt-4 flex items-center gap-3 md:mt-0">
								<a
									href={appStoreUrl}
									target="_blank"
									rel="noreferrer"
									aria-label="App Store"
									className="inline-flex h-[46px] w-[46px] items-center justify-center rounded-full border border-[#C8CBD3] text-black transition hover:bg-[#faf8f5]"
								>
									<AppleStoreIcon className="h-5 w-5" />
								</a>
								<a
									href={playStoreUrl}
									target="_blank"
									rel="noreferrer"
									aria-label="Google Play"
									className="inline-flex h-[46px] w-[46px] items-center justify-center rounded-full border border-[#C8CBD3] text-black transition hover:bg-[#faf8f5]"
								>
									<GooglePlayIcon className="h-5 w-5" />
								</a>
							</div>
						</div>
						<p className="mt-8 text-[1rem] text-[#3F3F3F] md:text-left">
							{t('footer.allRightsReserved')}
						</p>
					</div>
				</div>
			</div>
		</footer>
	);
}
