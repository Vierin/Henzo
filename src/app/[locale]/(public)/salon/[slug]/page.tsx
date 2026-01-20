import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import SalonDetailClient from './salonDetailClient';
import {
	extractSalonIdFromSlug,
	isValidSalonSlug,
} from '@/utils/slug';
import { SalonWithDetailsResponseDto } from '@/types/dto/salon.dto';

interface SalonDetailPageProps {
	params: Promise<{ slug: string }>;
}

async function getSalonData(
	slug: string
): Promise<SalonWithDetailsResponseDto | null> {
	try {
		const isOldId = /^[a-f0-9-]{36}$/.test(slug);
		
		if (isOldId) {
			const response = await apiClient.get<SalonWithDetailsResponseDto>(
				`/salons/${slug}`
			);
			return response;
		}

		try {
			const response = await apiClient.get<SalonWithDetailsResponseDto>(
				`/salons/by-slug/${slug}`
			);
			if (response) return response;
		} catch (error: any) {
			// Если не нашли по slug, пробуем fallback - извлечь ID из slug
			const salonId = extractSalonIdFromSlug(slug);
			if (salonId && isValidSalonSlug(slug)) {
				const response = await apiClient.get<SalonWithDetailsResponseDto>(
					`/salons/${salonId}`
				);
				return response;
			}
		}

		return null;
	} catch (error: any) {
		// Return null to trigger notFound() which shows a proper 404 page
		return null;
	}
}

// ISR: Revalidate every hour (3600 seconds)
export const revalidate = 3600;

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
