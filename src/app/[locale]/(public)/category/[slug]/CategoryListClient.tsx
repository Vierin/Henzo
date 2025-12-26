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

interface CategoryListClientProps {
	category: {
		id: number;
		name: string;
		description?: string;
		slug: string;
	};
	translatedName: string;
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

export default function CategoryListClient({
	category,
	translatedName: _translatedName, // Keep for backward compatibility but use translation instead
}: CategoryListClientProps) {
	const t = useTranslation();
	const [sortBy, setSortBy] = useState('name');
	const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
	const [selectedService, setSelectedService] = useState<
		(ServiceResponseDto & { salonId: string; salonName: string }) | null
	>(null);

	const { data: salons, isLoading: loading, error } = useSalonsWithServices();

	// Get translated category name
	const translatedName = getCategoryTranslatedName(category, t);

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
		{ value: 'name', label: t.categories.sortNameAZ },
		{ value: 'name-desc', label: t.categories.sortNameZA },
		{ value: 'services', label: t.categories.sortMostServices },
	];

	// Filter and sort salons by category
	const filteredSalons = (salons || [])
		.filter((salon: Salon) => {
			// Only show salons that have at least one service
			if (!salon.services || salon.services.length === 0) {
				return false;
			}

			// Filter by categoryIds if available, otherwise fallback to keyword matching
			if (salon.categoryIds && salon.categoryIds.length > 0) {
				return salon.categoryIds.includes(category.id);
			}

			// Fallback: filter by salon name containing category keywords
			const categoryKeywords = translatedName.toLowerCase().split(' ');
			return categoryKeywords.some(
				(keyword: string) =>
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
		<>
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
											<SelectValue placeholder={t.categories.sortBy} />
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
									<span className="hidden sm:inline">
										{t.categories.mapView}
									</span>
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
										{t.categories.noSalonsFound}
									</h3>
									<p className="text-gray-600 mb-8">
										{t.categories.noSalonsDescription}
									</p>
									<div className="flex flex-col sm:flex-row gap-4 justify-center">
										<Link
											href="/salons"
											className="inline-flex items-center px-6 py-3 bg-[#ff5b5b] text-white rounded-lg hover:bg-[#e04a4a] transition-colors"
										>
											{t.categories.browseAllSalons}
										</Link>
									</div>
								</div>
							)}
						</div>
					</div>
				</main>
			</div>

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
		</>
	);
}
