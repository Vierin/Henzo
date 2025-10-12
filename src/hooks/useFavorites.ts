import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';

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
export const useFavoriteSalons = () => {
	return useQuery<FavoriteSalon[]>({
		queryKey: ['favorites'],
		queryFn: async () => {
			const response = await apiClient.get<{ favorites: FavoriteSalon[] }>(
				'/auth/favorites'
			);
			return response.favorites;
		},
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
			toast.success('Added to favorites!');
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Failed to add to favorites');
		},
	});
};

// Remove salon from favorites
export const useRemoveFavorite = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (salonId: string) => {
			const response = await apiClient.delete(`/auth/favorites/${salonId}`, {
				salonId,
			});
			return response;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['favorites'] });
			toast.success('Removed from favorites');
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Failed to remove from favorites');
		},
	});
};

// Check if salon is favorited
export const useIsFavorite = (salonId: string) => {
	const { data: favorites = [] } = useFavoriteSalons();
	return favorites.some((salon) => salon.id === salonId);
};

