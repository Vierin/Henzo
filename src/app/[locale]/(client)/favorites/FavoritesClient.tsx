'use client';

import Link from 'next/link';
import { useFavoriteSalons, useRemoveFavorite } from '@/hooks/useFavorites';
import LoadingSpinner from '@/components/LoadingSpinner';
import SalonImage from '@/components/SalonImage';
import { Heart, Star, MapPin, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { generateSalonSlug } from '@/utils/slug';
import { useAuth } from '@/lib/auth-unified';
import { useState } from 'react';
import { useTranslation } from '@/contexts/LanguageContext';

export default function FavoritesClient() {
	const t = useTranslation();
	const { user } = useAuth();
	const { data: favorites = [], isLoading, error } = useFavoriteSalons(!!user);
	const removeFavoriteMutation = useRemoveFavorite();
	const router = useRouter();
	const [removingSalonId, setRemovingSalonId] = useState<string | null>(null);

	const handleBookSalon = (salonId: string, salonName: string) => {
		const slug = generateSalonSlug(salonId, salonName);
		router.push(`/salon/${slug}`);
	};

	const handleRemoveFavorite = async (salonId: string, salonName: string) => {
		// Show confirmation dialog before removing
		const confirmed = window.confirm(
			t('client.favorites.removeConfirmation').replace('{salonName}', salonName)
		);

		if (!confirmed) {
			return; // User cancelled the action
		}

		setRemovingSalonId(salonId);
		try {
			await removeFavoriteMutation.mutateAsync(salonId);
		} catch (error) {
			// Error is handled by the mutation's onError callback
			console.error('Failed to remove favorite:', error);
		} finally {
			setRemovingSalonId(null);
		}
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
					{t('client.favorites.errorLoadingFavorites')}
				</h3>
				<p className="text-gray-600">
					{t('client.favorites.errorLoadingDescription')}
				</p>
			</div>
		);
	}

	if (favorites.length === 0) {
		return (
			<main role="main" aria-labelledby="favorites-heading">
				<header className="mb-6 md:mb-8">
					<h1
						id="favorites-heading"
						className="text-2xl md:text-3xl font-bold text-gray-900"
					>
						{t('client.favorites.title')}
					</h1>
					<p className="text-gray-600 mt-2 text-sm md:text-base">
						{t('client.favorites.subtitle')}
					</p>
				</header>

				<div
					className="text-center py-8 md:py-12"
					role="status"
					aria-labelledby="empty-heading"
				>
					<div className="w-12 h-12 md:w-16 md:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
						<Heart className="w-6 h-6 md:w-8 md:h-8 text-gray-400" />
					</div>
					<h3
						id="empty-heading"
						className="text-lg md:text-xl font-semibold text-gray-900 mb-2"
					>
						{t('client.favorites.noFavoriteSalons')}
					</h3>
					<p className="text-gray-600 mb-4 md:mb-6 text-sm md:text-base px-4">
						{t('client.favorites.noFavoritesDescription')}
					</p>
					<Link
						href="/salons"
						className="inline-block bg-[#ff5b5b] text-white px-4 md:px-6 py-2 md:py-3 rounded-lg text-sm md:text-base font-medium hover:bg-[#e04a4a] transition-colors focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:ring-offset-2"
					>
						{t('client.favorites.browseSalons')}
					</Link>
				</div>
			</main>
		);
	}

	return (
		<main role="main" aria-labelledby="favorites-heading">
			<header className="mb-6 md:mb-8">
				<h1
					id="favorites-heading"
					className="text-2xl md:text-3xl font-bold text-gray-900"
				>
					{t('client.favorites.title')}
				</h1>
				<p className="text-gray-600 mt-2 text-sm md:text-base">
					{favorites.length} {favorites.length === 1 ? t('client.favorites.salon') : t('client.favorites.salonsSaved')} {t('client.favorites.saved')}
				</p>
			</header>

			<div
				className="space-y-3 md:space-y-6"
				role="list"
				aria-label="Favorite salons list"
			>
				{favorites.map((salon) => (
					<div
						key={salon.id}
						role="listitem"
						className="bg-white rounded-lg md:rounded-xl p-3 md:p-6 shadow-sm hover:shadow-md transition-shadow relative"
					>
						{/* Remove button in top-right corner */}
						<button
							onClick={() => handleRemoveFavorite(salon.id, salon.name)}
							disabled={removingSalonId === salon.id}
							className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							aria-label={t('client.favorites.removeFromFavorites').replace('{salonName}', salon.name)}
						>
							{removingSalonId === salon.id ? (
								<div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
							) : (
								<X className="w-4 h-4" />
							)}
						</button>

						<div className="flex items-center gap-3 md:gap-4 pr-8">
							{/* Salon Image */}
							<div className="aspect-square w-16 h-16 md:w-28 md:h-28 rounded-lg flex-shrink-0">
								<SalonImage
									src={salon.logo || salon.photos[0] || ''}
									alt={salon.name}
									width={120}
									height={120}
									className="aspect-square w-full h-full object-cover rounded-lg"
								/>
							</div>

							{/* Salon Info */}
							<div className="flex-1 min-w-0">
								<div className="flex items-start justify-between mb-1 md:mb-2">
									<h3 className="text-base md:text-lg font-semibold text-gray-900 truncate">
										{salon.name}
									</h3>
								</div>

								{salon.address && (
									<div className="flex items-start gap-1 mb-1 md:mb-2">
										<MapPin className="w-3 h-3 md:w-4 md:h-4 text-gray-400 flex-shrink-0 mt-0.5" />
										<p className="text-gray-600 text-xs md:text-sm truncate">
											{salon.address}
										</p>
									</div>
								)}

								{/* Rating - moved to show inline on mobile */}
								{salon.averageRating > 0 && (
									<div className="flex items-center gap-1 md:hidden mb-2">
										<Star className="w-3 h-3 text-[#ff5b5b] fill-[#ff5b5b]" />
										<span className="text-xs font-medium text-gray-900">
											{salon.averageRating.toFixed(1)}
										</span>
										<span className="text-xs text-gray-500">
											({salon.reviewCount})
										</span>
									</div>
								)}
							</div>

							{/* Action Button - Desktop */}
							<div className="hidden md:flex flex-shrink-0 h-full flex-col gap-4 items-end">
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
								<div className="flex gap-2">
									<button
										onClick={() => handleBookSalon(salon.id, salon.name)}
										className="bg-[#ff5b5b] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#e04a4a] transition-colors"
									>
										{t('client.favorites.bookAgain')}
									</button>
									<button
										onClick={() => handleRemoveFavorite(salon.id, salon.name)}
										disabled={removingSalonId === salon.id}
										className="bg-gray-500 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
										aria-label={t('client.favorites.removeFromFavorites').replace('{salonName}', salon.name)}
									>
										{removingSalonId === salon.id ? (
											<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
										) : (
											<X className="w-4 h-4" />
										)}
										<span className="hidden sm:inline">{t('client.favorites.remove')}</span>
									</button>
								</div>
							</div>

							{/* Action Button - Mobile */}
							<div className="md:hidden flex-shrink-0 flex flex-col gap-2">
								<button
									onClick={() => handleBookSalon(salon.id, salon.name)}
									className="bg-[#ff5b5b] text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-[#e04a4a] transition-colors"
								>
									{t('client.favorites.book')}
								</button>
								<button
									onClick={() => handleRemoveFavorite(salon.id, salon.name)}
									disabled={removingSalonId === salon.id}
									className="bg-gray-500 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
									aria-label={`Remove ${salon.name} from favorites`}
								>
									{removingSalonId === salon.id ? (
										<div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
									) : (
										<X className="w-3 h-3" />
									)}
									<span>{t('client.favorites.remove')}</span>
								</button>
							</div>
						</div>
					</div>
				))}
			</div>
		</main>
	);
}
