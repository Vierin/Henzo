import React from 'react';
import { seoConfig } from '@/constants/seoConfig';
import ContactPageClient from './ContactPageClient';

export const metadata = seoConfig.contact;

export default function ContactPage() {
	return (
		<>
			<ContactPageClient />
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
