import type { Metadata } from 'next';
import type { Locale } from '@/i18n/routing';
import { buildDynamicPageMetadata } from '@/seo/buildMetadata';

export function generateSalonMetadata(
	salon: {
		name: string;
		description?: string;
		photos?: string[];
		address?: string;
		slug: string;
	},
	locale: Locale
): Metadata {
	const title = `${salon.name} · Henzo`;
	const description =
		salon.description?.trim() ||
		`Book beauty services at ${salon.name}. View availability and reserve online on Henzo.`;

	return buildDynamicPageMetadata(locale, {
		pathAfterLocale: `/salon/${salon.slug}`,
		title,
		description,
		keywords: [
			'beauty salon',
			'hair salon',
			'nail salon',
			'spa',
			salon.name,
			salon.address || '',
		].filter(Boolean),
		images:
			salon.photos && salon.photos.length > 0 ? salon.photos : ['/og-image.jpg'],
	});
}
