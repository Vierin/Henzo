'use client';

import { useFavoriteSalons } from '@/hooks/useFavorites';
import SalonCard from '@/components/SalonCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Heart } from 'lucide-react';

export default function FavoritesClient() {
	const { data: favorites = [], isLoading, error } = useFavoriteSalons();

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
					<div key={salon.id} role="listitem">
						<SalonCard
							salon={{
								id: salon.id,
								name: salon.name,
								description: salon.description || '',
								address: salon.address || '',
								phone: salon.phone || '',
								email: salon.email || '',
								website: salon.website || '',
								instagram: salon.instagram || '',
								logo: salon.logo || '',
								photos: salon.photos,
								workingHours: null,
								ownerId: '',
								createdAt: '',
								categoryIds: [],
								reviews:
									salon.reviewCount > 0
										? Array(salon.reviewCount).fill({
												rating: salon.averageRating,
											})
										: [],
								services: salon.services.map((service) => ({
									id: service.id,
									name: service.name,
									description: '',
									duration: service.duration,
									price: service.price,
									salonId: salon.id,
								})),
							}}
						/>
					</div>
				))}
			</div>
		</main>
	);
}
