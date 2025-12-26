import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface Category {
	id: number;
	name: string;
	slug: string;
}

// Category translation mapping - single source of truth
export const CATEGORY_TRANSLATION_MAP: Record<string, string> = {
	'hair-barber': 'categories.hairBarber',
	'tattoo-piercing': 'categories.tattooPiercing',
	'massage-spa': 'categories.massageSpa',
	'manicure-pedicure': 'categories.manicurePedicure',
	'cosmetic-medicine': 'categories.cosmeticMedicine',
	'other-services': 'categories.otherServices',
};

export function useCategories() {
	return useQuery<Category[]>({
		queryKey: ['salons', 'categories'],
		queryFn: async () => {
			const response = await apiClient.get<Category[]>('/salons/categories');
			return response;
		},
		staleTime: 24 * 60 * 60 * 1000, // 24 hours - categories rarely change
		gcTime: 24 * 60 * 60 * 1000, // 24 hours
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
		refetchOnMount: false,
	});
}

// Helper function to get category by ID
export function getCategoryById(categories: Category[], id: number): Category | undefined {
	return categories.find((cat) => cat.id === id);
}

// Helper function to get category by slug
export function getCategoryBySlug(categories: Category[], slug: string): Category | undefined {
	return categories.find((cat) => cat.slug === slug);
}

// Helper function to get category translation key by slug
export function getCategoryTranslationKey(slug: string): string {
	return CATEGORY_TRANSLATION_MAP[slug] || '';
}

// Helper function to get translated category name
export function getCategoryTranslatedName(
	category: Category,
	t: (key: string) => string
): string {
	const translationKey = getCategoryTranslationKey(category.slug);
	if (translationKey) {
		return t(translationKey) || category.name;
	}
	return category.name;
}
