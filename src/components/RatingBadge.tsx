'use client';

import { Star } from 'lucide-react';
import { calculateAverageRating, getReviewCount } from '@/utils/salonUtils';
import { Salon } from '@/types';

interface RatingBadgeProps {
	salon: Salon | { avgRating?: number; reviewCount?: number; reviews?: any[]; _count?: { Review?: number; reviews?: number } };
	variant?: 'badge' | 'inline';
	showReviewCount?: boolean;
	className?: string;
}

export default function RatingBadge({
	salon,
	variant = 'badge',
	showReviewCount = true,
	className = '',
}: RatingBadgeProps) {
	// Support multiple data formats:
	// 1. If avgRating is provided directly, use it
	// 2. Otherwise, calculate from reviews array
	const avgRating = (salon as any).avgRating;
	const rating = avgRating !== undefined && avgRating !== null
		? Number(avgRating)
		: calculateAverageRating(salon as Salon);
	
	// Support multiple formats for review count:
	// 1. reviewCount field
	// 2. _count.Review or _count.reviews
	// 3. reviews array length
	const reviewCount = (salon as any).reviewCount !== undefined
		? (salon as any).reviewCount
		: (salon as any)._count?.Review !== undefined
			? (salon as any)._count.Review
			: (salon as any)._count?.reviews !== undefined
				? (salon as any)._count.reviews
				: getReviewCount(salon as Salon);

	// Only show badge if rating is greater than 0
	if (!rating || rating <= 0 || isNaN(rating)) {
		return null;
	}

	if (variant === 'badge') {
		return (
			<div
				className={`absolute top-3 right-3 bg-white rounded-full px-3 py-1 shadow-md flex items-center gap-1 ${className}`}
			>
				<Star className="w-4 h-4 text-[#ff5b5b] fill-[#ff5b5b]" />
				<span className="text-sm font-semibold text-gray-900">
					{rating.toFixed(1)}
					{showReviewCount && ` (${reviewCount})`}
				</span>
			</div>
		);
	}

	// inline variant
	return (
		<div className={`flex items-center gap-1 ${className}`}>
			<Star className="w-4 h-4 text-[#ff5b5b] fill-[#ff5b5b]" />
			<span className="text-sm font-semibold text-gray-900">
				{rating.toFixed(1)}
			</span>
			{showReviewCount && (
				<span className="text-sm text-gray-500">({reviewCount})</span>
			)}
		</div>
	);
}

