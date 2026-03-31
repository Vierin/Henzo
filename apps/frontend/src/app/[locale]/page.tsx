import { Suspense } from 'react';
import type { Metadata } from 'next';
import HomePageClient from '../HomePageClient';
import { isLocale, type Locale } from '@/i18n/routing';
import { getDictionary } from '@/i18n/dictionaries';
import type { TranslationModule } from '@/i18n/modules';
import { buildStaticPageMetadata, resolveLocale } from '@/seo';

export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale: raw } = await params;
	return buildStaticPageMetadata('home', resolveLocale(raw));
}

export default async function HomePage({
	params,
}: {
	params: Promise<{ locale: string }>;
}) {
	const rparams = await params;
	const locale = (isLocale(rparams.locale) ? rparams.locale : 'en') as Locale;
	
	// Загружаем переводы для главной страницы на сервере
	// Это предотвращает показ ключей переводов при редиректе
	const homepageModules: TranslationModule[] = [
		'public/homepage',
		'public/categories',
		'public/salon',
		'public/booking',
	];
	const initialDictionary = await getDictionary(locale, homepageModules);

	// Structured data (kept as-is; adjust per-locale later if needed)
	const structuredData = {
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		name: 'Henzo',
		alternateName: 'Henzo Vietnam - Đặt lịch làm đẹp',
		description:
			'Đặt lịch hẹn làm đẹp online tại Việt Nam. Tìm salon tóc, spa, massage, nail tại Hà Nội, TP.HCM.',
		url: process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://henzo.app',
		inLanguage: ['vi', 'en', 'ru'],
		potentialAction: {
			'@type': 'SearchAction',
			target: {
				'@type': 'EntryPoint',
				urlTemplate: `${process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://henzo.app'}/salons?search={search_term_string}`,
			},
			'query-input': 'required name=search_term_string',
		},
	};

	const organizationData = {
		'@context': 'https://schema.org',
		'@type': 'Organization',
		name: 'Henzo',
		alternateName: 'Henzo',
		description:
			'Nền tảng đặt lịch làm đẹp hàng đầu tại Việt Nam - Beauty appointment booking platform',
		url: process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://henzo.app',
		logo: `${process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://henzo.app'}/logo.png`,
		contactPoint: {
			'@type': 'ContactPoint',
			contactType: 'customer service',
			availableLanguage: ['Vietnamese', 'English', 'Russian'],
			areaServed: 'VN',
		},
	};

	return (
		<>
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(structuredData),
				}}
			/>
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(organizationData),
				}}
			/>
			{/* Передаем переводы через window для предотвращения мерцания ключей */}
			<script
				dangerouslySetInnerHTML={{
					__html: `window.__HOMEPAGE_DICTIONARY__ = ${JSON.stringify(initialDictionary)};`,
				}}
			/>
			<Suspense
				fallback={
					<div className="min-h-screen bg-[#F8F5F2]">
						<div className="h-20 bg-white shadow-sm" />
						<div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
							<div className="text-center">
								<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff5b5b] mx-auto mb-4"></div>
								<p className="text-gray-600">Loading...</p>
							</div>
						</div>
					</div>
				}
			>
				<HomePageClient initialDictionary={initialDictionary} />
			</Suspense>
		</>
	);
}
