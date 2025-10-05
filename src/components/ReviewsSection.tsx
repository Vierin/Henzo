import { Review } from '@/types';
import ReviewCard from './ReviewCard';
import { calculateAverageRating, getReviewCount } from '@/utils/salonUtils';
import { Star } from 'lucide-react';

interface ReviewsSectionProps {
	reviews: Review[];
	className?: string;
}

export default function ReviewsSection({
	reviews,
	className = '',
}: ReviewsSectionProps) {
	const averageRating = calculateAverageRating({ reviews } as any);
	const reviewCount = getReviewCount({ reviews } as any);

	if (!reviews || reviews.length === 0) {
		return (
			<div className={`${className}`}>
				<p className="text-gray-500 text-center py-8">
					No reviews yet. Be the first to review this salon!
				</p>
			</div>
		);
	}

	const renderStars = (rating: number) => {
		return Array.from({ length: 5 }, (_, index) => (
			<Star
				key={index}
				size={18}
				className={
					index < Math.floor(rating)
						? 'text-[#ff5b5b] fill-[#ff5b5b]'
						: 'text-gray-300'
				}
			/>
		));
	};

	return (
		<div className={`${className}`}>
			<div className="flex items-center justify-between mb-6">
				<h3 className="text-lg font-semibold text-gray-900">Reviews</h3>
				<div className="flex items-center space-x-2">
					<div className="flex items-center space-x-1">
						{renderStars(averageRating)}
					</div>
					<span className="text-sm font-medium text-gray-900">
						{averageRating.toFixed(1)}
					</span>
					<span className="text-sm text-gray-500">
						({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
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
