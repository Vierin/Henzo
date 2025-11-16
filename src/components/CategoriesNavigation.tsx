'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { STATIC_CATEGORIES } from '@/constants/categories';

interface CategoriesNavigationProps {
	className?: string;
}

export default function CategoriesNavigation({
	className = '',
}: CategoriesNavigationProps) {
	const params = useParams();
	const locale = (params as any)?.locale as string | undefined;
	return (
		<div className={`overflow-x-auto scrollbar-hide ${className}`}>
			<div className="flex items-center justify-start md:justify-center space-x-6 md:space-x-8 px-6 md:px-0 min-w-max md:min-w-0">
				{STATIC_CATEGORIES.map((category) => (
					<Link
						key={category.id}
						href={
							locale
								? `/${locale}/category/${category.slug}`
								: `/category/${category.slug}`
						}
						className="text-sm font-medium text-gray-700 hover:text-[#ff5b5b] transition-colors whitespace-nowrap"
					>
						{category.name}
					</Link>
				))}
			</div>
		</div>
	);
}
