'use client';

import { useFeaturedSalons } from '@/hooks/useSalonPreview';
import { useSalonSlug } from '@/hooks/useSalonSlug';
import { supabase } from '@/lib/supabase';
import LoadingSpinner from './LoadingSpinner';
import ErrorDisplay from './ErrorDisplay';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight, Star } from 'lucide-react';

export default function RecommendedSalons() {
	const { getSalonUrl } = useSalonSlug();
	const {
		data: salons = [],
		isLoading: loading,
		error,
		refetch,
	} = useFeaturedSalons(3);

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
		salon: any
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
			<div className="mx-auto max-w-6xl">
				<header className="mb-8 sm:mb-12 text-center px-4 sm:px-6">
					<h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">
						Top-Rated Beauty & Wellness Salons
					</h2>
					<p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
						Discover highly-rated salons and spas in your area. Book
						appointments for hair styling, massages, facials, manicures, and
						more professional services.
					</p>
				</header>

				{loading ? (
					<LoadingSpinner message="Loading salons..." />
				) : error ? (
					<ErrorDisplay
						error={error}
						message="Failed to load salons"
						onRetry={() => refetch()}
					/>
				) : (salons as any[]).length === 0 ? (
					<div className="text-center py-12 px-4">
						<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
							<span className="text-2xl">🏪</span>
						</div>
						<h3 className="text-xl font-semibold text-gray-900 mb-2">
							No salons available
						</h3>
						<p className="text-gray-600">
							Check back later for available salons.
						</p>
					</div>
				) : (
					<>
						{/* Desktop grid view */}
						<div className="hidden md:grid md:grid-cols-3 gap-6 px-6">
							{(salons as any[]).slice(0, 3).map((salon: any) => {
								// Get all categories joined by commas
								const categoryText =
									salon.categories && salon.categories.length > 0
										? salon.categories.join(', ')
										: 'Hair & Makeup';
								const avgRating = salon.avgRating || 0;
								const reviewCount = salon._count?.reviews || 0;
								const priceRange = salon.priceRange || '$$';

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
														style={{
															width: '100%',
															height: '100%',
															objectFit: 'cover',
														}}
														className="grayscale-[30%]"
														unoptimized={imageData.isExternal}
													/>
												) : (
													<span className="text-6xl">💇‍♀️</span>
												);
											})()}
											{/* Price range badge */}
											<div className="absolute top-4 right-4 bg-white rounded-full px-3 py-1 shadow-md">
												<span className="text-sm font-medium text-gray-700">
													{priceRange}
												</span>
											</div>
										</div>
										<div className="p-5">
											{/* Title and Rating */}
											<div className="flex items-start justify-between mb-2">
												<h3 className="text-xl font-bold text-gray-900 flex-1">
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

											{/* Category */}
											<p className="text-gray-500 text-sm mb-8">
												{categoryText}
											</p>

											{/* Footer: Reviews and View Details */}
											<div className="flex items-center justify-between">
												<span className="text-gray-500 text-sm">
													{reviewCount}{' '}
													{reviewCount === 1 ? 'review' : 'reviews'}
												</span>
												<span className="text-red-500 flex gap-1 items-center text-sm font-medium hover:text-red-600 transition-colors">
													View Details
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
								{(salons as any[]).slice(0, 3).map((salon: any) => {
									// Get all categories joined by commas
									const categoryText =
										salon.categories && salon.categories.length > 0
											? salon.categories.join(', ')
											: 'Hair & Makeup';
									const avgRating = salon.avgRating || 0;
									const reviewCount = salon._count?.reviews || 0;
									const priceRange = salon.priceRange || '$$';

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
												{/* Price range badge */}
												<div className="absolute top-3 right-3 bg-white rounded-full px-3 shadow-sm">
													<span className="text-sm font-medium text-gray-700">
														{priceRange}
													</span>
												</div>
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

												{/* Category */}
												<p className="text-gray-500 text-sm mb-4">
													{categoryText}
												</p>

												{/* Footer: Reviews and View Details */}
												<div className="flex items-center justify-between">
													<span className="text-gray-500 text-sm">
														{reviewCount}{' '}
														{reviewCount === 1 ? 'review' : 'reviews'}
													</span>
													<span className="text-red-500 flex gap-1 items-center text-sm font-medium hover:text-red-600 transition-colors">
														View Details
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
		</section>
	);
}
