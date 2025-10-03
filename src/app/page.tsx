import HomePageClient from './HomePageClient';
import { seoConfig } from '@/constants/seoConfig';

export const metadata = seoConfig.home;

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
