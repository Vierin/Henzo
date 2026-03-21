import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { serverApiGet } from '@/lib/api-server';
import SalonDetailClient from './salonDetailClient';
import { extractSalonIdFromSlug, isValidSalonSlug } from '@/utils/slug';
import { SalonWithDetailsResponseDto } from '@/types/dto/salon.dto';

interface SalonDetailPageProps {
	params: Promise<{ slug: string }>;
}

/** Public salon page: shorter cache so new photos/name show up without waiting an hour. */
const SALON_PAGE_REVALIDATE_SEC = 120;

async function getSalonData(
	slug: string
): Promise<SalonWithDetailsResponseDto | null> {
	const cacheOpts = { revalidate: SALON_PAGE_REVALIDATE_SEC } as const;
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

export const revalidate = SALON_PAGE_REVALIDATE_SEC;

export async function generateMetadata({
	params,
}: SalonDetailPageProps): Promise<Metadata> {
	const { slug } = await params;
	const salon = await getSalonData(slug);

	if (!salon) {
		return {
			title: 'Salon Not Found',
			description: 'The requested salon could not be found.',
		};
	}

	const title = `${salon.name} - Beauty Salon`;
	const description =
		salon.description ||
		`Professional beauty services at ${salon.name}. Book your appointment today!`;

	return {
		title,
		description,
		keywords: [
			'beauty salon',
			'hair salon',
			'nail salon',
			'spa services',
			salon.name,
			salon.address || '',
		].filter(Boolean),
		openGraph: {
			title,
			description,
			type: 'website',
			url: `/salon/${slug}`,
			images:
				salon.photos && salon.photos.length > 0 ? salon.photos : undefined,
		},
		twitter: {
			card: 'summary_large_image',
			title,
			description,
			images:
				salon.photos && salon.photos.length > 0 ? salon.photos : undefined,
		},
		alternates: {
			canonical: `/salon/${slug}`,
		},
	};
}

export default async function SalonDetailPage({
	params,
}: SalonDetailPageProps) {
	const { slug } = await params;
	const salon = await getSalonData(slug);

	if (!salon) {
		notFound();
	}

	const isOldId = /^[a-f0-9-]{36}$/.test(slug);
	if (isOldId && salon.id && salon.slug) {
		return (
			<div className="min-h-screen bg-[#F8F5F2] flex items-center justify-center">
				<div className="text-center">
					<p className="text-gray-600 mb-4">
						Redirecting to updated salon page...
					</p>
					<meta httpEquiv="refresh" content={`0; url=/salon/${salon.slug}`} />
				</div>
			</div>
		);
	}

	return <SalonDetailClient salon={salon} />;
}
