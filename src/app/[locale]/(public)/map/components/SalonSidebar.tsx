'use client';

import { useState, useEffect, useMemo } from 'react';
import { Star, MapPin, Phone } from 'lucide-react';
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
import {
	useCategories,
	getCategoryBySlug,
	getCategoryTranslatedName,
} from '@/hooks/useCategories';
import SalonImagePlaceholder from '@/components/SalonImagePlaceholder';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';

interface SalonSidebarProps {
	onSalonSelect: (salon: Salon) => void;
	selectedSalon: Salon | null;
	mapBounds: MapBounds | null;
	selectedCategories: number[];
	onCategoriesChange: (categories: number[]) => void;
	onSalonCountChange?: (count: number) => void;
}

export default function SalonSidebar({
	onSalonSelect,
	selectedSalon,
	mapBounds,
	selectedCategories,
	onCategoriesChange,
	onSalonCountChange,
}: SalonSidebarProps) {
	const router = useRouter();
	const t = useTranslation();
	const { data: categories = [] } = useCategories();
	const [sortBy, setSortBy] = useState('recommended');
	const { data, isLoading } = useFeaturedSalons(20);
	const salons = (data as unknown as Salon[]) || [];

	// Filter and sort salons based on map bounds, categories, and sort criteria
	const displaySalons = useMemo(() => {
		const allSalons = salons;

		// Filter by categories if any selected
		let filteredSalons = allSalons;
		if (selectedCategories.length > 0) {
			filteredSalons = allSalons.filter((salon: any) => {
				// Check if salon has services in selected categories
				// First try serviceCategoryIds (from optimized findFeaturedSalons)
				if (salon.serviceCategoryIds && Array.isArray(salon.serviceCategoryIds)) {
					return salon.serviceCategoryIds.some((id: number) =>
						selectedCategories.includes(id)
					);
				}
				// Fallback: check services array if available
				const salonServices = salon.services || salon.Service || [];
				return salonServices.some(
					(service: any) =>
						service.serviceCategoryId &&
						selectedCategories.includes(service.serviceCategoryId)
				);
			});
		}

		// Filter by map bounds if available
		if (mapBounds) {
			filteredSalons = filterSalonsByBounds(filteredSalons, mapBounds);
		}

		// Sort based on selected criteria
		const sortedSalons = [...filteredSalons];
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
	}, [salons, mapBounds, sortBy, selectedCategories]);

	// Notify parent about salon count change
	useEffect(() => {
		if (onSalonCountChange) {
			onSalonCountChange(displaySalons.length);
		}
	}, [displaySalons.length, onSalonCountChange]);

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

	const toggleCategory = (categoryId: number) => {
		onCategoriesChange(
			selectedCategories.includes(categoryId)
				? selectedCategories.filter((id) => id !== categoryId)
				: [...selectedCategories, categoryId]
		);
	};

	// Get translated category name
	const getCategoryName = (slug: string) => {
		const category = getCategoryBySlug(categories, slug);
		if (category) {
			return getCategoryTranslatedName(category, t);
		}
		// Fallback to slug if category not found
		return slug;
	};

	const sortOptions = [
		{ value: 'recommended', label: t.map.sortByRecommended },
		{ value: 'rating', label: t.map.highestRated },
		{ value: 'distance', label: t.map.nearest },
		{ value: 'reviews', label: t.map.mostReviews },
	];

	return (
		<div className="h-full flex flex-col">
			{/* Sort Header */}
			<div className="p-6 border-b border-gray-200">
				{/* Category Filters */}
				<div className="mb-4">
					<div className="flex flex-wrap gap-2">
						{categories.map((category) => {
							const isSelected = selectedCategories.includes(category.id);
							return (
								<button
									key={category.id}
									onClick={() => toggleCategory(category.id)}
									className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
										isSelected
											? 'bg-[#ff5b5b] text-white'
											: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
									}`}
								>
									{getCategoryName(category.slug)}
								</button>
							);
						})}
					</div>
				</div>
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
				<div className="w-full">
					<Select value={sortBy} onValueChange={setSortBy}>
						<SelectTrigger className="w-full bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b]">
							<SelectValue placeholder={t.map.sortByRecommended} />
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
													return <SalonImagePlaceholder size={80} />;
												}
											})()
										) : (
											<SalonImagePlaceholder size={80} />
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


										<div className="flex items-center justify-between gap-2">
											{/* Rating */}
											{((salon.avgRating || salon.rating || 0) > 0 ||
												(salon.reviewCount || salon._count?.reviews || 0) >
													0) && (
												<div className="flex items-center space-x-2">
													<Star
														size={14}
														className="text-[#ff5b5b] fill-[#ff5b5b]"
													/>
													<span className="text-sm font-medium text-gray-900">
														{(salon.avgRating || salon.rating || 0).toFixed(1)}
													</span>
													<span className="text-sm font-medium text-gray-700">
														({salon.reviewCount || salon._count?.reviews || 0})
													</span>
												</div>
											)}

											{/* Action Button */}
											<button
												onClick={(e) => handleViewSalon(salon, e)}
												className="w-full border border-[#ff4545] bg-[#fff7f6] text-[#ff5b5b] max-w-[60%] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#ffe8e6] transition-colors"
											>
												{t.map.viewSalon}
											</button>
										</div>
										
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
