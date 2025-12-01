'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { STATIC_CATEGORIES } from '@/constants/categories';
import { useTranslation } from '@/contexts/LanguageContext';

interface CategoriesNavigationProps {
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

export default function CategoriesNavigation({
	className = '',
}: CategoriesNavigationProps) {
	const params = useParams();
	const locale = (params as any)?.locale as string | undefined;
	const t = useTranslation();
	return (
		<div className={`overflow-x-auto scrollbar-hide ${className}`}>
			<div className="flex items-center justify-start md:justify-center space-x-6 md:space-x-8 px-6 md:px-0 min-w-max md:min-w-0">
				{STATIC_CATEGORIES.map((category) => {
                                  const translationKey = categoryTranslationMap[category.slug];
                                  const translatedName = translationKey
                                          ? t(`categories.${String(translationKey)}`) || (t.categories as any)?.[String(translationKey)]
                                          : category.name;
					return (
						<Link
							key={category.id}
							href={
								locale
									? `/${locale}/category/${category.slug}`
									: `/category/${category.slug}`
							}
							className="text-sm font-medium text-gray-700 hover:text-[#ff5b5b] transition-colors whitespace-nowrap"
						>
							{translatedName}
						</Link>
					);
				})}
			</div>
		</div>
	);
}
