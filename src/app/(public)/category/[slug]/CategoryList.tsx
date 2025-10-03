'use client';

import { useState } from 'react';
import { useSalonsWithServices } from '@/hooks/useSalons';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorDisplay from '@/components/ErrorDisplay';
import SalonCard from '@/components/SalonCard';
import BookingModal from '@/components/BookingModal';
import { Salon, Service } from '@/types';
import { ServiceResponseDto } from '@/types/dto/service.dto';
import Link from 'next/link';

interface CategoryListProps {
	category: {
		id: number;
		name: string;
		description?: string;
		slug: string;
		icon: string;
	};
}

export default function CategoryList({ category }: CategoryListProps) {
	const [sortBy, setSortBy] = useState('name');
	const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
	const [selectedService, setSelectedService] = useState<
		(ServiceResponseDto & { salonId: string; salonName: string }) | null
	>(null);

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
			<main className="py-8 px-6">
				<div className="mx-auto max-w-6xl">
					{/* Breadcrumbs */}
					<nav className="mb-6" aria-label="Breadcrumb">
						<ol className="flex items-center space-x-2 text-sm text-gray-600">
							<li>
								<Link
									href="/"
									className="hover:text-[#ff5b5b] transition-colors"
								>
									Home
								</Link>
							</li>
							<li>/</li>
							<li>
								<Link
									href="/salons"
									className="hover:text-[#ff5b5b] transition-colors"
								>
									Salons
								</Link>
							</li>
							<li>/</li>
							<li className="text-gray-900 font-medium">{category.name}</li>
						</ol>
					</nav>

					{/* Category Header with Sort */}
					<div className="flex items-center justify-between mb-8">
						<h1 className="text-2xl font-bold text-gray-900">
							{category.name} ({filteredSalons.length})
						</h1>
						{/* Sort Dropdown */}
						<div className="w-48">
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
									<span className="text-2xl">{category.icon}</span>
								</div>
								<h3 className="text-xl font-semibold text-gray-900 mb-2">
									No {category.name.toLowerCase()} salons found
								</h3>
								<p className="text-gray-600 mb-8">
									We couldn't find any salons in the {category.name} category at
									the moment. Check back soon or explore other categories.
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
						name: `${category.name} Salons`,
						description: `Find the best ${category.name.toLowerCase()} salons and services. Professional ${category.name.toLowerCase()} treatments and appointments.`,
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
