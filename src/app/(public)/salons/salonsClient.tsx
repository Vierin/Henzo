'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import BookingModal from '../../../components/BookingModal';
import LoadingSpinner from '../../../components/LoadingSpinner';
import ErrorDisplay from '../../../components/ErrorDisplay';
import SalonCard from '../../../components/SalonCard';
import { useSalonSearch } from '@/hooks/useSalonSearch';
import { ServiceResponseDto } from '@/types/dto/service.dto';
import { Salon, Service } from '@/types';

export default function SalonsClient() {
	const searchParams = useSearchParams();

	// Initialize state from URL parameters immediately
	const getInitialParams = useCallback(() => {
		const search = searchParams.get('search');
		const location = searchParams.get('location');
		const salon = searchParams.get('salon');
		const service = searchParams.get('service');
		const date = searchParams.get('date');
		const time = searchParams.get('time');

		let searchQuery = '';
		if (service) {
			searchQuery = service;
		} else if (salon) {
			searchQuery = salon;
		} else if (search) {
			searchQuery = search;
		}

		let selectedDate: Date | null = null;
		if (date) {
			const [year, month, day] = date.split('-').map(Number);
			selectedDate = new Date(year, month - 1, day);
		}

		return {
			searchQuery,
			selectedLocation: location || '',
			selectedDate,
			selectedTimeInterval: time || '',
		};
	}, [searchParams]);

	const initialParams = getInitialParams();

	// State management - initialize with URL params
	const [searchQuery, setSearchQuery] = useState(initialParams.searchQuery);
	const [selectedLocation, setSelectedLocation] = useState(
		initialParams.selectedLocation
	);
	const [selectedDate, setSelectedDate] = useState<Date | null>(
		initialParams.selectedDate
	);
	const [selectedTimeInterval, setSelectedTimeInterval] = useState<string>(
		initialParams.selectedTimeInterval
	);
	const [activeFilter, setActiveFilter] = useState('all');
	const [sortBy, setSortBy] = useState('name');
	const [currentPage, setCurrentPage] = useState(1);
	const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
	const [selectedService, setSelectedService] = useState<
		(ServiceResponseDto & { salonId: string; salonName: string }) | null
	>(null);

	// Use optimized search instead of loading all salons
	const {
		data: searchData,
		isLoading: loading,
		error,
		refetch,
	} = useSalonSearch({
		page: currentPage,
		limit: 20,
		search: searchQuery,
		location: selectedLocation,
		category: activeFilter,
		sortBy: sortBy,
		accumulate: currentPage > 1, // Accumulate results for pagination
	});

	// Accumulate salon results for pagination
	const [accumulatedSalons, setAccumulatedSalons] = useState<Salon[]>([]);
	const [currentPagination, setCurrentPagination] = useState<any>(null);

	useEffect(() => {
		const result = searchData as any;
		if (result?.data && result?.pagination) {
			if (result.pagination.page === 1) {
				// Reset accumulated results for new search
				setAccumulatedSalons(result.data);
			} else {
				// Append new results for pagination
				setAccumulatedSalons((prev) => [...prev, ...result.data]);
			}
			setCurrentPagination(result.pagination);
		}
	}, [searchData]);

	// Reset accumulated results when search parameters change
	useEffect(() => {
		setAccumulatedSalons([]);
		setCurrentPagination(null);
	}, [searchQuery, selectedLocation, activeFilter, sortBy]);

	const salons = accumulatedSalons;
	const pagination = currentPagination;

	// Update state when URL parameters change
	useEffect(() => {
		const newParams = getInitialParams();

		// Update state only if values have changed
		setSearchQuery((prevQuery) => {
			if (newParams.searchQuery !== prevQuery) {
				return newParams.searchQuery;
			}
			return prevQuery;
		});

		setSelectedLocation((prevLocation) => {
			if (newParams.selectedLocation !== prevLocation) {
				return newParams.selectedLocation;
			}
			return prevLocation;
		});

		setSelectedDate((prevDate) => {
			if (newParams.selectedDate?.getTime() !== prevDate?.getTime()) {
				return newParams.selectedDate;
			}
			return prevDate;
		});

		setSelectedTimeInterval((prevTime) => {
			if (newParams.selectedTimeInterval !== prevTime) {
				return newParams.selectedTimeInterval;
			}
			return prevTime;
		});
	}, [getInitialParams]);

	// Memoized sort options
	const sortOptions = useMemo(
		() => [
			{ value: 'name', label: 'Name A-Z' },
			{ value: 'name-desc', label: 'Name Z-A' },
			{ value: 'services', label: 'Most Services' },
			{ value: 'rating', label: 'Highest Rated' },
		],
		[]
	);

	// Event handlers
	const handleBookService = useCallback(
		(
			service: ServiceResponseDto | Service,
			salonId: string,
			salonName: string
		) => {
			// Convert Service to ServiceResponseDto format if needed
			const serviceDto: ServiceResponseDto & {
				salonId: string;
				salonName: string;
			} = {
				id: service.id,
				name: service.name,
				description: service.description,
				duration: service.duration,
				price: service.price,
				salonId: salonId,
				salonName: salonName,
			};
			setSelectedService(serviceDto);
			setIsBookingModalOpen(true);
		},
		[]
	);

	const handleCloseBookingModal = useCallback(() => {
		setIsBookingModalOpen(false);
		setSelectedService(null);
	}, []);

	const handleLoadMore = useCallback(() => {
		if (pagination?.hasNextPage) {
			setCurrentPage((prev) => prev + 1);
		}
	}, [pagination?.hasNextPage]);

	// Reset page when search parameters change
	useEffect(() => {
		setCurrentPage(1);
	}, [searchQuery, selectedLocation, activeFilter, sortBy]);

	// Generate results header text
	const resultsHeaderText = useMemo(() => {
		let baseText = '';

		if (searchQuery && selectedLocation) {
			baseText = `${searchQuery} in ${selectedLocation}`;
		} else if (searchQuery) {
			baseText = searchQuery;
		} else if (selectedLocation) {
			baseText = `Salons in ${selectedLocation}`;
		} else {
			baseText = 'All Salons';
		}

		// Add date and time information
		if (selectedDate) {
			const dateStr = selectedDate.toLocaleDateString('en-US', {
				weekday: 'long',
				month: 'long',
				day: 'numeric',
			});

			if (selectedTimeInterval && selectedTimeInterval !== 'any') {
				baseText += ` on ${dateStr} (${selectedTimeInterval})`;
			} else {
				baseText += ` on ${dateStr}`;
			}
		}

		return baseText;
	}, [searchQuery, selectedLocation, selectedDate, selectedTimeInterval]);

	const resultsCountText = useMemo(() => {
		if (pagination) {
			return `${pagination.total}`;
		}
		return '0';
	}, [pagination]);

	return (
		<div className="min-h-screen bg-[#F8F5F2]">
			<main className="py-8 px-6" role="main">
				<div className="mx-auto max-w-6xl">
					{/* Results Header */}
					<header className="flex items-center justify-between mb-8">
						<h1 className="text-2xl font-bold text-gray-900">
							{resultsHeaderText} ({resultsCountText})
						</h1>
						<div className="flex items-center gap-4">
							{/* Sort Dropdown */}
							<div className="relative">
								<label htmlFor="sort-select" className="sr-only">
									Sort salons by
								</label>
								<select
									id="sort-select"
									value={sortBy}
									onChange={(e) => setSortBy(e.target.value)}
									className="px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-gray-900"
									aria-label="Sort salons by"
								>
									{sortOptions.map((option) => (
										<option key={option.value} value={option.value}>
											{option.label}
										</option>
									))}
								</select>
							</div>
						</div>
					</header>

					{/* Salon Cards */}
					<section aria-label="Search results">
						<div className="space-y-4 sm:space-y-6">
							{loading ? (
								<div role="status" aria-live="polite">
									<LoadingSpinner message="Loading salons..." />
								</div>
							) : error ? (
								<ErrorDisplay
									error={error}
									message="Failed to load salons"
									onRetry={() => refetch()}
								/>
							) : salons.length === 0 ? (
								// No salons found
								<div className="text-center py-12">
									<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
										<span
											className="text-2xl"
											role="img"
											aria-label="No salons found"
										>
											🏪
										</span>
									</div>
									<h3 className="text-xl font-semibold text-gray-900 mb-2">
										No salons found
									</h3>
									<p className="text-gray-600">
										Try adjusting your search criteria or check back later.
									</p>
								</div>
							) : (
								// Display salons
								salons.map((salon) => (
									<SalonCard
										key={salon.id}
										salon={salon}
										onBookService={handleBookService}
										selectedDate={selectedDate}
										selectedTimeInterval={selectedTimeInterval}
									/>
								))
							)}
						</div>
					</section>

					{/* Load More Button */}
					{pagination?.hasNextPage && (
						<div className="text-center mt-12">
							<button
								onClick={handleLoadMore}
								className="bg-[#ff5b5b] text-white px-8 py-4 rounded-2xl font-medium hover:bg-[#e04a4a] transition-colors focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:ring-offset-2"
								aria-label={`Load more salons (page ${pagination.page + 1})`}
							>
								Load more (
								{pagination.total - pagination.page * pagination.limit}{' '}
								remaining)
							</button>
						</div>
					)}
				</div>
			</main>

			{/* Booking Modal */}
			<BookingModal
				isOpen={isBookingModalOpen}
				onClose={handleCloseBookingModal}
				salonId={selectedService?.salonId || ''}
				salonName={selectedService?.salonName || ''}
				showServiceSelector={true}
			/>
		</div>
	);
}
