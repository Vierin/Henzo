'use client';

import { usePathname } from 'next/navigation';
import SearchBookingForm from './SearchBookingForm';
import MobileSearchTrigger from './MobileSearchTrigger';

interface AdaptiveSearchProps {
	className?: string;
}

export default function AdaptiveSearch({
	className = '',
}: AdaptiveSearchProps) {
	const pathname = usePathname();

	// Определяем, находимся ли мы на странице категории, салона или списка салонов
	const isCategoryOrSalonPage =
		pathname.startsWith('/category/') ||
		pathname.startsWith('/salon/') ||
		pathname.startsWith('/salons');

	return (
		<div className={className}>
			{/* Mobile: Always compact trigger */}
			<div className="md:hidden">
				<MobileSearchTrigger />
			</div>
			{/* Desktop: Full form - inline for category/salon/salons pages, normal for others */}
			<div className="hidden md:block">
				<SearchBookingForm inline={isCategoryOrSalonPage} />
			</div>
		</div>
	);
}
