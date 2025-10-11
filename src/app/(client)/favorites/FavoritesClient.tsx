'use client';

import { useFavoriteSalons } from '@/hooks/useFavorites';
import LoadingSpinner from '@/components/LoadingSpinner';
import SalonImage from '@/components/SalonImage';
import { Heart, Star, MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { generateSalonSlug } from '@/utils/slug';

export default function FavoritesClient() {
	const { data: favorites = [], isLoading, error } = useFavoriteSalons();
	const router = useRouter();

	const handleBookSalon = (salonId: string, salonName: string) => {
		const slug = generateSalonSlug(salonId, salonName);
		router.push(`/salon/${slug}`);
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<LoadingSpinner size="lg" />
			</div>
		);
	}

	if (error) {
		return (
			<div
				className="text-center py-12"
				role="alert"
				aria-labelledby="error-heading"
			>
				<div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
					<span className="text-2xl">⚠️</span>
				</div>
				<h3
					id="error-heading"
					className="text-xl font-semibold text-gray-900 mb-2"
				>
					Error loading favorites
				</h3>
				<p className="text-gray-600">
					There was an error loading your favorite salons. Please try again
					later.
				</p>
			</div>
		);
	}

	if (favorites.length === 0) {
		return (
			<main role="main" aria-labelledby="favorites-heading">
				<header className="mb-8">
					<h1
						id="favorites-heading"
						className="text-3xl font-bold text-gray-900"
					>
						Favorite Salons
					</h1>
					<p className="text-gray-600 mt-2">
						Salons you've marked as favorites
					</p>
				</header>

				<div
					className="text-center py-12"
					role="status"
					aria-labelledby="empty-heading"
				>
					<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
						<Heart className="w-8 h-8 text-gray-400" />
					</div>
					<h3
						id="empty-heading"
						className="text-xl font-semibold text-gray-900 mb-2"
					>
						No favorite salons yet
					</h3>
					<p className="text-gray-600 mb-6">
						Browse salons and mark your favorites by clicking the heart icon
					</p>
					<a
						href="/salons"
						className="inline-block bg-[#ff5b5b] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#e04a4a] transition-colors focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:ring-offset-2"
					>
						Browse Salons
					</a>
				</div>
			</main>
		);
	}

	return (
		<main role="main" aria-labelledby="favorites-heading">
			<header className="mb-8">
				<h1 id="favorites-heading" className="text-3xl font-bold text-gray-900">
					Favorite Salons
				</h1>
				<p className="text-gray-600 mt-2">
					{favorites.length} {favorites.length === 1 ? 'salon' : 'salons'} saved
				</p>
			</header>

			<div className="space-y-6" role="list" aria-label="Favorite salons list">
				{favorites.map((salon) => (
					<div
						key={salon.id}
						role="listitem"
						className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
					>
						<div className="flex items-start gap-4">
							{/* Salon Image */}
							<div className="aspect-square h-30 rounded-lg flex-shrink-0">
								<SalonImage
									src={salon.logo || salon.photos[0] || ''}
									alt={salon.name}
									width={120}
									height={120}
									className="aspect-square h-full object-cover rounded-lg"
									style={{ width: 'auto', height: 'auto' }}
									placeholder="💇‍♀️"
								/>
							</div>

							{/* Salon Info */}
							<div className="flex-1 min-w-0">
								<div className="flex items-start justify-between mb-2">
									<h3 className="text-lg font-semibold text-gray-900 truncate">
										{salon.name}
									</h3>
								</div>

								{salon.address && (
									<div className="flex items-start gap-1 mb-2">
										<MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
										<p className="text-gray-600 text-sm line-clamp-1">
											{salon.address}
										</p>
									</div>
								)}

								{salon.services && salon.services.length > 0 && (
									<p className="text-gray-500 text-sm mb-3">
										{salon.services.length}{' '}
										{salon.services.length === 1 ? 'service' : 'services'}{' '}
										available
									</p>
								)}
							</div>

							{/* Action Button */}
							<div className="flex-shrink-0 h-full flex flex-col gap-4 items-end">
								{salon.averageRating > 0 && (
									<div className="flex items-center gap-1 ml-2 flex-shrink-0">
										<Star className="w-4 h-4 text-[#ff5b5b] fill-[#ff5b5b]" />
										<span className="text-sm font-medium text-gray-900">
											{salon.averageRating.toFixed(1)}
										</span>
										<span className="text-xs text-gray-500">
											({salon.reviewCount})
										</span>
									</div>
								)}
								<button
									onClick={() => handleBookSalon(salon.id, salon.name)}
									className="bg-[#ff5b5b] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#e04a4a] transition-colors"
								>
									Book Again
								</button>
							</div>
						</div>
					</div>
				))}
			</div>
		</main>
	);
}
