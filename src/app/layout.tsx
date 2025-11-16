import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Toaster from '@/components/Toaster';
import QueryProvider from '@/components/QueryProvider';
import AuthProvider from '@/components/AuthProvider';
import ConditionalFooter from '@/components/ConditionalFooter';
import CookieBanner from '@/components/CookieBanner';
import { LanguageProvider } from '@/contexts/LanguageContext';

const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin'],
});

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin'],
});

export const metadata: Metadata = {
	title: 'Henzo - Đặt Lịch Salon Tóc, Spa, Massage Online | Hà Nội, TP.HCM',
	description:
		'Đặt lịch hẹn làm đẹp online với Henzo tại Việt Nam. Tìm và đặt salon tóc, spa, massage, nail tại Hà Nội, TP.HCM. Đặt lịch dễ dàng, đánh giá tin cậy, giá cả minh bạch.',
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
	keywords: [
		'đặt lịch salon',
		'salon tóc Hà Nội',
		'spa TP.HCM',
		'massage Việt Nam',
		'làm nail online',
		'beauty booking Vietnam',
	],
	alternates: {
		canonical: '/',
		languages: {
			'vi-VN': '/',
			'en-US': '/en',
		},
	},
	openGraph: {
		title: 'Henzo - Đặt Lịch Salon, Spa Online Việt Nam',
		description:
			'Tìm và đặt lịch các dịch vụ làm đẹp tốt nhất tại Việt Nam. Salon tóc, spa, massage, nail. Đặt lịch online dễ dàng.',
		url: '/',
		siteName: 'Henzo',
		images: [
			{
				url: '/og-image.jpg',
				width: 1200,
				height: 630,
				alt: 'Henzo - Nền tảng đặt lịch làm đẹp Việt Nam',
			},
		],
		locale: 'vi_VN',
		type: 'website',
	},
	twitter: {
		card: 'summary_large_image',
		title: 'Henzo - Đặt Lịch Salon, Spa Online Việt Nam',
		description:
			'Tìm và đặt lịch dịch vụ làm đẹp tốt nhất gần bạn. Đặt lịch online dễ dàng.',
		images: ['/og-image.jpg'],
		creator: '@henzo',
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
				{/* Google Analytics */}
				<script
					async
					src="https://www.googletagmanager.com/gtag/js?id=G-KBLFJ1533R"
				/>
				<script
					dangerouslySetInnerHTML={{
						__html: `
							window.dataLayer = window.dataLayer || [];
							function gtag(){dataLayer.push(arguments);}
							gtag('js', new Date());
							
							// Set default consent state to denied
							gtag('consent', 'default', {
								analytics_storage: 'denied',
								ad_storage: 'denied',
							});
							
							gtag('config', 'G-KBLFJ1533R');
						`,
					}}
				/>
				<link rel="icon" href="/favicon/favicon.ico" sizes="any" />
				<link rel="manifest" href="/site.webmanifest" />
				<meta name="geo.region" content="VN" />
				<meta name="geo.placename" content="Vietnam" />
				<meta name="geo.position" content="21.028511;105.804817" />
				<meta name="ICBM" content="21.028511, 105.804817" />
			</head>
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased`}
				suppressHydrationWarning={true}
			>
				<LanguageProvider>
					<QueryProvider>
						<AuthProvider>
							{children}
							<ConditionalFooter />
							<CookieBanner />
							<Toaster />
						</AuthProvider>
					</QueryProvider>
				</LanguageProvider>
			</body>
		</html>
	);
}
