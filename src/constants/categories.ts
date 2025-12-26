export interface Category {
	id: number;
	name: string;
	slug: string;
	description?: string;
}

export interface PopularSearch {
	term: string;
	categorySlug: string;
}

export const STATIC_CATEGORIES: Category[] = [
	{
		id: 1,
		name: 'Hair & Barber',
		slug: 'hair-barber',
		description:
			'Professional hair styling, cutting, coloring, and barber services',
	},
	{
		id: 2,
		name: 'Tattoo & Piercing',
		slug: 'tattoo-piercing',
		description: 'Tattoo and body piercing services',
	},
	{
		id: 3,
		name: 'Massage & Spa',
		slug: 'massage-spa',
		description: 'Relaxing massages, spa treatments, and wellness services',
	},
	{
		id: 4,
		name: 'Manicure & Pedicure',
		slug: 'manicure-pedicure',
		description: 'Nail care, manicures, pedicures, and nail art services',
	},
	{
		id: 5,
		name: 'Cosmetic Medicine',
		slug: 'cosmetic-medicine',
		description:
			'Medical aesthetic treatments, botox, fillers, and cosmetic procedures',
	},
	{
		id: 6,
		name: 'Other Services',
		slug: 'other-services',
		description: 'Additional beauty and wellness services',
	},
];

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
		term: 'Facial',
		categorySlug: 'cosmetic-medicine',
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
