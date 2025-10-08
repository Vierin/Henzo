import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { Salon } from '@/types';
import SalonDetailClient from './salonDetailClient';
import {
	generateSalonSlug,
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
		// Проверяем, является ли это старым ID (UUID) или новым slug
		const isOldId = /^[a-f0-9-]{36}$/.test(slug);
		const salonId = isOldId ? slug : extractSalonIdFromSlug(slug);

		if (!salonId) {
			console.log('❌ No salonId extracted from slug:', slug);
			return null;
		}

		// Валидация slug для новых URL
		if (!isOldId && !isValidSalonSlug(slug)) {
			return null;
		}

		const response = await apiClient.get<SalonWithDetailsResponseDto>(
			`/salons/${salonId}`
		);
		const salon = response;

		return salon;
	} catch (error) {
		console.error('Error fetching salon:', error);
		return null;
	}
}

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

	// Проверяем, нужно ли редиректить со старого ID на новый slug
	const isOldId = /^[a-f0-9-]{36}$/.test(slug);
	if (isOldId) {
		const newSlug = generateSalonSlug(salon.name, salon.id, salon.address);
		return (
			<div className="min-h-screen bg-[#F8F5F2] flex items-center justify-center">
				<div className="text-center">
					<p className="text-gray-600 mb-4">
						Redirecting to updated salon page...
					</p>
					<meta httpEquiv="refresh" content={`0; url=/salon/${newSlug}`} />
				</div>
			</div>
		);
	}

	return <SalonDetailClient salon={salon} />;
}
