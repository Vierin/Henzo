'use client';

import { Review } from '@/types';
import { useRatingStars } from '@/hooks/useRatingStars';
import { useFormatLocalDate } from '@/hooks/useFormatLocalDate';

interface ReviewCardProps {
	review: Review;
	className?: string;
}

export default function ReviewCard({
	review,
	className = '',
}: ReviewCardProps) {
	const renderStars = useRatingStars(16);
	const formatLocalDate = useFormatLocalDate({ includeWeekday: false });

	return (
		<div className={`bg-white rounded-lg p-4 shadow-sm ${className}`}>
			<div className="flex items-center justify-between mb-2">
				<div className="flex items-center space-x-2">
					<div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
						<span className="text-sm font-medium text-gray-600">
							{review.user?.name?.charAt(0) || 'U'}
						</span>
					</div>
					<div>
						<p className="text-sm font-medium text-gray-900">
							{review.user?.name || 'Anonymous'}
						</p>
						<div className="flex items-center space-x-1">
							{renderStars(review.rating)}
						</div>
					</div>
				</div>
				<span className="text-xs text-gray-500">
					{formatLocalDate(review.createdAt)}
				</span>
			</div>

			{review.comment && (
				<p className="text-sm text-gray-700 mt-3">{review.comment}</p>
			)}
		</div>
	);
}
