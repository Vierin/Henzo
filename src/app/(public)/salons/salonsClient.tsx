'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import BookingModal from '../../../components/BookingModal';
import LoadingSpinner from '../../../components/LoadingSpinner';
import ErrorDisplay from '../../../components/ErrorDisplay';
import SalonImage from '../../../components/SalonImage';
import BooksySearch from '../../../components/BooksySearch';
import { useSalonsWithServices } from '@/hooks/useSalons';
import { useSalonSlug } from '@/hooks/useSalonSlug';
import { ServiceResponseDto } from '@/types/dto/service.dto';
import { Salon, Service } from '@/types';
import { checkLocationMatch } from '@/constants/locations';

export default function SalonsClient() {
	const router = useRouter();
	const { getSalonUrl } = useSalonSlug();
	const searchParams = useSearchParams();

	// State management
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedLocation, setSelectedLocation] = useState('');
	const [activeFilter, setActiveFilter] = useState('All');
	const [sortBy, setSortBy] = useState('name');
	const [visibleSalonsCount, setVisibleSalonsCount] = useState(15);
	const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
	const [selectedService, setSelectedService] = useState<
		(ServiceResponseDto & { salonId: string; salonName: string }) | null
	>(null);

	const {
		data: salons = [],
		isLoading: loading,
		error,
		refetch,
	} = useSalonsWithServices();

	// Initialize from URL parameters
	useEffect(() => {
		const search = searchParams.get('search');
		const location = searchParams.get('location');
		const salon = searchParams.get('salon');
		const service = searchParams.get('service');

		if (search) setSearchQuery(search);
		if (location) setSelectedLocation(location);
		if (salon) setSearchQuery(salon);
		if (service) setSearchQuery(service);
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
		setVisibleSalonsCount((prev) => prev + 15);
	}, []);

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

	// Filter and sort salons with memoization
	const filteredSalons = useMemo(() => {
		let filtered = [...salons];

		// Filter by search query
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(
				(salon) =>
					salon.name.toLowerCase().includes(query) ||
					salon.address?.toLowerCase().includes(query) ||
					salon.services.some(
						(service: Service) =>
							service.name.toLowerCase().includes(query) ||
							service.serviceCategory?.nameEn?.toLowerCase().includes(query) ||
							service.serviceCategory?.nameVn?.toLowerCase().includes(query)
					)
			);
		}

		// Filter by location
		if (selectedLocation.trim()) {
			const location = selectedLocation.toLowerCase();
			filtered = filtered.filter((salon) => {
				if (!salon.address) return false;
				const salonAddress = salon.address.toLowerCase();
				return (
					salonAddress.includes(location) ||
					location.includes(salonAddress.split(',')[0]) ||
					checkLocationMatch(salonAddress, location)
				);
			});
		}

		// Filter by category
		if (activeFilter !== 'All') {
			const filterLower = activeFilter.toLowerCase();
			filtered = filtered.filter((salon) => {
				const serviceNames = salon.services.map((s: Service) =>
					s.name.toLowerCase()
				);
				return serviceNames.some((name: string) =>
					name.includes(filterLower.replace(' salons', '').replace('shops', ''))
				);
			});
		}

		// Sort salons
		filtered.sort((a, b) => {
			switch (sortBy) {
				case 'name':
					return a.name.localeCompare(b.name);
				case 'name-desc':
					return b.name.localeCompare(a.name);
				case 'services':
					return b.services.length - a.services.length;
				case 'rating':
					return a.name.localeCompare(b.name); // Fallback to name sort
				default:
					return 0;
			}
		});

		return filtered;
	}, [salons, searchQuery, selectedLocation, activeFilter, sortBy]);

	// Get visible salons based on pagination
	const visibleSalons = useMemo(() => {
		return filteredSalons.slice(0, visibleSalonsCount);
	}, [filteredSalons, visibleSalonsCount]);

	// Check if there are more salons to load
	const hasMoreSalons = filteredSalons.length > visibleSalonsCount;

	// Reset pagination when search or filters change
	useEffect(() => {
		setVisibleSalonsCount(15);
	}, [searchQuery, selectedLocation, activeFilter, sortBy]);

	// Generate results header text
	const resultsHeaderText = useMemo(() => {
		if (searchQuery && selectedLocation) {
			return `${searchQuery} in ${selectedLocation}`;
		}
		if (searchQuery) {
			return searchQuery;
		}
		if (selectedLocation) {
			return `Salons in ${selectedLocation}`;
		}
		return 'All Salons';
	}, [searchQuery, selectedLocation]);

	const resultsCountText = useMemo(() => {
		const visible = visibleSalons.length;
		const total = filteredSalons.length;
		return visible !== total ? `${visible} of ${total}` : `${visible}`;
	}, [visibleSalons.length, filteredSalons.length]);

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
							) : filteredSalons.length === 0 ? (
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
								visibleSalons.map((salon) => (
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
												<h2 className="text-xl font-bold text-gray-900 mb-2">
													{salon.name}
												</h2>
												{salon.address && (
													<address className="text-gray-600 text-sm mb-2 not-italic">
														{salon.address}
													</address>
												)}
												{salon.phone && (
													<p className="text-gray-500 text-sm mb-3">
														<span className="sr-only">Phone: </span>
														📞 {salon.phone}
													</p>
												)}
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
																className="flex items-center w-full justify-between py-2 px-3 bg-gray-50 rounded-lg"
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
																			⏱️ {service.duration} min
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

										{salon.services.length > 3 && (
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
					{hasMoreSalons && (
						<div className="text-center mt-12">
							<button
								onClick={handleLoadMore}
								className="bg-[#ff5b5b] text-white px-8 py-4 rounded-2xl font-medium hover:bg-[#e04a4a] transition-colors focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:ring-offset-2"
								aria-label={`Load ${filteredSalons.length - visibleSalonsCount} more salons`}
							>
								Load more ({filteredSalons.length - visibleSalonsCount}{' '}
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
