'use client';

import Link from 'next/link';
import { STATIC_CATEGORIES } from '@/constants/categories';

interface CategoriesNavigationProps {
	className?: string;
}

export default function CategoriesNavigation({
	className = '',
}: CategoriesNavigationProps) {
	return (
		<div className={`flex items-center justify-center space-x-8 ${className}`}>
			{STATIC_CATEGORIES.map((category) => (
				<Link
					key={category.id}
					href={`/category/${category.slug}`}
					className="text-sm font-medium text-gray-700 hover:text-[#ff5b5b] transition-colors"
				>
					{category.name}
				</Link>
			))}
		</div>
	);
}

