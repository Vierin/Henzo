'use client';

import { useMemo } from 'react';
import { useFeaturedSalons } from '@/hooks/useSalonPreview';
import { useSalonSlug } from '@/hooks/useSalonSlug';
import {
	useCategories,
	getCategoryById,
	getCategoryTranslatedName,
} from '@/hooks/useCategories';
import { supabase } from '@/lib/supabase';
import ErrorDisplay from './ErrorDisplay';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight, Star } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { Salon } from '@/types';

export default function RecommendedSalons() {
	const t = useTranslation();
	const { getSalonUrl } = useSalonSlug();
	const { data: categories = [] } = useCategories();
	const {
		data: salons = [],
		isLoading: loading,
		error,
		refetch,
		isFetching,
	} = useFeaturedSalons(3);

	// Filter salons to only show those with at least one service
	const salonsWithServices = useMemo(
		() =>
			(salons as Salon[]).filter((salon) => {
				// Check multiple ways: _count, services array, or Service array (Prisma naming)
				const serviceCount =
					(salon._count as any)?.Service ||
					(salon._count as any)?.services ||
					(salon as any).Service?.length ||
					salon.services?.length ||
					0;
				return serviceCount > 0;
			}),
		[salons]
	);

	// Мемоизируем URL для каждого салона
	const salonsWithUrls = useMemo(
		() =>
			salonsWithServices.map((salon: Salon) => ({
				...salon,
				url: getSalonUrl(salon),
			})),
		[salonsWithServices, getSalonUrl]
	);

	const getImageSrc = (imageSrc: string) => {
		// If it's a URL, return it directly
		if (imageSrc.startsWith('http')) {
			return imageSrc;
		}
		// If it's a file path, get the public URL from Supabase
		const { data } = supabase.storage
			.from('salon-files')
			.getPublicUrl(imageSrc);
		return data.publicUrl;
	};

	const isExternalUrl = (imageSrc: string) => {
		return imageSrc.startsWith('http');
	};

	const getSalonImage = (
		salon: Salon
	): { url: string | undefined; isExternal: boolean } => {
		// If salon has photos, use the first photo
		if (salon.photos && salon.photos.length > 0) {
			return {
				url: getImageSrc(salon.photos[0]),
				isExternal: isExternalUrl(salon.photos[0]),
			};
		}
		// If no photos but has logo, use logo
		if (salon.logo) {
			return {
				url: getImageSrc(salon.logo),
				isExternal: isExternalUrl(salon.logo),
			};
		}
		// No images available
		return { url: undefined, isExternal: false };
	};

	// Helper function to get category name by ID
	const getCategoryName = (categoryId: number): string => {
		const category = getCategoryById(categories, categoryId);
		if (!category) {
			return '';
		}
		return getCategoryTranslatedName(category, t);
	};

	// Helper function to get salon categories
	const getSalonCategories = (
		salon: Salon
	): { firstCategory: string | null; additionalCount: number } => {
		// Try multiple ways to get categoryIds
		const categoryIds = (salon as any).categoryIds || salon.categoryIds || [];

		// Debug: log categoryIds to see what we're getting
		if (process.env.NODE_ENV === 'development' && categoryIds.length > 0) {
			console.log('Salon categories for', salon.name, ':', categoryIds);
		}

		if (categoryIds.length === 0) {
			return { firstCategory: null, additionalCount: 0 };
		}

		// Filter out invalid category IDs and get valid ones
		const validCategoryIds = categoryIds.filter((id: number) => {
			const category = getCategoryById(categories, id);
			return !!category;
		});

		if (validCategoryIds.length === 0) {
			return { firstCategory: null, additionalCount: 0 };
		}

		const firstCategoryName = getCategoryName(validCategoryIds[0]);
		if (!firstCategoryName) {
			return { firstCategory: null, additionalCount: 0 };
		}

		const additionalCount = validCategoryIds.length - 1;

		return {
			firstCategory: firstCategoryName,
			additionalCount,
		};
	};

	return (
		<section
			className="py-12 sm:py-16 bg-white"
			aria-label="Featured beauty salons"
		>
			<div className="mx-auto max-w-6xl relative">
				<header className="mb-8 sm:mb-12 text-center px-4 sm:px-6">
					<h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">
						{t('homepage.topRatedTitle') || 'Top Rated Salons'}
					</h2>
					<p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
						{t('homepage.topRatedSubtitle') || 'Popular choices near you'}
					</p>
				</header>

				{loading && salons.length === 0 ? (
					<div className="px-6">
						{/* Desktop skeleton */}
						<div className="hidden md:grid md:grid-cols-3 gap-6">
							{[1, 2, 3].map((i) => (
								<div
									key={i}
									className="bg-white rounded-2xl overflow-hidden shadow-md animate-pulse"
								>
									<div className="h-[15rem] bg-gray-200"></div>
									<div className="p-5">
										<div className="h-6 bg-gray-200 rounded mb-2"></div>
										<div className="h-4 bg-gray-200 rounded w-2/3 mb-8"></div>
										<div className="h-4 bg-gray-200 rounded w-1/3 ml-auto"></div>
									</div>
								</div>
							))}
						</div>
						{/* Mobile skeleton */}
						<div className="md:hidden overflow-x-auto scrollbar-hide pb-2">
							<div className="flex gap-4" style={{ width: 'max-content' }}>
								{[1, 2, 3].map((i) => (
									<div
										key={i}
										className="bg-white rounded-2xl overflow-hidden shadow-md animate-pulse flex-shrink-0"
										style={{ width: 'calc(66.666vw - 2rem)' }}
									>
										<div className="h-[12rem] bg-gray-200"></div>
										<div className="p-3">
											<div className="h-5 bg-gray-200 rounded mb-2"></div>
											<div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
											<div className="flex items-center justify-between">
												<div className="h-4 bg-gray-200 rounded w-1/3"></div>
												<div className="h-4 bg-gray-200 rounded w-1/4"></div>
											</div>
										</div>
									</div>
								))}
							</div>
						</div>
					</div>
				) : error && salonsWithServices.length === 0 ? (
					<ErrorDisplay
						error={error}
						message="Failed to load salons"
						onRetry={() => refetch()}
					/>
				) : salonsWithServices.length === 0 ? (
					<div className="text-center py-12 px-4">
						<h3 className="text-xl font-semibold text-gray-900 mb-2">
							{t('homepage.noSalonsAvailable')}
						</h3>
						<p className="text-gray-600">{t('homepage.checkBackLater')}</p>
					</div>
				) : (
					<>
						{/* Background loading indicator */}
						{isFetching && salonsWithServices.length > 0 && (
							<div className="absolute top-4 right-4 z-10">
								<div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 shadow-sm">
									<div className="w-3 h-3 border-2 border-[#ff5b5b] border-t-transparent rounded-full animate-spin"></div>
									<span className="text-xs text-gray-600">Updating...</span>
								</div>
							</div>
						)}

						{/* Desktop grid view */}
						<div className="hidden md:grid md:grid-cols-3 gap-6 px-6">
							{salonsWithUrls.slice(0, 3).map((salon, index: number) => {
								const avgRating = salon.avgRating || 0;
								const reviewCount = salon._count?.reviews || 0;

								return (
									<Link
										key={salon.id}
										href={salon.url}
										className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 block"
									>
										<div className="relative h-[15rem] bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
											{(() => {
												const imageData = getSalonImage(salon);
												return imageData.url ? (
													<Image
														src={imageData.url}
														alt={salon.name}
														width={400}
														height={240}
														priority={index === 0}
														loading={index === 0 ? 'eager' : 'lazy'}
														sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
														className="grayscale-[30%] w-full h-full object-cover"
														unoptimized={imageData.isExternal}
													/>
												) : (
													<Image
														src="/images/placeholder.webp"
														alt={salon.name}
														width={400}
														height={240}
														className="w-full h-full object-cover"
														loading="lazy"
														sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
													/>
												);
											})()}
											{/* Average rating badge (replaces price range) */}
											{avgRating > 0 && (
												<div className="absolute top-3 right-3 bg-white rounded-full px-3 py-1 shadow-md flex items-center gap-1">
													<Star className="w-4 h-4 text-[#ff5b5b] fill-[#ff5b5b]" />
													<span className="text-sm font-semibold text-gray-900">
														{avgRating.toFixed(1)} ({reviewCount})
													</span>
												</div>
											)}
										</div>
										<div className="p-5">
											{/* Title and Rating */}
											<div className="flex items-start justify-between mb-2">
												<h3 className="text-xl font-bold text-gray-900 flex-1">
													{salon.name}
												</h3>
											</div>

											{/* Categories */}
											{(() => {
												const { firstCategory, additionalCount } =
													getSalonCategories(salon);
												if (!firstCategory) return null;

												return (
													<div className="flex items-center gap-2 mb-6">
														<span className="text-sm text-gray-600">
															{firstCategory}
														</span>
														{additionalCount > 0 && (
															<span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
																+{additionalCount}
															</span>
														)}
													</div>
												);
											})()}

											{/* Footer: View Details */}
											<div className="flex items-start justify-end">
												<span className="text-red-500 flex gap-1 items-center text-sm font-medium hover:text-red-600 transition-colors">
													{t.salon.viewDetails}
													<ChevronRight className="w-4 h-4" />
												</span>
											</div>
										</div>
									</Link>
								);
							})}
						</div>

						{/* Mobile swiper view */}
						<div className="md:hidden overflow-x-auto scrollbar-hide px-4 pb-2">
							<div className="flex gap-4" style={{ width: 'max-content' }}>
								{salonsWithUrls.slice(0, 3).map((salon, index: number) => {
									const avgRating = salon.avgRating || 0;
									const reviewCount = salon._count?.reviews || 0;

									return (
										<Link
											key={salon.id}
											href={salon.url}
											className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 block flex-shrink-0"
											style={{ width: 'calc(66.666vw - 2rem)' }}
										>
											<div className="relative h-[12rem] bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
												{(() => {
													const imageData = getSalonImage(salon);
													return imageData.url ? (
														<Image
															src={imageData.url}
															alt={salon.name}
															width={400}
															height={240}
															loading={index === 0 ? 'eager' : 'lazy'}
															sizes="(max-width: 768px) 100vw, 50vw"
															style={{
																width: '100%',
																height: '100%',
																objectFit: 'cover',
															}}
															className="grayscale-[30%] object-cover"
															unoptimized={imageData.isExternal}
														/>
													) : (
														<Image
															src="/images/placeholder.webp"
															alt={salon.name}
															width={400}
															height={240}
															className="w-full h-full object-cover"
															loading="lazy"
															sizes="(max-width: 768px) 100vw, 50vw"
														/>
													);
												})()}
												{/* Average rating badge (replaces price range) */}
												{avgRating > 0 && (
													<div className="absolute top-3 right-3 bg-white rounded-full px-3 py-0.5 shadow-sm flex items-center gap-1">
														<Star className="w-4 h-4 text-[#ff5b5b] fill-[#ff5b5b]" />
														<span className="text-sm font-semibold text-gray-900">
															{avgRating.toFixed(1)} ({reviewCount})
														</span>
													</div>
												)}
											</div>
											<div className="p-3">
												{/* Title and Rating */}
												<div className="flex items-start justify-between mb-2">
													<h3 className="text-lg font-bold text-gray-900 flex-1">
														{salon.name}
													</h3>
													{avgRating > 0 && (
														<div className="flex items-center gap-1 ml-2 flex-shrink-0">
															<span className="text-red-500">
																<Star className="w-4 h-4 text-[#ff5b5b] fill-[#ff5b5b]" />
															</span>
															<span className="text-sm font-semibold text-gray-900">
																{avgRating.toFixed(1)}
															</span>
														</div>
													)}
												</div>

												{/* Categories */}
												{(() => {
													const { firstCategory, additionalCount } =
														getSalonCategories(salon);
													if (!firstCategory) return null;

													return (
														<div className="flex items-center gap-2 mb-3">
															<span className="text-xs text-gray-600">
																{firstCategory}
															</span>
															{additionalCount > 0 && (
																<span className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
																	+{additionalCount}
																</span>
															)}
														</div>
													);
												})()}

												{/* Footer: Reviews and View Details */}
												<div className="flex items-center justify-between">
													{/* Mobile: Show only star + rating if reviews exist, Desktop: Show review count */}
													{reviewCount > 0 ? (
														<>
															{/* Mobile: Star + rating only */}
															<div className="md:hidden flex items-center gap-1">
																<Star className="w-4 h-4 text-[#ff5b5b] fill-[#ff5b5b]" />
																<span className="text-sm font-semibold text-gray-900">
																	{avgRating.toFixed(1)}
																</span>
															</div>
															{/* Desktop: Review count */}
															<span className="hidden md:block text-gray-500 text-sm">
																{reviewCount} {t.salon.reviewsCount}
															</span>
														</>
													) : (
														<span className="hidden md:block text-gray-500 text-sm">
															{reviewCount} {t.salon.reviewsCount}
														</span>
													)}
													<span className="text-red-500 flex gap-1 items-center text-sm font-medium hover:text-red-600 transition-colors">
														{t.salon.viewDetails}
														<ChevronRight className="w-4 h-4" />
													</span>
												</div>
											</div>
										</Link>
									);
								})}
							</div>
						</div>
					</>
				)}
			</div>

			<div className="mx-auto max-w-6xl px-6 mt-6 sm:mt-8 text-center">
				<Link
					href="/salons"
					className="inline-flex items-center gap-2 text-[#ff5b5b] hover:text-[#e04a4a] font-medium"
				>
					{t('homepage.seeAllSalons')}
					<ChevronRight className="w-4 h-4" />
				</Link>
			</div>
		</section>
	);
}
