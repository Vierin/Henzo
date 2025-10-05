'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import BookingModal from '../../../components/BookingModal';
import LoadingSpinner from '../../../components/LoadingSpinner';
import ErrorDisplay from '../../../components/ErrorDisplay';
import SalonImage from '../../../components/SalonImage';
import { useSalonSearch } from '@/hooks/useSalonSearch';
import { useSalonSlug } from '@/hooks/useSalonSlug';
import { ServiceResponseDto } from '@/types/dto/service.dto';
import { Salon, Service } from '@/types';
import {
	calculateAverageRating,
	getReviewCount,
	getAvailableTimeSlots,
} from '@/utils/salonUtils';
import { Clock8, Phone, Star } from 'lucide-react';

export default function SalonsClient() {
	const router = useRouter();
	const { getSalonUrl } = useSalonSlug();
	const searchParams = useSearchParams();

	// State management
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedLocation, setSelectedLocation] = useState('');
	const [selectedDate, setSelectedDate] = useState<Date | null>(null);
	const [selectedTimeInterval, setSelectedTimeInterval] = useState<string>('');
	const [activeFilter, setActiveFilter] = useState('all');
	const [sortBy, setSortBy] = useState('name');
	const [currentPage, setCurrentPage] = useState(1);
	const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
	const [selectedService, setSelectedService] = useState<
		(ServiceResponseDto & { salonId: string; salonName: string }) | null
	>(null);

	// Use optimized search instead of loading all salons
	const {
		data: searchResult,
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
		if (searchResult?.data && searchResult?.pagination) {
			if (searchResult.pagination.page === 1) {
				// Reset accumulated results for new search
				setAccumulatedSalons(searchResult.data);
			} else {
				// Append new results for pagination
				setAccumulatedSalons((prev) => [...prev, ...searchResult.data]);
			}
			setCurrentPagination(searchResult.pagination);
		}
	}, [searchResult]);

	// Reset accumulated results when search parameters change
	useEffect(() => {
		setAccumulatedSalons([]);
		setCurrentPagination(null);
	}, [searchQuery, selectedLocation, activeFilter, sortBy]);

	const salons = accumulatedSalons;
	const pagination = currentPagination;

	// Initialize from URL parameters
	useEffect(() => {
		const search = searchParams.get('search');
		const location = searchParams.get('location');
		const salon = searchParams.get('salon');
		const service = searchParams.get('service');
		const date = searchParams.get('date');
		const time = searchParams.get('time');

		// Set search query based on service or salon parameter
		if (service) {
			setSearchQuery(service);
		} else if (salon) {
			setSearchQuery(salon);
		} else if (search) {
			setSearchQuery(search);
		}

		// Set location
		if (location) {
			setSelectedLocation(location);
		}

		// Set date
		if (date) {
			setSelectedDate(new Date(date));
		}

		// Set time interval
		if (time) {
			setSelectedTimeInterval(time);
		}
	}, [searchParams]);

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
		(service: ServiceResponseDto, salonId: string, salonName: string) => {
			setSelectedService({
				...service,
				salonId,
				salonName,
			});
			setIsBookingModalOpen(true);
		},
		[]
	);

	const handleCloseBookingModal = useCallback(() => {
		setIsBookingModalOpen(false);
		setSelectedService(null);
	}, []);

	const handleSalonClick = useCallback(
		(salon: Salon) => {
			router.push(getSalonUrl(salon));
		},
		[router, getSalonUrl]
	);

	const handleLoadMore = useCallback(() => {
		if (pagination?.hasNextPage) {
			setCurrentPage((prev) => prev + 1);
		}
	}, [pagination?.hasNextPage]);

	const handleServiceClick = useCallback(
		(
			e: React.MouseEvent,
			service: ServiceResponseDto,
			salonId: string,
			salonName: string
		) => {
			e.stopPropagation();
			handleBookService(service, salonId, salonName);
		},
		[handleBookService]
	);

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
						<div className="space-y-6">
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
									<article
										key={salon.id}
										onClick={() => handleSalonClick(salon)}
										className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow cursor-pointer focus-within:ring-2 focus-within:ring-[#ff5b5b] focus-within:ring-offset-2"
										role="button"
										tabIndex={0}
										onKeyDown={(e) => {
											if (e.key === 'Enter' || e.key === ' ') {
												e.preventDefault();
												handleSalonClick(salon);
											}
										}}
										aria-label={`View details for ${salon.name}`}
									>
										<div className="flex gap-6">
											{/* Salon Image */}
											<SalonImage
												src={salon.logo}
												alt={`${salon.name} salon`}
												width={400}
												height={320}
												className="w-48 h-48 object-cover rounded-xl flex-shrink-0"
												style={{ width: 'auto', height: 'auto' }}
											/>

											{/* Salon Info */}
											<div className="flex-1">
												<div className="flex items-center justify-between mb-2">
													<h2 className="text-xl font-bold text-gray-900">
														{salon.name}
													</h2>
													{/* Rating */}
													{(() => {
														const rating = calculateAverageRating(salon);
														const reviewCount = getReviewCount(salon);

														if (rating > 0) {
															return (
																<div className="flex items-center space-x-1">
																	<Star className="w-4 h-4 fill-[#ff5b5b] text-[#ff5b5b]" />
																	<span className="text-sm font-medium text-gray-900">
																		{rating}
																	</span>
																	<span className="text-sm text-gray-500">
																		({reviewCount})
																	</span>
																</div>
															);
														}
														return null;
													})()}
												</div>
												{salon.address && (
													<address className="text-gray-600 text-sm mb-2 not-italic">
														{salon.address}
													</address>
												)}
												{salon.phone && (
													<p className="text-gray-500 text-sm mb-3 flex gap-1">
														<Phone className="w-3.5 h-3.5 relative top-0.5" />{' '}
														{salon.phone}
													</p>
												)}

												{/* Available Time Slots */}
												{selectedDate &&
													(() => {
														const availableSlots = getAvailableTimeSlots(
															salon,
															selectedDate,
															selectedTimeInterval
														);
														if (availableSlots.length > 0) {
															return (
																<div className="flex items-center space-x-1 mb-3">
																	<span className="text-green-600">🕒</span>
																	<span className="text-sm text-green-600 font-medium">
																		Available: {availableSlots.join(', ')}
																	</span>
																</div>
															);
														}
														return null;
													})()}
											</div>
										</div>

										{/* Services */}
										{salon.services && salon.services.length > 0 ? (
											<div className="mt-4">
												<h3 className="sr-only">Available services</h3>
												<div className="flex justify-between gap-3">
													{salon.services
														.slice(0, 3)
														.map((service: Service, index: number) => (
															<div
																key={service.id || index}
																className="flex items-center w-full max-w-[33.33%] justify-between py-2 px-3 bg-gray-50 rounded-lg"
															>
																<div className="flex-1">
																	<span className="text-sm font-medium text-gray-900">
																		{service.name}
																	</span>
																	<div className="flex items-center gap-4 mt-1">
																		<span className="text-xs text-gray-500">
																			<span className="sr-only">
																				Duration:{' '}
																			</span>
																			<Clock8 className="w-3.5 h-3.5 relative top-0.5" />{' '}
																			{service.duration} min
																		</span>
																		<span className="text-sm font-semibold text-[#ff5b5b]">
																			<span className="sr-only">Price: </span>$
																			{service.price}
																		</span>
																	</div>
																</div>
																<button
																	onClick={(e) =>
																		handleServiceClick(
																			e,
																			service,
																			salon.id,
																			salon.name
																		)
																	}
																	className="bg-[#ff5b5b] text-white px-3 py-1 rounded-md text-xs font-medium hover:bg-[#e04a4a] transition-colors focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:ring-offset-2"
																	aria-label={`Book ${service.name} at ${salon.name}`}
																>
																	Book
																</button>
															</div>
														))}
												</div>
											</div>
										) : (
											<div className="mt-4 text-center py-4">
												<p className="text-gray-500 text-sm">
													No services available
												</p>
											</div>
										)}

										{salon.services && salon.services.length > 3 && (
											<div className="text-center py-2">
												<button
													onClick={(e) => {
														e.stopPropagation();
														handleSalonClick(salon);
													}}
													className="text-[#ff5b5b] text-sm font-medium hover:text-[#e04a4a] transition-colors focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:ring-offset-2 rounded"
													aria-label={`View all ${salon.services.length} services at ${salon.name}`}
												>
													View all {salon.services.length} services →
												</button>
											</div>
										)}
									</article>
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
