import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
	const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://henzo.app';
	const locales = ['en', 'ru', 'vi'] as const;

	function withLocale(path: string, locale: (typeof locales)[number]) {
		const clean = path.startsWith('/') ? path : `/${path}`;
		return `${baseUrl}/${locale}${clean === '/' ? '' : clean}`;
	}

	function alternatesFor(path: string) {
		return {
			languages: {
				'en-US': withLocale(path, 'en'),
				'ru-RU': withLocale(path, 'ru'),
				'vi-VN': withLocale(path, 'vi'),
			},
		} as const;
	}

	// Static pages - optimized priorities for Vietnamese market
	const staticPaths = [
		{ path: '/', changeFrequency: 'daily' as const, priority: 1 },
		{ path: '/salons', changeFrequency: 'daily' as const, priority: 0.9 },
		{ path: '/business', changeFrequency: 'weekly' as const, priority: 0.95 },
		{
			path: '/business/register',
			changeFrequency: 'monthly' as const,
			priority: 0.85,
		},
		{ path: '/map', changeFrequency: 'daily' as const, priority: 0.8 },
		{ path: '/about', changeFrequency: 'monthly' as const, priority: 0.6 },
		{ path: '/contact', changeFrequency: 'monthly' as const, priority: 0.6 },
		{ path: '/login', changeFrequency: 'monthly' as const, priority: 0.5 },
		{ path: '/register', changeFrequency: 'monthly' as const, priority: 0.5 },
		{
			path: '/terms-of-service',
			changeFrequency: 'yearly' as const,
			priority: 0.3,
		},
		{
			path: '/privacy-policy',
			changeFrequency: 'yearly' as const,
			priority: 0.3,
		},
	];

	const staticPages = staticPaths.flatMap((item) =>
		locales.map((locale) => ({
			url: withLocale(item.path, locale),
			lastModified: new Date(),
			changeFrequency: item.changeFrequency,
			priority: item.priority,
			alternates: alternatesFor(item.path),
		}))
	);

	// Category pages
	const categoryPages = [
		'hair-barber',
		'tattoo-piercing',
		'massage-spa',
		'manicure-pedicure',
		'brows-lashes',
		'other-services',
	].flatMap((slug) =>
		locales.map((locale) => ({
			url: withLocale(`/category/${slug}`, locale),
			lastModified: new Date(),
			changeFrequency: 'weekly' as const,
			priority: 0.8,
			alternates: alternatesFor(`/category/${slug}`),
		}))
	);

	return [...staticPages, ...categoryPages];
}
