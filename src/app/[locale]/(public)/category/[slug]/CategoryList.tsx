'use client';

import { useState } from 'react';
import { useSalonsWithServices } from '@/hooks/useSalons';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorDisplay from '@/components/ErrorDisplay';
import SalonCard from '@/components/SalonCard';
import BookingModal from '@/components/BookingModal';
import MobileSearchTrigger from '@/components/MobileSearchTrigger';
import { Salon, Service } from '@/types';
import { ServiceResponseDto } from '@/types/dto/service.dto';
import Link from 'next/link';
import { Map } from 'lucide-react';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '@/contexts/LanguageContext';

interface CategoryListProps {
	category: {
		id: number;
		name: string;
		description?: string;
		slug: string;
	};
}

const categoryTranslationMap: Record<
	string,
	keyof ReturnType<typeof useTranslation>['categories']
> = {
	'hair-barber': 'hairBarber',
	'massage-spa': 'massageSpa',
	'manicure-pedicure': 'manicurePedicure',
	'cosmetic-medicine': 'cosmeticMedicine',
	'other-services': 'otherServices',
};

export default function CategoryList({ category }: CategoryListProps) {
	const [sortBy, setSortBy] = useState('name');
	const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
	const [selectedService, setSelectedService] = useState<
		(ServiceResponseDto & { salonId: string; salonName: string }) | null
	>(null);
	const t = useTranslation();

	const { data: salons, isLoading: loading, error } = useSalonsWithServices();

	const translationKey = categoryTranslationMap[category.slug];
	const translatedName = translationKey
		? t.categories[translationKey]
		: category.name;

	const handleBookService = (
		service: ServiceResponseDto,
		salonId: string,
		salonName: string
	) => {
		setSelectedService({
			...service,
			salonId,
			salonName,
		});
		setIsBookingModalOpen(true);
	};

	const sortOptions = [
		{ value: 'name', label: 'Name A-Z' },
		{ value: 'name-desc', label: 'Name Z-A' },
		{ value: 'services', label: 'Most Services' },
	];

	// Filter and sort salons by category
	const filteredSalons = (salons || [])
		.filter((salon: Salon) => {
			// Filter by categoryIds if available, otherwise fallback to keyword matching
			if (salon.categoryIds && salon.categoryIds.length > 0) {
				return salon.categoryIds.includes(category.id);
			}

			// Fallback: filter by salon name containing category keywords
			const categoryKeywords = translatedName.toLowerCase().split(' ');
			return categoryKeywords.some(
				(keyword) =>
					salon.name.toLowerCase().includes(keyword) ||
					salon.description?.toLowerCase().includes(keyword)
			);
		})
		.sort((a: Salon, b: Salon) => {
			switch (sortBy) {
				case 'name':
					return a.name.localeCompare(b.name);
				case 'name-desc':
					return b.name.localeCompare(a.name);
				case 'services':
					return (b.services?.length || 0) - (a.services?.length || 0);
				default:
					return 0;
			}
		});

	if (loading) {
		return (
			<div className="min-h-screen bg-[#F8F5F2]">
				<div className="container mx-auto px-4 py-8">
					<LoadingSpinner />
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="min-h-screen bg-[#F8F5F2]">
				<div className="container mx-auto px-4 py-8">
					<ErrorDisplay message="Failed to load salons" error={error} />
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-[#F8F5F2]">
			<main className="py-6 sm:py-8 px-4 sm:px-6">
				<div className="mx-auto max-w-6xl">
					{/* Category Header with Sort */}
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
						<h1 className="text-xl sm:text-2xl font-bold text-gray-900">
							{translatedName} ({filteredSalons.length})
						</h1>
						<div className="flex gap-2 sm:gap-3">
							{/* Sort Dropdown */}
							<div className="flex-1 sm:flex-none sm:w-48">
								<Select value={sortBy} onValueChange={setSortBy}>
									<SelectTrigger className="w-full bg-white border border-gray-300 rounded-md">
										<SelectValue placeholder="Sort by" />
									</SelectTrigger>
									<SelectContent
										className="bg-white border border-gray-300 shadow-lg rounded-md"
										style={{ zIndex: 1001 }}
										side="bottom"
										align="start"
									>
										{sortOptions.map((option) => (
											<SelectItem
												key={option.value}
												value={option.value}
												className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
											>
												{option.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							{/* map button */}
							<Link
								href="/map"
								className="px-3 sm:px-4 py-2 sm:h-9 flex gap-1 items-center bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-gray-900 text-sm whitespace-nowrap"
							>
								<Map className="w-4 h-4" />{' '}
								<span className="hidden sm:inline">Map View</span>
							</Link>
						</div>
					</div>

					{/* Salon Cards */}
					<div className="space-y-4 sm:space-y-6">
						{filteredSalons.length > 0 ? (
							filteredSalons.map((salon: Salon) => (
								<SalonCard
									key={salon.id}
									salon={salon}
									onBookService={handleBookService}
								/>
							))
						) : (
							// No salons found
							<div className="text-center py-12">
								<h3 className="text-xl font-semibold text-gray-900 mb-2">
									No {translatedName.toLowerCase()} salons found
								</h3>
								<p className="text-gray-600 mb-8">
									We couldn't find any salons in the {translatedName} category
									at the moment. Check back soon or explore other categories.
								</p>
								<div className="flex flex-col sm:flex-row gap-4 justify-center">
									<Link
										href="/salons"
										className="inline-flex items-center px-6 py-3 bg-[#ff5b5b] text-white rounded-lg hover:bg-[#e04a4a] transition-colors"
									>
										Browse All Salons
									</Link>
								</div>
							</div>
						)}
					</div>
				</div>
			</main>

			{/* Booking Modal */}
			<BookingModal
				isOpen={isBookingModalOpen}
				onClose={() => {
					setIsBookingModalOpen(false);
					setSelectedService(null);
				}}
				salonId={selectedService?.salonId}
				salonName={selectedService?.salonName}
				showServiceSelector={true}
			/>

			{/* Structured Data */}
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify({
						'@context': 'https://schema.org',
						'@type': 'CollectionPage',
						name: `${translatedName} Salons`,
						description: `Find the best ${translatedName.toLowerCase()} salons and services. Professional ${translatedName.toLowerCase()} treatments and appointments.`,
						url: `/category/${category.slug}`,
						mainEntity: {
							'@type': 'ItemList',
							numberOfItems: filteredSalons.length,
							itemListElement: filteredSalons.map((salon, index) => ({
								'@type': 'LocalBusiness',
								'@id': `/salon/${salon.id}`,
								position: index + 1,
								name: salon.name,
								description: salon.description,
								address: salon.address,
								telephone: salon.phone,
								url: `/salon/${salon.id}`,
							})),
						},
						breadcrumb: {
							'@type': 'BreadcrumbList',
							itemListElement: [
								{
									'@type': 'ListItem',
									position: 1,
									name: 'Home',
									item: '/',
								},
								{
									'@type': 'ListItem',
									position: 2,
									name: 'Salons',
									item: '/salons',
								},
								{
									'@type': 'ListItem',
									position: 3,
									name: category.name,
									item: `/category/${category.slug}`,
								},
							],
						},
					}),
				}}
			/>
		</div>
	);
}
