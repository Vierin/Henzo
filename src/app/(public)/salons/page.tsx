'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSalonsWithServices } from '@/hooks/useSalons';
import LoadingSpinner from '@/components/LoadingSpinner';
import BookingModal from '@/components/BookingModal';

interface Service {
	id: string;
	name: string;
	description?: string;
	duration: number;
	price: number;
}

interface Salon {
	id: string;
	name: string;
	address?: string;
	phone?: string;
	logo?: string;
	services?: Service[];
}

export default function SalonsPage() {
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedSalon, setSelectedSalon] = useState<Salon | null>(null);
	const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
	const [filteredSalons, setFilteredSalons] = useState<Salon[]>([]);
	const router = useRouter();
	const searchParams = useSearchParams();

	const { data: salons = [], isLoading } = useSalonsWithServices();

	// Handle search from URL params
	useEffect(() => {
		const searchParam = searchParams.get('search');
		if (searchParam) {
			setSearchQuery(searchParam);
		}
	}, [searchParams]);

	// Filter salons based on search query
	useEffect(() => {
		if (!searchQuery.trim()) {
			setFilteredSalons(salons);
		} else {
			const filtered = salons.filter(
				(salon) =>
					salon.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
					salon.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
					salon.services?.some((service) =>
						service.name.toLowerCase().includes(searchQuery.toLowerCase())
					)
			);
			setFilteredSalons(filtered);
		}
	}, [salons, searchQuery]);

	const handleSalonClick = (salonId: string) => {
		router.push(`/salon/${salonId}`);
	};

	const handleBookService = (salon: Salon) => {
		setSelectedSalon(salon);
		setIsBookingModalOpen(true);
	};

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		// Search is handled by useEffect when searchQuery changes
	};

	const clearSearch = () => {
		setSearchQuery('');
	};

	return (
		<div className="py-8">
			<div className="mx-auto max-w-7xl px-6">
				{/* Header */}
				<div className="mb-8">
					<h1 className="text-3xl font-bold text-gray-900 mb-4">All Salons</h1>
					<p className="text-gray-600">
						Discover and book appointments at salons in your area
					</p>
				</div>

				{/* Search Bar */}
				<form onSubmit={handleSearch} className="mb-8">
					<div className="max-w-2xl flex gap-4">
						<div className="flex-1 relative">
							<input
								type="text"
								placeholder="Search for salons, services, or locations..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
							/>
							{searchQuery && (
								<button
									type="button"
									onClick={clearSearch}
									className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
								>
									<svg
										className="w-5 h-5"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M6 18L18 6M6 6l12 12"
										/>
									</svg>
								</button>
							)}
						</div>
						<button
							type="submit"
							className="bg-[#ff5b5b] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#e04a4a] transition-colors"
						>
							Search
						</button>
					</div>
				</form>

				{/* Results */}
				{isLoading ? (
					<div className="flex justify-center py-12">
						<LoadingSpinner size="lg" />
					</div>
				) : filteredSalons.length === 0 ? (
					<div className="text-center py-12">
						<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
							<span className="text-2xl">🔍</span>
						</div>
						<h3 className="text-xl font-semibold text-gray-900 mb-2">
							{searchQuery ? 'No salons found' : 'No salons available'}
						</h3>
						<p className="text-gray-600">
							{searchQuery
								? 'Try adjusting your search terms or browse all salons'
								: 'Check back later for new salon listings'}
						</p>
						{searchQuery && (
							<button
								onClick={clearSearch}
								className="mt-4 bg-[#ff5b5b] text-white px-6 py-2 rounded-lg font-medium hover:bg-[#e04a4a] transition-colors"
							>
								Clear Search
							</button>
						)}
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
						{filteredSalons.map((salon) => (
							<div
								key={salon.id}
								className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
								onClick={() => handleSalonClick(salon.id)}
							>
								{/* Salon Logo/Image */}
								<div className="h-48 bg-gradient-to-br from-pink-100 to-pink-200 rounded-t-xl flex items-center justify-center">
									{salon.logo ? (
										<img
											src={salon.logo}
											alt={salon.name}
											className="w-full h-full object-cover rounded-t-xl"
										/>
									) : (
										<span className="text-4xl">💇‍♀️</span>
									)}
								</div>

								{/* Salon Info */}
								<div className="p-6">
									<h3 className="text-xl font-semibold text-gray-900 mb-2">
										{salon.name}
									</h3>
									{salon.address && (
										<p className="text-gray-600 text-sm mb-2">
											📍 {salon.address}
										</p>
									)}
									{salon.phone && (
										<p className="text-gray-600 text-sm mb-4">
											📞 {salon.phone}
										</p>
									)}

									{/* Services */}
									{salon.services && salon.services.length > 0 && (
										<div className="mb-4">
											<p className="text-sm font-medium text-gray-700 mb-2">
												Services:
											</p>
											<div className="flex flex-wrap gap-1">
												{salon.services.slice(0, 3).map((service) => (
													<span
														key={service.id}
														className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
													>
														{service.name}
													</span>
												))}
												{salon.services.length > 3 && (
													<span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
														+{salon.services.length - 3} more
													</span>
												)}
											</div>
										</div>
									)}

									{/* Action Buttons */}
									<div className="flex gap-3">
										<button
											onClick={(e) => {
												e.stopPropagation();
												handleSalonClick(salon.id);
											}}
											className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors"
										>
											View Details
										</button>
										<button
											onClick={(e) => {
												e.stopPropagation();
												handleBookService(salon);
											}}
											className="flex-1 bg-[#ff5b5b] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#e04a4a] transition-colors"
										>
											Book Now
										</button>
									</div>
								</div>
							</div>
						))}
					</div>
				)}

				{/* Results Count */}
				{filteredSalons.length > 0 && (
					<div className="mt-8 text-center text-gray-600">
						Showing {filteredSalons.length} salon
						{filteredSalons.length !== 1 ? 's' : ''}
						{searchQuery && ` for "${searchQuery}"`}
					</div>
				)}
			</div>

			{/* Booking Modal */}
			<BookingModal
				isOpen={isBookingModalOpen}
				onClose={() => {
					setIsBookingModalOpen(false);
					setSelectedSalon(null);
				}}
				salonId={selectedSalon?.id}
				salonName={selectedSalon?.name}
				showServiceSelector={true}
			/>
		</div>
	);
}
