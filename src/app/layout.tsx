import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Toaster from '@/components/Toaster';
import QueryProvider from '@/components/QueryProvider';
import AuthProvider from '@/components/AuthProvider';
import Footer from '@/components/Footer';
import ErrorBoundary from '@/components/ErrorBoundary';

const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin'],
});

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin'],
});

export const metadata: Metadata = {
	title:
		'Henzo - Book Beauty & Wellness Appointments Online | Hair, Spa, Massage',
	description:
		'Book your next beauty appointment with Henzo. Find and book hair salons, spas, massage therapists, nail salons, and wellness services near you. Easy online booking, trusted reviews, flexible scheduling.',
	keywords: [
		'beauty appointments',
		'hair salon booking',
		'spa appointments',
		'massage booking',
		'nail salon',
		'beauty services',
		'wellness appointments',
		'online booking',
		'salon finder',
		'beauty treatments',
		'hair styling',
		'manicure pedicure',
		'facial treatments',
		'cosmetic services',
	],
	authors: [{ name: 'Henzo' }],
	creator: 'Henzo',
	publisher: 'Henzo',
	formatDetection: {
		email: false,
		address: false,
		telephone: false,
	},
	metadataBase: new URL(
		process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://henzo.com'
	),
	alternates: {
		canonical: '/',
	},
	openGraph: {
		title: 'Henzo - Book Beauty & Wellness Appointments Online',
		description:
			'Find and book the best beauty and wellness services near you. Hair salons, spas, massage, nails and more. Easy online booking with trusted reviews.',
		url: '/',
		siteName: 'Henzo',
		images: [
			{
				url: '/og-image.jpg',
				width: 1200,
				height: 630,
				alt: 'Henzo - Beauty & Wellness Booking Platform',
			},
		],
		locale: 'en_US',
		type: 'website',
	},
	twitter: {
		card: 'summary_large_image',
		title: 'Henzo - Book Beauty & Wellness Appointments Online',
		description:
			'Find and book the best beauty and wellness services near you. Easy online booking with trusted reviews.',
		images: ['/og-image.jpg'],
		creator: '@henzo',
	},
	robots: {
		index: true,
		follow: true,
		googleBot: {
			index: true,
			follow: true,
			'max-video-preview': -1,
			'max-image-preview': 'large',
			'max-snippet': -1,
		},
	},
	verification: {
		google: 'your-google-verification-code',
		yandex: 'your-yandex-verification-code',
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased`}
				suppressHydrationWarning={true}
			>
				<QueryProvider>
					{children}
					<Footer />
					<Toaster />
				</QueryProvider>
			</body>
		</html>
	);
}
