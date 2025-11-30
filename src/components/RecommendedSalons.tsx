'use client';

import { useMemo } from 'react';
import { useFeaturedSalons } from '@/hooks/useSalonPreview';
import { useSalonSlug } from '@/hooks/useSalonSlug';
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
			(salons as Salon[]).filter(
				(salon) => salon.services && salon.services.length > 0
			),
		[salons]
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
						<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
							<span className="text-2xl">🏪</span>
						</div>
						<h3 className="text-xl font-semibold text-gray-900 mb-2">
							{t('homepage.noSalonsAvailable')}
						</h3>
						<p className="text-gray-600">
							{t('homepage.checkBackLater')}
						</p>
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
							{salonsWithServices
								.slice(0, 3)
								.map((salon: Salon, index: number) => {
									const avgRating = salon.avgRating || 0;
									const reviewCount = salon._count?.reviews || 0;

									return (
										<Link
											key={salon.id}
											href={getSalonUrl(salon)}
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
														<span className="text-6xl">💇‍♀️</span>
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
												<div className="flex items-start justify-between mb-8">
													<h3 className="text-xl font-bold text-gray-900 flex-1">
														{salon.name}
													</h3>
												</div>

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
								{salonsWithServices
									.slice(0, 3)
									.map((salon: Salon, index: number) => {
										const avgRating = salon.avgRating || 0;
										const reviewCount = salon._count?.reviews || 0;

										return (
											<Link
												key={salon.id}
												href={getSalonUrl(salon)}
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
																style={{
																	width: '100%',
																	height: '100%',
																	objectFit: 'cover',
																}}
																className="grayscale-[30%] object-cover"
																unoptimized={imageData.isExternal}
															/>
														) : (
															<span className="text-6xl">💇‍♀️</span>
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
													<div className="flex items-start justify-between mb-4">
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

													{/* Footer: Reviews and View Details */}
													<div className="flex items-center justify-between">
														<span className="text-gray-500 text-sm">
															{reviewCount} {t.salon.reviewsCount}
														</span>
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
