'use client';

import { useState, useEffect } from 'react';
import { useSalonSearch } from '@/hooks/useSalonSearch';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorDisplay from '@/components/ErrorDisplay';
import SalonCard from '@/components/SalonCard';
import BookingModal from '@/components/BookingModal';
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
import { getCategoryTranslatedName } from '@/hooks/useCategories';

interface CategoryListClientProps {
	category: {
		id: number;
		name: string;
		description?: string;
		slug: string;
	};
	translatedName: string;
}

export default function CategoryListClient({
	category,
	translatedName: _translatedName,
}: CategoryListClientProps) {
	const t = useTranslation();
	const [sortBy, setSortBy] = useState('name');
	const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
	const [selectedService, setSelectedService] = useState<
		(ServiceResponseDto & { salonId: string; salonName: string }) | null
	>(null);

	const [currentPage, setCurrentPage] = useState(1);
	const [accumulatedSalons, setAccumulatedSalons] = useState<Salon[]>([]);
	const [currentPagination, setCurrentPagination] = useState<any>(null);

	const {
		data: searchData,
		isLoading: loading,
		error,
	} = useSalonSearch({
		page: currentPage,
		limit: 20, // Optimized: reduced from 100 to 20 per page
		category: category.slug, // Filter by main category slug (e.g., "hair-barber")
		// Only pass sortBy to backend if it's supported server-side
		// 'services' sorting is done client-side
		sortBy: sortBy === 'services' ? undefined : sortBy,
	});

	// Accumulate salon results for pagination
	useEffect(() => {
		const result = searchData as any;
		if (result?.data && result?.pagination) {
			if (result.pagination.page === 1) {
				// Reset accumulated results for new search/sort
				setAccumulatedSalons(result.data);
			} else {
				// Append new results for pagination (dedupe by id)
				setAccumulatedSalons((prev) => {
					const existing = new Set(prev.map((s) => s.id));
					const merged = [...prev];
					for (const s of result.data as Salon[]) {
						if (!existing.has(s.id)) merged.push(s);
					}
					return merged;
				});
			}
			setCurrentPagination(result.pagination);
		}
	}, [searchData]);

	// Reset accumulated results when sort changes
	useEffect(() => {
		setAccumulatedSalons([]);
		setCurrentPagination(null);
		setCurrentPage(1);
	}, [sortBy]);

	// Extract salons and pagination from accumulated state
	const salons = accumulatedSalons;
	const pagination = currentPagination;

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

	const handleLoadMore = () => {
		if (pagination?.hasNextPage) {
			setCurrentPage((prev) => prev + 1);
		}
	};

	// Reset page when sort changes
	useEffect(() => {
		setCurrentPage(1);
	}, [sortBy]);

	const sortOptions = [
		{ value: 'name', label: t.salon.sortNameAZ },
		{ value: 'name-desc', label: t.salon.sortNameZA },
		{ value: 'services', label: t.salon.sortMostServices },
	];

	// Salons are already filtered by main_category_id on the server
	// Just apply client-side sorting for 'services' (others are server-side)
	const sortedSalons = [...(salons || [])].sort((a: Salon, b: Salon) => {
		switch (sortBy) {
			case 'name':
				return a.name.localeCompare(b.name);
			case 'name-desc':
				return b.name.localeCompare(a.name);
			case 'services':
				// Use _count.Service if available, otherwise fallback to services.length
				const aCount = (a as any)._count?.Service || a.services?.length || 0;
				const bCount = (b as any)._count?.Service || b.services?.length || 0;
				return bCount - aCount;
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
								{translatedName} ({pagination?.total || sortedSalons.length})
							</h1>
							<div className="flex gap-2 sm:gap-3">
								{/* Sort Dropdown */}
								<div className="flex-1 sm:flex-none sm:w-48">
									<Select value={sortBy} onValueChange={setSortBy}>
										<SelectTrigger className="w-full bg-white border border-gray-300 rounded-md">
											<SelectValue placeholder={t.salon.sortBy} />
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
									<span className="hidden sm:inline">{t.salon.mapView}</span>
								</Link>
							</div>
						</div>

						{/* Salon Cards */}
						<div className="space-y-4 sm:space-y-6">
							{sortedSalons.length > 0 ? (
								sortedSalons.map((salon: Salon) => (
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
										{t.salon.noSalonsFound}
									</h3>
									<p className="text-gray-600 mb-8">
										{t.categories.noSalonsDescription}
									</p>
									<div className="flex flex-col sm:flex-row gap-4 justify-center">
										<Link
											href="/salons"
											className="inline-flex items-center px-6 py-3 bg-[#ff5b5b] text-white rounded-lg hover:bg-[#e04a4a] transition-colors"
										>
											{t.salon.browseAllSalons}
										</Link>
									</div>
								</div>
							)}
						</div>

						{/* Load More Button */}
						{pagination?.hasNextPage && (
							<div className="text-center mt-8">
								<button
									onClick={handleLoadMore}
									className="bg-[#ff5b5b] text-white px-8 py-4 rounded-2xl font-medium hover:bg-[#e04a4a] transition-colors focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:ring-offset-2"
									aria-label={`Load more salons (page ${pagination.page + 1})`}
								>
									{t.salon.loadMore || 'Load more'} (
									{pagination.total - pagination.page * pagination.limit}{' '}
									{t.salon.remaining || 'remaining'})
								</button>
							</div>
						)}
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
				service={
					selectedService
						? (() => {
								const { salonName: _salonName, ...svc } = selectedService;
								return svc as Service;
							})()
						: undefined
				}
				showServiceSelector={true}
			/>
		</>
	);
}
