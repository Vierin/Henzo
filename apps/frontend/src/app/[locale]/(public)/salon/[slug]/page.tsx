import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { serverApiGet } from '@/lib/api-server';
import SalonDetailClient from './salonDetailClient';
import { extractSalonIdFromSlug, isValidSalonSlug } from '@/utils/slug';
import { SalonWithDetailsResponseDto } from '@/types/dto/salon.dto';
import { resolveLocale } from '@/seo';
import { generateSalonMetadata } from '@/utils/seoHelpers';

/** Next-generated `params` typing may omit `locale`; runtime includes all `[segment]` values. */
interface SalonDetailPageProps {
	params: Promise<{ slug: string; locale?: string }>;
}

/** Public salon page: shorter cache so new photos/name show up without waiting an hour.
 * Must be a numeric literal on the export — Next.js static analysis rejects `export const revalidate = SOME_CONST`.
 */
export const revalidate = 120;

async function getSalonData(
	slug: string
): Promise<SalonWithDetailsResponseDto | null> {
	const cacheOpts = { revalidate } as const;
	const isOldId = /^[a-f0-9-]{36}$/.test(slug);

	if (isOldId) {
		const response = await serverApiGet<SalonWithDetailsResponseDto>(
			`/salons/${slug}`,
			cacheOpts
		);
		return response ?? null;
	}

	const bySlug = await serverApiGet<SalonWithDetailsResponseDto>(
		`/salons/by-slug/${slug}`,
		cacheOpts
	);
	if (bySlug) return bySlug;

	const salonId = extractSalonIdFromSlug(slug);
	if (salonId && isValidSalonSlug(slug)) {
		const byId = await serverApiGet<SalonWithDetailsResponseDto>(
			`/salons/${salonId}`,
			cacheOpts
		);
		return byId ?? null;
	}

	return null;
}

export async function generateMetadata({
	params,
}: SalonDetailPageProps): Promise<Metadata> {
	const { slug, locale: raw } = await params;
	const locale = resolveLocale(raw ?? 'en');
	const salon = await getSalonData(slug);

	if (!salon) {
		return {
			title: 'Salon Not Found',
			description: 'The requested salon could not be found.',
		};
	}

	return generateSalonMetadata(
		{
			name: salon.name,
			description: salon.description,
			photos: salon.photos,
			address: salon.address,
			slug: salon.slug ?? slug,
		},
		locale
	);
}

export default async function SalonDetailPage({
	params,
}: SalonDetailPageProps) {
	const { slug, locale: rawLocale } = await params;
	const locale = resolveLocale(rawLocale ?? 'en');
	const salon = await getSalonData(slug);

	if (!salon) {
		notFound();
	}

	const isOldId = /^[a-f0-9-]{36}$/.test(slug);
	if (isOldId && salon.id && salon.slug) {
		redirect(`/${locale}/salon/${salon.slug}`);
	}

	return <SalonDetailClient salon={salon} />;
}
