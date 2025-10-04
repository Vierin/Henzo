import { Metadata } from 'next';
import SalonsClient from '@/app/(public)/salons/salonsClient';

export async function generateMetadata(): Promise<Metadata> {
	const title = 'Find Beauty Salons & Services | Henzo';
	const description =
		'Discover the best beauty salons, spas, and wellness services near you. Book appointments online with professional salons offering hair, nails, massage, tattoo, and cosmetic services.';

	return {
		title,
		description,
		openGraph: {
			title,
			description,
			type: 'website',
			url: '/salons',
			images: [
				{
					url: '/og-salons.jpg',
					width: 1200,
					height: 630,
					alt: 'Beauty Salons & Services | Henzo',
				},
			],
			siteName: 'Henzo',
			locale: 'en_US',
		},
		twitter: {
			card: 'summary_large_image',
			title,
			description,
			images: ['/og-salons.jpg'],
			creator: '@henzo',
		},
		alternates: {
			canonical: '/salons',
		},
	};
}

export default function SalonsPage() {
	return <SalonsClient />;
}
