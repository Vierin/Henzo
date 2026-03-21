import React from 'react';
import { getDictionary } from '@/i18n/dictionaries';
import { locales, type Locale, isLocale } from '@/i18n/routing';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { siteBaseUrl } from '@/seo';

export function generateStaticParams() {
	return locales.map((locale) => ({ locale }));
}

/** Layout defaults only — page-level `generateMetadata` supplies title/description/OG. */
export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string }>;
}) {
	await params;

	return {
		title: { default: 'Henzo' },
		metadataBase: new URL(siteBaseUrl()),
		alternates: {
			languages: {
				'en-US': '/en',
				'ru-RU': '/ru',
				'vi-VN': '/vi',
			},
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
