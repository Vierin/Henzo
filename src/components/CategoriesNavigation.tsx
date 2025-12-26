'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
	useCategories,
	getCategoryTranslatedName,
} from '@/hooks/useCategories';
import { useTranslation } from '@/contexts/LanguageContext';

interface CategoriesNavigationProps {
	className?: string;
}

export default function CategoriesNavigation({
	className = '',
}: CategoriesNavigationProps) {
	const params = useParams();
	const locale = (params as any)?.locale as string | undefined;
	const t = useTranslation();
	const { data: categories = [] } = useCategories();

	return (
		<div className={`overflow-x-auto scrollbar-hide ${className}`}>
			<div className="flex items-center justify-start md:justify-center space-x-6 md:space-x-8 px-6 md:px-0 min-w-max md:min-w-0">
				{categories.map((category) => (
					<Link
						key={category.id}
						href={
							locale
								? `/${locale}/category/${category.slug}`
								: `/category/${category.slug}`
						}
						className="text-sm font-medium text-gray-700 hover:text-[#ff5b5b] transition-colors whitespace-nowrap"
					>
						{getCategoryTranslatedName(category, t)}
					</Link>
				))}
			</div>
		</div>
	);
}
