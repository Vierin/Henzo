import { Review } from '@/types';
import { Star } from 'lucide-react';

interface ReviewCardProps {
	review: Review;
	className?: string;
}

export default function ReviewCard({
	review,
	className = '',
}: ReviewCardProps) {
	const renderStars = (rating: number) => {
		return Array.from({ length: 5 }, (_, i) => {
			const starIndex = i + 1;
			let className = 'text-gray-300';
			let style = {};

			if (starIndex <= Math.floor(rating)) {
				// Полная звезда
				className = 'text-[#ff5b5b] fill-[#ff5b5b]';
			} else if (starIndex - 0.5 <= rating && rating < starIndex) {
				// Половина звезды - используем градиент
				className = 'text-gray-300';
				style = {
					background: 'linear-gradient(90deg, #ff5b5b 50%, transparent 50%)',
					WebkitBackgroundClip: 'text',
					WebkitTextFillColor: 'transparent',
					backgroundClip: 'text',
				};
			}

			return <Star key={i} size={16} className={className} style={style} />;
		});
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});
	};

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
					{formatDate(review.createdAt)}
				</span>
			</div>

			{review.comment && (
				<p className="text-sm text-gray-700 mt-2">{review.comment}</p>
			)}
		</div>
	);
}
