'use client';

import { useState, useEffect, useMemo } from 'react';
import { Star, MapPin } from 'lucide-react';
import { Salon } from '@/types';
import {
	MapBounds,
	filterSalonsByBounds,
	haversineDistanceKm,
	sortSalonsByDistance,
} from '@/utils/mapUtils';
import { generateSalonSlug } from '@/utils/slug';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/contexts/LanguageContext';
import {
	useCategories,
	getCategoryBySlug,
	getCategoryTranslatedName,
} from '@/hooks/useCategories';
import SalonImagePlaceholder from '@/components/SalonImagePlaceholder';
import SalonImage from '@/components/SalonImage';
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
	salons: Salon[];
	isLoadingSalons: boolean;
	/** Used for client-side distance sort when API returns bbox results */
	sortCenter?: { lat: number; lng: number };
	/** When set, show approximate distance from user to salon before the address */
	userLocation?: { lat: number; lng: number } | null;
	/**
	 * When true (default), do not filter by map bounds — results already come from bbox API.
	 * Set false for non-bbox salon lists that still pass mapBounds for UI.
	 */
	skipBoundsFilter?: boolean;
}

export default function SalonSidebar({
	onSalonSelect,
	selectedSalon,
	mapBounds,
	selectedCategories,
	onCategoriesChange,
	onSalonCountChange,
	salons,
	isLoadingSalons,
	sortCenter,
	userLocation = null,
	skipBoundsFilter = true,
}: SalonSidebarProps) {
	const router = useRouter();
	const t = useTranslation();
	const { data: categories = [] } = useCategories();
	const [sortBy, setSortBy] = useState('recommended');

	const displaySalons = useMemo(() => {
		let list = [...salons];

		if (!skipBoundsFilter && mapBounds) {
			list = filterSalonsByBounds(list, mapBounds);
		}

		switch (sortBy) {
			case 'rating':
				list.sort(
					(a, b) =>
						(b.avgRating || b.rating || 0) - (a.avgRating || a.rating || 0)
				);
				break;
			case 'distance':
				if (sortCenter) {
					list = sortSalonsByDistance(list, sortCenter);
				}
				break;
			case 'reviews':
				list.sort(
					(a, b) =>
						(b.reviewCount || (b as { _count?: { reviews?: number } })._count?.reviews || 0) -
						(a.reviewCount || (a as { _count?: { reviews?: number } })._count?.reviews || 0)
				);
				break;
			case 'recommended':
			default:
				break;
		}
		return list;
	}, [salons, mapBounds, sortBy, sortCenter, skipBoundsFilter]);

	useEffect(() => {
		onSalonCountChange?.(displaySalons.length);
	}, [displaySalons.length, onSalonCountChange]);

	const handleViewSalon = (salon: Salon, e: React.MouseEvent) => {
		e.stopPropagation();
		const slug = generateSalonSlug(salon.name, salon.id);
		router.push(`/salon/${slug}`);
	};

	if (isLoadingSalons) {
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

	const getCategoryName = (slug: string) => {
		const category = getCategoryBySlug(categories, slug);
		if (category) {
			return getCategoryTranslatedName(category, t);
		}
		return slug;
	};

	const formatAddressWithDistance = (salon: Salon) => {
		const addr = salon.address?.trim() ?? '';
		if (
			!userLocation ||
			salon.latitude == null ||
			salon.longitude == null
		) {
			return addr;
		}
		const km = haversineDistanceKm(userLocation, {
			lat: salon.latitude,
			lng: salon.longitude,
		});
		const prefix = `${km.toFixed(1)} ${t.map.km}`;
		if (!addr) return prefix;
		return `${prefix} — ${addr}`;
	};

	const sortOptions = [
		{ value: 'recommended', label: t.map.sortByRecommended },
		{ value: 'rating', label: t.map.highestRated },
		{ value: 'distance', label: t.map.nearest },
		{ value: 'reviews', label: t.map.mostReviews },
	];

	return (
		<div className="h-full flex flex-col">
			<div className="p-6 border-b border-gray-200">
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
						displaySalons.map((salon: Salon) => (
							<div
								key={salon.id}
								onClick={() => onSalonSelect(salon)}
								className={`bg-white border-2 rounded-lg p-2.5 cursor-pointer transition-all duration-200 ${
									selectedSalon?.id === salon.id
										? 'border-[#ff5b5b] shadow-lg ring-1 ring-[#ff5b5b] ring-opacity-20 bg-[#fff7f6]'
										: 'border-gray-200 hover:shadow-md hover:border-[#ff5b5b]'
								}`}
							>
								<div className="flex items-start space-x-4">
									<div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
										{salon.photos &&
										salon.photos.length > 0 &&
										salon.photos[0] ? (
											<SalonImage
												src={salon.photos[0]}
												alt={salon.name}
												width={80}
												height={80}
												className="w-full h-full object-cover"
											/>
										) : (
											<SalonImagePlaceholder size={80} />
										)}
									</div>

									<div className="flex-1 min-w-0">
										<h3 className="text-lg font-bold text-gray-900 mb-1 truncate">
											{salon.name}
										</h3>

										<div className="flex items-center space-x-1 text-gray-600 mb-2">
											<MapPin size={12} className="flex-shrink-0" />
											<span className="text-sm truncate">
												{formatAddressWithDistance(salon)}
											</span>
										</div>

										<div className="flex items-center justify-between gap-2">
											{((salon.avgRating || salon.rating || 0) > 0 ||
												(salon.reviewCount ||
													(salon as { _count?: { reviews?: number } })._count
														?.reviews ||
													0) > 0) && (
												<div className="flex items-center space-x-2">
													<Star
														size={14}
														className="text-[#ff5b5b] fill-[#ff5b5b]"
													/>
													<span className="text-sm font-medium text-gray-900">
														{(salon.avgRating || salon.rating || 0).toFixed(1)}
													</span>
													<span className="text-sm font-medium text-gray-700">
														(
														{salon.reviewCount ||
															(salon as { _count?: { reviews?: number } })._count
																?.reviews ||
															0}
														)
													</span>
												</div>
											)}

											<button
												onClick={(e) => handleViewSalon(salon, e)}
												className="w-full ml-auto border border-[#ff4545] bg-[#fff7f6] text-[#ff5b5b] max-w-[60%] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#ffe8e6] transition-colors"
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
