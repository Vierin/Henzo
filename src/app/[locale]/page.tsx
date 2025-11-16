import HomePageClient from '../HomePageClient';
import { isLocale, type Locale } from '@/i18n/routing';

export default async function HomePage({
	params,
}: {
	params: Promise<{ locale: string }>;
}) {
	const rparams = await params;
	const locale = (isLocale(rparams.locale) ? rparams.locale : 'en') as Locale;

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
			<HomePageClient />
		</>
	);
}
