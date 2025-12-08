import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';

// Helper function to get translation for favorites messages
// This function gets the current language from localStorage and returns the appropriate translation
const getFavoriteTranslation = (key: string): string => {
	if (typeof window === 'undefined') {
		// Fallback to English on server
		const fallbacks: Record<string, string> = {
			addedToFavorites: 'Added to favorites!',
			removedFromFavorites: 'Removed from favorites',
			failedToAdd: 'Failed to add to favorites',
			failedToRemove: 'Failed to remove from favorites',
		};
		return fallbacks[key] || key;
	}

	const language = localStorage.getItem('henzo-language') || 'en';
	
	// Import translations dynamically based on language
	const translations: Record<string, Record<string, string>> = {
		en: {
			addedToFavorites: 'Added to favorites!',
			removedFromFavorites: 'Removed from favorites',
			failedToAdd: 'Failed to add to favorites',
			failedToRemove: 'Failed to remove from favorites',
		},
		ru: {
			addedToFavorites: 'Добавлено в избранное!',
			removedFromFavorites: 'Удалено из избранного',
			failedToAdd: 'Не удалось добавить в избранное',
			failedToRemove: 'Не удалось удалить из избранного',
		},
		vi: {
			addedToFavorites: 'Đã thêm vào yêu thích!',
			removedFromFavorites: 'Đã xóa khỏi yêu thích',
			failedToAdd: 'Không thể thêm vào yêu thích',
			failedToRemove: 'Không thể xóa khỏi yêu thích',
		},
	};

	return translations[language as 'en' | 'ru' | 'vi']?.[key] || translations.en[key] || key;
};

export interface FavoriteSalon {
	id: string;
	name: string;
	description: string | null;
	address: string | null;
	phone: string | null;
	email: string | null;
	website: string | null;
	instagram: string | null;
	logo: string | null;
	photos: string[];
	averageRating: number;
	reviewCount: number;
	services: {
		id: string;
		name: string;
		price: number;
		duration: number;
	}[];
}

// Get all favorite salons
export const useFavoriteSalons = (isAuthenticated: boolean = false) => {
	return useQuery<FavoriteSalon[]>({
		queryKey: ['favorites'],
		queryFn: async () => {
			const response = await apiClient.get<{ favorites: FavoriteSalon[] }>(
				'/auth/favorites'
			);
			return response.favorites;
		},
		enabled: isAuthenticated, // Only enable when user is authenticated
		staleTime: 5 * 60 * 1000, // 5 minutes
		refetchOnMount: false, // Не перезапрашивать если данные свежие
		refetchOnWindowFocus: false, // Не перезапрашивать при фокусе окна
	});
};

// Add salon to favorites
export const useAddFavorite = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (salonId: string) => {
			const response = await apiClient.post(`/auth/favorites/${salonId}`, {
				salonId,
			});
			return response;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['favorites'] });
			toast.success(getFavoriteTranslation('addedToFavorites'));
		},
		onError: (error: Error) => {
			toast.error(error.message || getFavoriteTranslation('failedToAdd'));
		},
	});
};

// Remove salon from favorites
export const useRemoveFavorite = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (salonId: string) => {
			const response = await apiClient.delete(`/auth/favorites/${salonId}`);
			return response;
		},
		onMutate: async (salonId: string) => {
			// Cancel any outgoing refetches
			await queryClient.cancelQueries({ queryKey: ['favorites'] });

			// Snapshot the previous value
			const previousFavorites = queryClient.getQueryData<FavoriteSalon[]>([
				'favorites',
			]);

			// Optimistically update to the new value
			queryClient.setQueryData<FavoriteSalon[]>(['favorites'], (old) => {
				if (!old || !Array.isArray(old)) return [];
				return old.filter((salon) => salon.id !== salonId);
			});

			// Return a context object with the snapshotted value
			return { previousFavorites, salonId };
		},
		onError: (error: Error, salonId: string, context) => {
			// If the mutation fails, use the context returned from onMutate to roll back
			if (context?.previousFavorites) {
				queryClient.setQueryData(['favorites'], context.previousFavorites);
			}
			toast.error(error.message || getFavoriteTranslation('failedToRemove'));
		},
		onSettled: () => {
			// Always refetch after error or success to ensure cache consistency
			queryClient.invalidateQueries({ queryKey: ['favorites'] });
		},
		onSuccess: () => {
			toast.success(getFavoriteTranslation('removedFromFavorites'));
		},
	});
};

// Check if salon is favorited
export const useIsFavorite = (
	salonId: string,
	isAuthenticated: boolean = false
) => {
	const { data: favorites = [] } = useFavoriteSalons(isAuthenticated);

	// Only check favorites if user is authenticated
	if (!isAuthenticated) {
		return false;
	}

	return favorites.some((salon) => salon.id === salonId);
};
