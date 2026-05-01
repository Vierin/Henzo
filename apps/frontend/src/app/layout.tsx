import type { Metadata } from 'next';
import Script from 'next/script';
import { Suspense } from 'react';
import { Instrument_Serif, Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Toaster from '@/components/Toaster';
import ConditionalFooter from '@/components/ConditionalFooter';
import CookieBanner from '@/components/CookieBanner';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { EnvValidator } from '@/components/EnvValidator';
import LoadingFallback from '@/components/LoadingFallback';

const instrumentSerif = Instrument_Serif({
	variable: '--font-instrument-serif',
	subsets: ['latin', 'latin-ext'],
	weight: ['400'],
	style: ['normal', 'italic'],
	display: 'swap',
	adjustFontFallback: true,
});

const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin'],
});

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin'],
});

export const metadata: Metadata = {
	metadataBase: new URL(
		process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://henzo.app'
	),
	icons: {
		icon: [
			{ url: '/favicon/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
			{ url: '/favicon/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
		],
		apple: [
			{
				url: '/favicon/apple-touch-icon.png',
				sizes: '180x180',
				type: 'image/png',
			},
		],
		other: [
			{
				url: '/favicon/android-chrome-192x192.png',
				sizes: '192x192',
				type: 'image/png',
			},
			{
				url: '/favicon/android-chrome-512x512.png',
				sizes: '512x512',
				type: 'image/png',
			},
		],
	},
	verification: {
		google: 'your-google-verification-code',
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="vi">
			<head>
				<link rel="icon" href="/favicon/favicon.ico" sizes="any" />
				<link rel="manifest" href="/site.webmanifest" />
				<meta name="geo.region" content="VN" />
				<meta name="geo.placename" content="Vietnam" />
				<meta name="geo.position" content="21.028511;105.804817" />
				<meta name="ICBM" content="21.028511, 105.804817" />
			</head>
			<body
				className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} font-sans antialiased min-h-screen flex flex-col`}
				suppressHydrationWarning={true}
			>
				<EnvValidator />
				<LanguageProvider>
					<div className="flex-1">
						<Suspense fallback={<LoadingFallback message="" fullScreen={true} />}>
							{children}
						</Suspense>
					</div>
					<ConditionalFooter />
					<CookieBanner />
					<Toaster />
				</LanguageProvider>
				{/* Google Analytics */}
				<Script
					src="https://www.googletagmanager.com/gtag/js?id=G-KBLFJ1533R"
					strategy="afterInteractive"
				/>
				<Script id="google-analytics" strategy="afterInteractive">
					{`
						window.dataLayer = window.dataLayer || [];
						function gtag(){dataLayer.push(arguments);}
						gtag('js', new Date());
						
						// Set default consent state to denied
						gtag('consent', 'default', {
							analytics_storage: 'denied',
							ad_storage: 'denied',
						});
						
						gtag('config', 'G-KBLFJ1533R');
					`}
				</Script>
			</body>
		</html>
	);
}
