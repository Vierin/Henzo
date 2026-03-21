'use client';

import { Review } from '@/types';
import ReviewCard from './ReviewCard';
import { calculateAverageRating, getReviewCount } from '@/utils/salonUtils';
import { useTranslation } from '@/contexts/LanguageContext';
import { useRatingStars } from '@/hooks/useRatingStars';

interface ReviewsSectionProps {
	reviews: Review[];
	className?: string;
}

export default function ReviewsSection({
	reviews,
	className = '',
}: ReviewsSectionProps) {
	const t = useTranslation();
	const renderStars = useRatingStars(18);
	const averageRating = calculateAverageRating({ reviews } as any);
	const reviewCount = getReviewCount({ reviews } as any);

	if (!reviews || reviews.length === 0) {
		return (
			<div className={`${className}`}>
				<p className="text-gray-500 text-center py-8">
					{t.emptyStates.noReviewsYet}
				</p>
			</div>
		);
	}

	return (
		<div className={`${className}`}>
			<div className="flex items-center justify-between mb-6">
				<h3 className="text-lg font-semibold text-gray-900">{t.salon.reviews}</h3>
				<div className="flex items-center space-x-2">
					<div className="flex items-center space-x-1">
						{renderStars(averageRating)}
					</div>
					<span className="text-sm font-medium text-gray-900">
						{averageRating.toFixed(1)}
					</span>
					<span className="text-sm text-gray-500">
						({reviewCount} {reviewCount === 1 ? t.salon.reviews : t.salon.reviewsCount})
					</span>
				</div>
			</div>

			<div className="space-y-4">
				{reviews.map((review) => (
					<ReviewCard key={review.id} review={review} />
				))}
			</div>
		</div>
	);
}
