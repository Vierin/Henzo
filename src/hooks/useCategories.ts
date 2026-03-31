import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import salonCategoriesData from '@/constants/salonCategories.json';

export interface Category {
	id: number;
	name: string;
	slug: string;
}

export interface SalonCategory {
	id: number;
	slug: string;
	name: string;
	translationKey: string;
	descriptionTranslationKey?: string;
}

// Static salon categories with IDs - single source of truth
export const STATIC_SALON_CATEGORIES: SalonCategory[] =
	salonCategoriesData as SalonCategory[];

// Category translation mapping generated from static categories
export const CATEGORY_TRANSLATION_MAP: Record<string, string> =
	STATIC_SALON_CATEGORIES.reduce(
		(acc, category) => {
			acc[category.slug] = category.translationKey;
			return acc;
		},
		{} as Record<string, string>
	);

// Helper to get salon category by ID
export function getSalonCategoryById(id: number): SalonCategory | undefined {
	return STATIC_SALON_CATEGORIES.find((cat) => cat.id === id);
}

// Helper to get salon category by slug
export function getSalonCategoryBySlug(
	slug: string
): SalonCategory | undefined {
	return STATIC_SALON_CATEGORIES.find((cat) => cat.slug === slug);
}

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
export function getCategoryById(
	categories: Category[],
	id: number
): Category | undefined {
	return categories.find((cat) => cat.id === id);
}

// Helper function to get category by slug
export function getCategoryBySlug(
	categories: Category[],
	slug: string
): Category | undefined {
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

// Helper function to get translated category description
export function getCategoryTranslatedDescription(
	category: Category | SalonCategory,
	t: (key: string) => string
): string | undefined {
	const salonCategory = category as SalonCategory;
	if (salonCategory.descriptionTranslationKey) {
		return t(salonCategory.descriptionTranslationKey);
	}
	return undefined;
}
