'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Category } from '@/constants/categories';
import { useTranslation } from '@/contexts/LanguageContext';

interface CategoryCardProps {
	category: Category;
	className?: string;
}

const categoryTranslationMap: Record<
	string,
	keyof ReturnType<typeof useTranslation>['categories']
> = {
	'hair-barber': 'hairBarber',
	'massage-spa': 'massageSpa',
	'manicure-pedicure': 'manicurePedicure',
	'cosmetic-medicine': 'cosmeticMedicine',
	'other-services': 'otherServices',
};

export default function CategoryCard({
	category,
	className = '',
}: CategoryCardProps) {
	const params = useParams();
	const locale = (params as any)?.locale as string | undefined;
	const t = useTranslation();
	const translationKey = categoryTranslationMap[category.slug];
	const translatedName = translationKey
		? t.categories[translationKey]
		: category.name;

	let translatedDescription: string | undefined;
	if (translationKey) {
		const descKey = `${translationKey}Description` as keyof typeof t.categories;
		translatedDescription = t.categories[descKey] as string;
	} else {
		translatedDescription = category.description;
	}

	return (
		<Link
			href={
				locale
					? `/${locale}/category/${category.slug}`
					: `/category/${category.slug}`
			}
			className={`group bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden relative ${className}`}
		>
			<div className="p-8 text-center">
				<h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-red-500 transition-colors">
					{translatedName}
				</h3>
				{translatedDescription && (
					<p className="text-gray-600 text-sm leading-relaxed">
						{translatedDescription}
					</p>
				)}
			</div>
			<div className="absolute inset-0 bg-gradient-to-t from-red-500/0 to-red-500/0 group-hover:from-red-500/5 group-hover:to-red-500/10 transition-all duration-300 pointer-events-none" />
		</Link>
	);
}
