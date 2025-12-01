import { Suspense } from 'react';
import HomePageClient from './HomePageClient';
import { seoConfig } from '@/constants/seoConfig';

export const metadata = seoConfig.home;

export default function HomePage() {
	// Structured data for SEO - Optimized for Vietnam
	const structuredData = {
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		name: 'Henzo',
		alternateName: 'Henzo Vietnam - Đặt lịch làm đẹp',
		description:
			'Đặt lịch hẹn làm đẹp online tại Việt Nam. Tìm salon tóc, spa, massage, nail tại Hà Nội, TP.HCM.',
		url: process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://henzo.app',
		inLanguage: ['vi', 'en'],
		potentialAction: {
			'@type': 'SearchAction',
			target: {
				'@type': 'EntryPoint',
				urlTemplate: `${process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://henzo.app'}/salons?search={search_term_string}`,
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
		alternateName: 'Henzo Vietnam',
		description:
			'Nền tảng đặt lịch làm đẹp hàng đầu tại Việt Nam - Beauty appointment booking platform',
		url: process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://henzo.app',
		logo: `${process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://henzo.app'}/logo.png`,
		contactPoint: {
			'@type': 'ContactPoint',
			contactType: 'customer service',
			availableLanguage: ['Vietnamese', 'English'],
			areaServed: 'VN',
		},
		address: {
			'@type': 'PostalAddress',
			addressCountry: 'VN',
			addressRegion: 'Hanoi',
		},
		areaServed: [
			{
				'@type': 'City',
				name: 'Hanoi',
				'@id': 'https://www.wikidata.org/wiki/Q1858',
			},
			{
				'@type': 'City',
				name: 'Ho Chi Minh City',
				'@id': 'https://www.wikidata.org/wiki/Q1854',
			},
			{
				'@type': 'Country',
				name: 'Vietnam',
				'@id': 'https://www.wikidata.org/wiki/Q881',
			},
		],
		serviceType: [
			'Đặt lịch salon tóc',
			'Đặt lịch spa',
			'Đặt lịch massage',
			'Đặt lịch nail',
			'Beauty Services Booking',
			'Hair Salon Appointments',
			'Spa Reservations',
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

			<Suspense
				fallback={
					<div className="min-h-screen bg-[#F8F5F2]">
						<div className="h-20 bg-white shadow-sm" />
						<div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
							<div className="text-center">
								<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff5b5b] mx-auto mb-4"></div>
								<p className="text-gray-600">Loading...</p>
							</div>
						</div>
					</div>
				}
			>
				<HomePageClient />
			</Suspense>
		</>
	);
}
