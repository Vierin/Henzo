import { Metadata } from 'next';

interface GenerateMetadataOptions {
	title: string;
	description: string;
	url: string;
	images?: string[];
	keywords?: string[];
	type?: 'website' | 'article';
}

export function generatePublicPageMetadata({
	title,
	description,
	url,
	images = ['/og-image.jpg'],
	keywords = [],
	type = 'website',
}: GenerateMetadataOptions): Metadata {
	const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://henzo.app';

	return {
		title,
		description,
		keywords: keywords.length > 0 ? keywords : undefined,
		openGraph: {
			title,
			description,
			type,
			url,
			images: images.map((img) => ({
				url: img.startsWith('http') ? img : `${baseUrl}${img}`,
				width: 1200,
				height: 630,
				alt: title,
			})),
			siteName: 'Henzo',
			locale: 'en_US',
		},
		twitter: {
			card: 'summary_large_image',
			title,
			description,
			images: images.map((img) => (img.startsWith('http') ? img : `${baseUrl}${img}`)),
			creator: '@henzo',
		},
		alternates: {
			canonical: url,
		},
	};
}

export function generateSalonMetadata(salon: {
	name: string;
	description?: string;
	photos?: string[];
	address?: string;
	slug: string;
}): Metadata {
	const title = `${salon.name} - Beauty Salon`;
	const description =
		salon.description ||
		`Professional beauty services at ${salon.name}. Book your appointment today!`;

	return generatePublicPageMetadata({
		title,
		description,
		url: `/salon/${salon.slug}`,
		images: salon.photos && salon.photos.length > 0 ? salon.photos : undefined,
		keywords: [
			'beauty salon',
			'hair salon',
			'nail salon',
			'spa services',
			salon.name,
			salon.address || '',
		].filter(Boolean),
	});
}

