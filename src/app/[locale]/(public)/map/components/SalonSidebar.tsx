'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronDown, Star, MapPin, Phone } from 'lucide-react';
import { Salon } from '@/types';
import { useFeaturedSalons } from '@/hooks/useSalonPreview';
import {
	MapBounds,
	filterSalonsByBounds,
	sortSalonsByDistance,
} from '@/utils/mapUtils';
import { generateSalonSlug } from '@/utils/slug';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/contexts/LanguageContext';

interface SalonSidebarProps {
	onSalonSelect: (salon: Salon) => void;
	selectedSalon: Salon | null;
	mapBounds: MapBounds | null;
}

export default function SalonSidebar({
	onSalonSelect,
	selectedSalon,
	mapBounds,
}: SalonSidebarProps) {
	const router = useRouter();
	const t = useTranslation();
	const [sortBy, setSortBy] = useState('recommended');
	const { data, isLoading } = useFeaturedSalons(20);
	const salons = (data as unknown as Salon[]) || [];

	// Filter and sort salons based on map bounds and sort criteria
	const displaySalons = useMemo(() => {
		const allSalons = salons;

		// Filter by map bounds if available
		let filteredSalons = allSalons;
		if (mapBounds) {
			filteredSalons = filterSalonsByBounds(allSalons, mapBounds);
		}

		// Sort based on selected criteria
		let sortedSalons = [...filteredSalons];
		switch (sortBy) {
			case 'rating':
				sortedSalons.sort(
					(a: any, b: any) =>
						(b.avgRating || b.rating || 0) - (a.avgRating || a.rating || 0)
				);
				break;
			case 'distance':
				// Sort by distance from map center (if we had it)
				break;
			case 'reviews':
				sortedSalons.sort(
					(a: any, b: any) =>
						(b.reviewCount || b._count?.reviews || 0) -
						(a.reviewCount || a._count?.reviews || 0)
				);
				break;
			case 'recommended':
			default:
				// Keep original order
				break;
		}
		return sortedSalons;
	}, [salons, mapBounds, sortBy]);


	const handleViewSalon = (salon: any, e: React.MouseEvent) => {
		e.stopPropagation();
		const slug = generateSalonSlug(salon.name, salon.id);
		router.push(`/salon/${slug}`);
	};

	if (isLoading) {
		return (
			<div className="p-6">
				<div className="animate-pulse">
					<div className="h-8 bg-gray-200 rounded mb-4"></div>
					<div className="space-y-4">
						{[1, 2, 3].map((i) => (
							<div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
						))}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="h-full flex flex-col">
			{/* Sort Header */}
			<div className="p-6 border-b border-gray-200">
				<div className="mb-3">
					<h2 className="text-lg font-semibold text-gray-900">
						{mapBounds
							? t.map.salonsInView.replace(
									'{count}',
									displaySalons.length.toString()
								)
							: t.map.allSalons}
					</h2>
					{mapBounds && (
						<p className="text-sm text-gray-500">{t.map.showingSalonsInView}</p>
					)}
				</div>
				<div className="relative">
					<select
						value={sortBy}
						onChange={(e) => setSortBy(e.target.value)}
						className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 w-full focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] outline-none"
					>
						<option value="recommended">{t.map.sortByRecommended}</option>
						<option value="rating">{t.map.highestRated}</option>
						<option value="distance">{t.map.nearest}</option>
						<option value="reviews">{t.map.mostReviews}</option>
					</select>
					<ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
				</div>
			</div>

			{/* Salon List */}
			<div className="flex-1 overflow-y-auto">
				<div className="p-6 space-y-4">
					{displaySalons.length === 0 ? (
						<div className="text-center py-12">
							<div className="text-gray-400 mb-4">
								<MapPin size={48} className="mx-auto" />
							</div>
							<h3 className="text-lg font-medium text-gray-900 mb-2">
								{t.map.noSalonsInView}
							</h3>
							<p className="text-gray-500">
								{mapBounds ? t.map.tryZoomingOut : t.map.loadingSalons}
							</p>
						</div>
					) : (
						displaySalons.map((salon: any) => (
							<div
								key={salon.id}
								onClick={() => onSalonSelect(salon)}
								className={`bg-white border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 ${
									selectedSalon?.id === salon.id
										? 'border-[#ff5b5b] shadow-lg ring-1 ring-[#ff5b5b] ring-opacity-20 bg-[#fff7f6]'
										: 'border-gray-200 hover:shadow-md hover:border-[#ff5b5b]'
								}`}
							>
								<div className="flex items-start space-x-4">
									{/* Salon Image */}
									<div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
										{salon.photos &&
										salon.photos.length > 0 &&
										salon.photos[0] ? (
											(() => {
												try {
													new URL(salon.photos[0]);
													return (
														<Image
															src={salon.photos[0]}
															alt={salon.name}
															width={80}
															height={80}
															className="w-full h-full object-cover"
														/>
													);
												} catch {
													return (
														<div className="w-full h-full bg-gradient-to-br from-[#fff7f6] to-[#ffe8e6] flex items-center justify-center">
															<span className="text-[#ff5b5b] text-2xl">
																💇‍♀️
															</span>
														</div>
													);
												}
											})()
										) : (
											<div className="w-full h-full bg-gradient-to-br from-[#fff7f6] to-[#ffe8e6] flex items-center justify-center">
												<span className="text-[#ff5b5b] text-2xl">💇‍♀️</span>
											</div>
										)}
									</div>

									{/* Salon Info */}
									<div className="flex-1 min-w-0">
										<h3 className="text-lg font-bold text-gray-900 mb-1 truncate">
											{salon.name}
										</h3>

										<div className="flex items-center space-x-1 text-gray-600 mb-2">
											<MapPin size={12} />
											<span className="text-sm truncate">{salon.address}</span>
										</div>

										{/* Rating */}
										<div className="flex items-center space-x-2 mb-3">
											<Star size={14} className="text-[#ff5b5b] fill-[#ff5b5b]" />
											<span className="text-sm font-medium text-gray-900">
												{(salon.avgRating || salon.rating || 0).toFixed(1)}
											</span>
											<span className="text-sm text-gray-500">
												({salon.reviewCount || salon._count?.reviews || 0}{' '}
												{t.salon.reviewsCount})
											</span>
										</div>

										{/* Action Button */}
										<button
											onClick={(e) => handleViewSalon(salon, e)}
											className="w-full bg-[#fff7f6] text-[#ff5b5b] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#ffe8e6] transition-colors"
										>
											{t.map.viewSalon}
										</button>
									</div>
								</div>
							</div>
						))
					)}
				</div>
			</div>
		</div>
	);
}
