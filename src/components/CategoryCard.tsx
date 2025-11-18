import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Category } from '@/constants/categories';

interface CategoryCardProps {
	category: Category;
	className?: string;
}

export default function CategoryCard({
	category,
	className = '',
}: CategoryCardProps) {
	const params = useParams();
	const locale = (params as any)?.locale as string | undefined;
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
					{category.name}
				</h3>
				{category.description && (
					<p className="text-gray-600 text-sm leading-relaxed">
						{category.description}
					</p>
				)}
			</div>
			<div className="absolute inset-0 bg-gradient-to-t from-red-500/0 to-red-500/0 group-hover:from-red-500/5 group-hover:to-red-500/10 transition-all duration-300 pointer-events-none" />
		</Link>
	);
}
