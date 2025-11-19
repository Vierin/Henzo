import type { ReactNode } from 'react';
import { getDictionary } from '@/i18n/dictionaries';
import { locales, type Locale, isLocale } from '@/i18n/routing';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export function generateStaticParams() {
	return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string }>;
}) {
	const rparams = await params;
	const locale = isLocale(rparams.locale) ? (rparams.locale as Locale) : 'en';
	const dict = await getDictionary(locale);
	const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://henzo.app';

	const localeToOg = {
		en: 'en_US',
		ru: 'ru_RU',
		vi: 'vi_VN',
	} as const;

	return {
		title: dict.meta?.title ?? 'Henzo',
		description: dict.meta?.description ?? '',
		metadataBase: new URL(baseUrl),
		alternates: {
			languages: {
				'en-US': '/en',
				'ru-RU': '/ru',
				'vi-VN': '/vi',
			},
		},
		openGraph: {
			locale: localeToOg[locale],
		},
	};
}

export default async function LocaleRootLayout({
	children,
	params,
}: {
	children: ReactNode;
	params: Promise<{ locale: string }>;
}) {
	const rparams = await params;
	const locale = isLocale(rparams.locale) ? (rparams.locale as Locale) : 'en';
	// preload dictionary for potential server components below
	await getDictionary(locale);

	return (
		<html lang={locale}>
			<body>
				<ErrorBoundary>{children}</ErrorBoundary>
			</body>
		</html>
	);
}
