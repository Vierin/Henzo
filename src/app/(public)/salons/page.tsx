'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BookingModal from '../../../components/BookingModal';
import LoadingSpinner from '../../../components/LoadingSpinner';
import ErrorDisplay from '../../../components/ErrorDisplay';
import { useSalonsWithServices } from '@/hooks/useSalons';
import { ServiceResponseDto } from '@/types/dto/service.dto';
import { Salon, Service } from '@/types';
import Image from 'next/image';

export default function SalonsPage() {
	const router = useRouter();
	const [searchQuery, setSearchQuery] = useState('');
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

	const filters = [
		'All',
		'Hair salons',
		'Nail salons',
		'Barbershops',
		'Massage',
		'Spa',
	];

	const sortOptions = [
		{ value: 'name', label: 'Name A-Z' },
		{ value: 'name-desc', label: 'Name Z-A' },
		{ value: 'services', label: 'Most Services' },
		{ value: 'rating', label: 'Highest Rated' },
	];

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

	const handleSalonClick = (salonId: string) => {
		router.push(`/salon/${salonId}`);
	};

	const handleLoadMore = () => {
		setVisibleSalonsCount((prev) => prev + 15);
	};

	// Filter and sort salons using useMemo for better performance
	const filteredSalons = useMemo(() => {
		let filtered = [...salons];

		// Filter by search query
		if (searchQuery.trim()) {
			filtered = filtered.filter(
				(salon) =>
					salon.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
					salon.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
					salon.services.some((service: Service) =>
						service.name.toLowerCase().includes(searchQuery.toLowerCase())
					)
			);
		}

		// Filter by category
		if (activeFilter !== 'All') {
			filtered = filtered.filter((salon) => {
				const serviceNames = salon.services.map((s: Service) =>
					s.name.toLowerCase()
				);
				const filterLower = activeFilter.toLowerCase();
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
					// For now, just sort by name since we don't have ratings
					return a.name.localeCompare(b.name);
				default:
					return 0;
			}
		});

		return filtered;
	}, [salons, searchQuery, activeFilter, sortBy]);

	// Get visible salons based on pagination
	const visibleSalons = useMemo(() => {
		return filteredSalons.slice(0, visibleSalonsCount);
	}, [filteredSalons, visibleSalonsCount]);

	// Check if there are more salons to load
	const hasMoreSalons = filteredSalons.length > visibleSalonsCount;

	// Reset pagination when search or filters change
	useEffect(() => {
		setVisibleSalonsCount(15);
	}, [searchQuery, activeFilter, sortBy]);

	return (
		<div className="min-h-screen bg-[#F8F5F2]">
			<main className="py-8 px-6">
				<div className="mx-auto max-w-6xl">
					{/* Search Bar */}
					<div className="mb-8">
						<div className="relative max-w-2xl mx-auto">
							<input
								type="text"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="w-full px-6 py-4 pl-12 pr-12 bg-white rounded-2xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#8B4513] focus:border-transparent text-lg text-gray-900"
								placeholder="Search for salons, services, or locations"
							/>
							<svg
								className="absolute left-4 top-4 h-6 w-6 text-gray-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
								/>
							</svg>
							{searchQuery && (
								<button
									onClick={() => setSearchQuery('')}
									className="absolute right-4 top-4 h-6 w-6 text-gray-400 hover:text-gray-600"
								>
									✕
								</button>
							)}
						</div>
					</div>

					{/* Category Filters and Sort */}
					<div className="mb-8">
						<div className="flex flex-wrap gap-3 justify-center mb-4">
							{filters.map((filter) => (
								<button
									key={filter}
									onClick={() => setActiveFilter(filter)}
									className={`px-6 py-3 rounded-full text-sm font-medium transition-colors ${
										activeFilter === filter
											? 'bg-[#ff5b5b] text-white'
											: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
									}`}
								>
									{filter}
								</button>
							))}
						</div>
					</div>

					{/* Results Header */}
					<div className="flex items-center justify-between mb-8">
						<h1 className="text-2xl font-bold text-gray-900">
							Results ({visibleSalons.length}
							{filteredSalons.length !== visibleSalons.length
								? ` of ${filteredSalons.length}`
								: ''}
							)
						</h1>
						<div className="flex items-center gap-4">
							{/* Sort Dropdown */}
							<div className="flex justify-center">
								<div className="relative">
									<select
										value={sortBy}
										onChange={(e) => setSortBy(e.target.value)}
										className="px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-gray-900"
									>
										{sortOptions.map((option) => (
											<option key={option.value} value={option.value}>
												{option.label}
											</option>
										))}
									</select>
								</div>
							</div>
						</div>
					</div>

					{/* Salon Cards */}
					<div className="space-y-6">
						{loading ? (
							<LoadingSpinner message="Loading salons..." />
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
									<span className="text-2xl">🏪</span>
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
								<div
									key={salon.id}
									onClick={() => handleSalonClick(salon.id)}
									className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
								>
									<div className="flex gap-6">
										{/* Salon Image */}
										<div className="w-48 h-48 bg-gradient-to-br from-pink-100 to-pink-200 rounded-xl flex items-center justify-center flex-shrink-0">
											{salon.logo ? (
												<Image
													src={salon.logo}
													alt={salon.name}
													width={400}
													height={320}
													className="w-full h-full object-cover rounded-xl"
												/>
											) : (
												<span className="text-6xl">💇‍♀️</span>
											)}
										</div>

										{/* Salon Info */}
										<div className="flex-1">
											<h2 className="text-xl font-bold text-gray-900 mb-2">
												{salon.name}
											</h2>
											<p className="text-gray-600 text-sm mb-2">
												{salon.address}
											</p>
											{salon.phone && (
												<p className="text-gray-500 text-sm mb-3">
													📞 {salon.phone}
												</p>
											)}
										</div>
									</div>
									{/* Services */}
									{salon.services && salon.services.length > 0 ? (
										<div className="mt-4">
											<div className="space-y-2 flex justify-between gap-3">
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
																		⏱️ {service.duration} min
																	</span>
																	<span className="text-sm font-semibold text-[#ff5b5b]">
																		${service.price}
																	</span>
																</div>
															</div>
															<button
																onClick={(e) => {
																	e.stopPropagation();
																	handleBookService(
																		service,
																		salon.id,
																		salon.name
																	);
																}}
																className="bg-[#ff5b5b] text-white px-3 py-1 rounded-md text-xs font-medium hover:bg-[#e04a4a] transition-colors"
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
													handleSalonClick(salon.id);
												}}
												className="text-[#ff5b5b] text-sm font-medium hover:text-[#e04a4a] transition-colors"
											>
												View all {salon.services.length} services →
											</button>
										</div>
									)}
								</div>
							))
						)}
					</div>

					{/* Load More Button */}
					{hasMoreSalons && (
						<div className="text-center mt-12">
							<button
								onClick={handleLoadMore}
								className="bg-[#ff5b5b] text-white px-8 py-4 rounded-2xl font-medium hover:bg-[#e04a4a] transition-colors"
							>
								Load more ({filteredSalons.length - visibleSalonsCount}{' '}
								remaining)
							</button>
						</div>
					)}
				</div>
			</main>

			{/* Footer */}
			<footer className="bg-[#F8F5F2] py-8 px-6 mt-16">
				<div className="mx-auto max-w-6xl text-center">
					<p className="text-gray-500 text-sm">
						© 2024 Henzo. All rights reserved.
					</p>
				</div>
			</footer>

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
		</div>
	);
}
