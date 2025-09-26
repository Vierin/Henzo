'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { STATIC_CATEGORIES, getCategoryBySlug } from '@/constants/categories';
import PublicHeader from '@/components/PublicHeader';
import { useSalonsWithServices } from '@/hooks/useSalons';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorDisplay from '@/components/ErrorDisplay';
import SalonCard from '@/components/SalonCard';
import BookingModal from '@/components/BookingModal';
import { Salon, Service } from '@/types';
import { ServiceResponseDto } from '@/types/dto/service.dto';
import Link from 'next/link';
import Head from 'next/head';

export default function CategoryPage() {
	const params = useParams();
	const slug = params.slug as string;
	const [searchQuery, setSearchQuery] = useState('');
	const [sortBy, setSortBy] = useState('name');
	const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
	const [selectedService, setSelectedService] = useState<
		(ServiceResponseDto & { salonId: string; salonName: string }) | null
	>(null);

	const category = getCategoryBySlug(slug);

	const { data: salons, isLoading: loading, error } = useSalonsWithServices();

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

	// If category not found, show 404
	if (!category) {
		return (
			<div className="min-h-screen bg-[#F8F5F2]">
				<div className="container mx-auto px-4 py-8">
					<div className="text-center">
						<h1 className="text-4xl font-bold text-gray-900 mb-4">
							Category Not Found
						</h1>
						<p className="text-gray-600 mb-8">
							The category you're looking for doesn't exist.
						</p>
						<Link
							href="/"
							className="inline-flex items-center px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
						>
							Back to Home
						</Link>
					</div>
				</div>
			</div>
		);
	}

	// Filter and sort salons by category
	const filteredSalons = (salons || [])
		.filter((salon: Salon) => {
			// Filter by categoryIds if available, otherwise fallback to keyword matching
			if (salon.categoryIds && salon.categoryIds.length > 0) {
				return salon.categoryIds.includes(category.id);
			}

			// Fallback: filter by salon name containing category keywords
			const categoryKeywords = category.name.toLowerCase().split(' ');
			return categoryKeywords.some(
				(keyword) =>
					salon.name.toLowerCase().includes(keyword) ||
					salon.description?.toLowerCase().includes(keyword)
			);
		})
		.filter((salon: Salon) => {
			// Additional search filter
			if (!searchQuery.trim()) return true;
			return (
				salon.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				salon.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				salon.services?.some((service: Service) =>
					service.name.toLowerCase().includes(searchQuery.toLowerCase())
				)
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
			<Head>
				<title>{category.name} Salons | Henzo</title>
				<meta
					name="description"
					content={`Find the best ${category.name.toLowerCase()} salons near you. ${category.description || `Professional ${category.name.toLowerCase()} services and treatments.`}`}
				/>
				<meta
					name="keywords"
					content={`${category.name.toLowerCase()}, salons, beauty, wellness, ${category.name.toLowerCase().replace(' & ', ', ')}`}
				/>
				<meta property="og:title" content={`${category.name} Salons | Henzo`} />
				<meta
					property="og:description"
					content={`Find the best ${category.name.toLowerCase()} salons near you. ${category.description || `Professional ${category.name.toLowerCase()} services and treatments.`}`}
				/>
				<meta property="og:type" content="website" />
			</Head>
			<div className="min-h-screen bg-[#F8F5F2]">
				<main className="py-8 px-6">
					<div className="mx-auto max-w-6xl">
						{/* Category Header */}
						<div className="text-center mb-8">
							<div className="text-6xl mb-4">{category.icon}</div>
							<h1 className="text-4xl font-bold text-gray-900 mb-4">
								{category.name}
							</h1>
							{category.description && (
								<p className="text-xl text-gray-600 max-w-2xl mx-auto">
									{category.description}
								</p>
							)}
						</div>

						{/* Search and Filter Section */}
						<div className="flex flex-col md:flex-row gap-4 mb-8">
							{/* Search Input */}
							<div className="flex-1">
								<input
									type="text"
									placeholder={`Search ${category.name} salons...`}
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-gray-900"
								/>
							</div>

							{/* Sort Dropdown */}
							<div className="md:w-48">
								<select
									value={sortBy}
									onChange={(e) => setSortBy(e.target.value)}
									className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-gray-900"
								>
									{sortOptions.map((option) => (
										<option key={option.value} value={option.value}>
											{option.label}
										</option>
									))}
								</select>
							</div>
						</div>

						{/* Results Header */}
						<div className="flex items-center justify-between mb-8">
							<h2 className="text-2xl font-bold text-gray-900">
								Results ({filteredSalons.length})
							</h2>
						</div>

						{/* Salon Cards */}
						<div className="space-y-6">
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
									<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
										<span className="text-2xl">🏪</span>
									</div>
									<h3 className="text-xl font-semibold text-gray-900 mb-2">
										No salons found
									</h3>
									<p className="text-gray-600 mb-8">
										{searchQuery
											? `We couldn't find any salons matching "${searchQuery}" in the ${category.name} category.`
											: `We couldn't find any salons in the ${category.name} category.`}
									</p>
									<div className="flex flex-col sm:flex-row gap-4 justify-center">
										{searchQuery && (
											<button
												onClick={() => setSearchQuery('')}
												className="inline-flex items-center px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
											>
												Clear Search
											</button>
										)}
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
			</div>
		</>
	);
}
