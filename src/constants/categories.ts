export interface Category {
	id: number;
	name: string;
	slug: string;
	icon: string;
}

export const STATIC_CATEGORIES: Category[] = [
	{
		id: 1,
		name: 'Hair & Barber',
		slug: 'hair-barber',
		icon: '💇‍♀️',
	},
	{
		id: 2,
		name: 'Tattoo & Piercing',
		slug: 'tattoo-piercing',
		icon: '🎨',
	},
	{
		id: 3,
		name: 'Massage & Spa',
		slug: 'massage-spa',
		icon: '🧘‍♀️',
	},
	{
		id: 4,
		name: 'Manicure & Pedicure',
		slug: 'manicure-pedicure',
		icon: '💅',
	},
	{
		id: 5,
		name: 'Cosmetic Medicine',
		slug: 'cosmetic-medicine',
		icon: '💉',
	},
	{
		id: 6,
		name: 'Other Services',
		slug: 'other-services',
		icon: '✨',
	},
];
