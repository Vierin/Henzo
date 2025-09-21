'use client';

interface Review {
	id: string;
	salonName: string;
	visitDate: string;
	service: string;
	rating: number;
	comment: string;
}

interface ReviewCardProps {
	review: Review;
	onEdit?: (review: Review) => void;
	onDelete?: (review: Review) => void;
}

export default function ReviewCard({
	review,
	onEdit,
	onDelete,
}: ReviewCardProps) {
	const renderStars = (rating: number) => {
		return Array.from({ length: 5 }, (_, i) => (
			<span
				key={i}
				className={`text-lg ${
					i < rating ? 'text-yellow-400' : 'text-gray-300'
				}`}
			>
				★
			</span>
		));
	};

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});
	};

	return (
		<div className="bg-white rounded-xl p-6 shadow-sm">
			<div className="flex justify-between items-start mb-4">
				<div>
					<h3 className="text-lg font-semibold text-gray-900 mb-1">
						{review.salonName}
					</h3>
					<p className="text-gray-600 text-sm mb-1">{review.service}</p>
					<p className="text-gray-500 text-xs">
						{formatDate(review.visitDate)}
					</p>
				</div>
				<div className="flex">{renderStars(review.rating)}</div>
			</div>

			<p className="text-gray-700 text-sm mb-4 leading-relaxed">
				{review.comment}
			</p>

			<div className="flex gap-2">
				<button
					onClick={() => onEdit?.(review)}
					className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
				>
					Edit
				</button>
				<button
					onClick={() => onDelete?.(review)}
					className="text-red-600 hover:text-red-800 text-sm font-medium transition-colors"
				>
					Delete
				</button>
			</div>
		</div>
	);
}
