import type { ReactNode } from 'react';
import { getDictionary } from '@/i18n/dictionaries';
import { locales, type Locale, isLocale } from '@/i18n/routing';

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
	return {
		title: dict['meta.title'] ?? 'Henzo',
		description: dict['meta.description'] ?? '',
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
			<body>{children}</body>
		</html>
	);
}
