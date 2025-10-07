import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
	const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://henzo.app';

	// Static pages - optimized priorities for Vietnamese market
	const staticPages = [
		{
			url: baseUrl,
			lastModified: new Date(),
			changeFrequency: 'daily' as const,
			priority: 1,
		},
		{
			url: `${baseUrl}/salons`,
			lastModified: new Date(),
			changeFrequency: 'daily' as const,
			priority: 0.9,
		},
		{
			url: `${baseUrl}/business`,
			lastModified: new Date(),
			changeFrequency: 'weekly' as const,
			priority: 0.95,
		},
		{
			url: `${baseUrl}/business/register`,
			lastModified: new Date(),
			changeFrequency: 'monthly' as const,
			priority: 0.85,
		},
		{
			url: `${baseUrl}/map`,
			lastModified: new Date(),
			changeFrequency: 'daily' as const,
			priority: 0.8,
		},
		{
			url: `${baseUrl}/about`,
			lastModified: new Date(),
			changeFrequency: 'monthly' as const,
			priority: 0.6,
		},
		{
			url: `${baseUrl}/contact`,
			lastModified: new Date(),
			changeFrequency: 'monthly' as const,
			priority: 0.6,
		},
		{
			url: `${baseUrl}/login`,
			lastModified: new Date(),
			changeFrequency: 'monthly' as const,
			priority: 0.5,
		},
		{
			url: `${baseUrl}/register`,
			lastModified: new Date(),
			changeFrequency: 'monthly' as const,
			priority: 0.5,
		},
		{
			url: `${baseUrl}/terms-of-service`,
			lastModified: new Date(),
			changeFrequency: 'yearly' as const,
			priority: 0.3,
		},
		{
			url: `${baseUrl}/privacy-policy`,
			lastModified: new Date(),
			changeFrequency: 'yearly' as const,
			priority: 0.3,
		},
	];

	// Category pages
	const categoryPages = [
		'hair-barber',
		'tattoo-piercing',
		'massage-spa',
		'manicure-pedicure',
		'cosmetic-medicine',
		'other-services',
	].map((slug) => ({
		url: `${baseUrl}/category/${slug}`,
		lastModified: new Date(),
		changeFrequency: 'weekly' as const,
		priority: 0.8,
	}));

	return [...staticPages, ...categoryPages];
}
