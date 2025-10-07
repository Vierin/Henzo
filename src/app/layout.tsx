import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Toaster from '@/components/Toaster';
import QueryProvider from '@/components/QueryProvider';
import AuthProvider from '@/components/AuthProvider';
import Footer from '@/components/Footer';
import ConditionalFooter from '../components/ConditionalFooter';
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
							<Toaster />
						</AuthProvider>
					</QueryProvider>
				</LanguageProvider>
			</body>
		</html>
	);
}
