import React, { Suspense } from 'react';
import { seoConfig } from '@/constants/seoConfig';
import ContactPageClient from './ContactPageClient';

export const metadata = seoConfig.contact;

export default function ContactPage() {
	return (
		<>
			<Suspense
				fallback={
					<div className="min-h-screen flex items-center justify-center bg-gray-50">
						<div className="text-center">
							<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff5b5b] mx-auto mb-4"></div>
							<p className="text-gray-600">Loading...</p>
						</div>
					</div>
				}
			>
				<ContactPageClient />
			</Suspense>
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify({
						'@context': 'https://schema.org',
						'@type': 'ContactPage',
						name: 'Contact Henzo',
						description:
							'Get in touch with Henzo support team. Find help with booking, account issues, billing questions, or general inquiries.',
						url: '/contact',
						mainEntity: {
							'@type': 'Organization',
							name: 'Henzo',
							email: 'hello@henzo.app',
							url: 'https://henzo.app',
							contactPoint: {
								'@type': 'ContactPoint',
								email: 'hello@henzo.app',
								contactType: 'customer service',
								areaServed: 'Worldwide',
								availableLanguage: ['English'],
							},
						},
					}),
				}}
			/>
		</>
	);
}
