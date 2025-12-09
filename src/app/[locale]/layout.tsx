import React from 'react';
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
}: Readonly<{
	children: React.ReactNode;
	params: Promise<{ locale: string }>;
}>) {
	const rparams = await params;
	const locale = isLocale(rparams.locale) ? (rparams.locale as Locale) : 'en';
	// Load base dictionary on server and pass via script tag
	const initialDictionary = await getDictionary(locale);

	return (
		<ErrorBoundary>
			<script
				dangerouslySetInnerHTML={{
					__html: `window.__INITIAL_DICTIONARY__ = ${JSON.stringify(initialDictionary)};`,
				}}
			/>
			{children}
		</ErrorBoundary>
	);
}
