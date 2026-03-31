import salonCategoriesData from './salonCategories.json';

export interface Category {
	id: number;
	name: string;
	slug: string;
	description?: string;
	descriptionTranslationKey?: string;
}

export interface PopularSearch {
	term: string;
	categorySlug: string;
}

// Static categories loaded from JSON - single source of truth
export const STATIC_CATEGORIES: Category[] = salonCategoriesData as Category[];

// Popular search terms mapped to category slugs
export const POPULAR_SEARCHES: PopularSearch[] = [
	{
		term: 'Haircut',
		categorySlug: 'hair-barber',
	},
	{
		term: 'Manicure',
		categorySlug: 'manicure-pedicure',
	},
	{
		term: 'Massage',
		categorySlug: 'massage-spa',
	},
	{
		term: 'Hair Coloring',
		categorySlug: 'hair-barber',
	},
];

// Helper function to get category by slug
export const getCategoryBySlug = (slug: string) => {
	return STATIC_CATEGORIES.find((category) => category.slug === slug);
};

// Helper function to get category by id
export const getCategoryById = (id: number) => {
	return STATIC_CATEGORIES.find((category) => category.id === id);
};
