import { Metadata } from 'next';
import HomePageClient from './HomePageClient';

export async function generateMetadata(): Promise<Metadata> {
	const title =
		'Henzo - Book Beauty & Wellness Appointments Online | Hair, Spa, Massage';
	const description =
		'Book your next beauty appointment with Henzo. Find and book hair salons, spas, massage therapists, nail salons, and wellness services near you. Easy online booking, trusted reviews, flexible scheduling.';

	const keywords = [
		'beauty appointments',
		'hair salon booking',
		'spa appointments',
		'massage booking',
		'nail salon',
		'wellness services',
		'beauty services',
		'online booking',
		'salon near me',
		'beauty treatments',
		'hair styling',
		'facial treatments',
		'manicure pedicure',
		'cosmetic services',
	];

	return {
		title,
		description,
		keywords,
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
			nocache: false,
			googleBot: {
				index: true,
				follow: true,
				noimageindex: false,
				'max-video-preview': -1,
				'max-image-preview': 'large',
				'max-snippet': -1,
			},
		},
		verification: {
			google: 'google-site-verification-code',
			yandex: 'yandex-verification-code',
		},
	};
}

export default function HomePage() {
	// Structured data for SEO
	const structuredData = {
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		name: 'Henzo',
		description:
			'Book beauty and wellness appointments online. Find hair salons, spas, massage therapists, and more.',
		url: process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://henzo.com',
		potentialAction: {
			'@type': 'SearchAction',
			target: {
				'@type': 'EntryPoint',
				urlTemplate: `${process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://henzo.com'}/salons?search={search_term_string}`,
			},
			'query-input': 'required name=search_term_string',
		},
		sameAs: [
			'https://facebook.com/henzo',
			'https://instagram.com/henzo',
			'https://twitter.com/henzo',
		],
	};

	const organizationData = {
		'@context': 'https://schema.org',
		'@type': 'Organization',
		name: 'Henzo',
		description: 'Leading beauty and wellness appointment booking platform',
		url: process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://henzo.com',
		logo: `${process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://henzo.com'}/logo.png`,
		contactPoint: {
			'@type': 'ContactPoint',
			contactType: 'customer service',
			availableLanguage: ['English'],
		},
		areaServed: 'Worldwide',
		serviceType: [
			'Beauty Services Booking',
			'Hair Salon Appointments',
			'Spa Reservations',
			'Massage Therapy Booking',
			'Nail Salon Appointments',
		],
	};

	return (
		<>
			{/* Structured Data */}
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
