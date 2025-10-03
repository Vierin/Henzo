'use client';

import { useSalonsWithServices } from '@/hooks/useSalons';
import { useSalonSlug } from '@/hooks/useSalonSlug';
import { supabase } from '@/lib/supabase';
import { Salon, Service } from '@/types';
import LoadingSpinner from './LoadingSpinner';
import ErrorDisplay from './ErrorDisplay';
import Image from 'next/image';
import Link from 'next/link';

export default function RecommendedSalons() {
	const { getSalonUrl } = useSalonSlug();
	const {
		data: salons = [],
		isLoading: loading,
		error,
		refetch,
	} = useSalonsWithServices();

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
			className="py-16 px-6 bg-white"
			aria-label="Featured beauty salons"
		>
			<div className="mx-auto max-w-6xl">
				<header className="mb-12 text-center">
					<h2 className="text-3xl font-bold text-gray-900 mb-4">
						Top-Rated Beauty & Wellness Salons
					</h2>
					<p className="text-lg text-gray-600 max-w-2xl mx-auto">
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
				) : salons.length === 0 ? (
					<div className="text-center py-12">
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
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						{salons.slice(0, 3).map((salon: Salon) => (
							<Link
								key={salon.id}
								href={getSalonUrl(salon)}
								className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow block"
							>
								<div className="h-[15rem] bg-gradient-to-br from-pink-100 to-pink-200 flex items-center justify-center">
									{(() => {
										const imageData = getSalonImage(salon);
										return imageData.url ? (
											<Image
												src={imageData.url}
												alt={salon.name}
												width={400}
												height={192}
												style={{
													width: '100%',
													height: '100%',
													objectFit: 'cover',
												}}
												unoptimized={imageData.isExternal}
											/>
										) : (
											<span className="text-6xl">💇‍♀️</span>
										);
									})()}
								</div>
								<div className="p-6">
									<h3 className="text-xl font-bold text-gray-900 mb-2">
										{salon.name}
									</h3>
									<p className="text-[#ff5b5b] text-sm mb-2">{salon.address}</p>
									{salon.phone && (
										<p className="text-gray-500 text-xs mb-3">
											📞 {salon.phone}
										</p>
									)}
									{salon.services && salon.services.length > 0 && (
										<div className="flex flex-wrap gap-1 mb-4">
											{salon.services
												.slice(0, 2)
												.map((service: Service, index: number) => (
													<span
														key={service.id || index}
														className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
													>
														{service.name}
													</span>
												))}
										</div>
									)}
									<div className="flex items-center justify-center">
										<span className="bg-[#ff5b5b] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#e04a4a] transition-colors">
											View Details
										</span>
									</div>
								</div>
							</Link>
						))}
					</div>
				)}
			</div>
		</section>
	);
}
