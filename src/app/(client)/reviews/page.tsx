'use client';

import { useState } from 'react';
import ReviewCard from '@/components/ReviewCard';
import ReviewModal from '@/components/ReviewModal';

interface Review {
	id: string;
	salonName: string;
	visitDate: string;
	service: string;
	rating: number;
	comment: string;
}

export default function ClientReviews() {
	const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

	// Mock data for reviews - in real app this would come from API
	const [reviews] = useState<Review[]>([
		{
			id: '1',
			salonName: 'Chic & Sleek Salon',
			visitDate: '2024-03-15',
			service: 'Haircut & Styling',
			rating: 5,
			comment:
				'Amazing service! The stylist was very professional and gave me the exact haircut I wanted. The salon has a great atmosphere. Highly recommended!',
		},
		{
			id: '2',
			salonName: 'Nail Nirvana',
			visitDate: '2024-03-10',
			service: 'Manicure',
			rating: 3,
			comment:
				'Good service overall, but the nail polish chipped after just a few days. The staff was friendly though.',
		},
		{
			id: '3',
			salonName: 'The Glow Up Studio',
			visitDate: '2024-02-28',
			service: 'Facial Treatment',
			rating: 4,
			comment:
				'Great facial treatment! My skin felt amazing afterwards. The only downside was the waiting time.',
		},
	]);

	const handleAddReview = () => {
		setIsReviewModalOpen(true);
	};

	const handleEditReview = (review: Review) => {
		console.log('Edit review:', review);
	};

	const handleDeleteReview = (review: Review) => {
		console.log('Delete review:', review);
	};

	const handleReviewSuccess = () => {
		// Refresh reviews or show success message
		console.log('Review added successfully');
	};

	return (
		<div>
			<h1 className="text-3xl font-bold text-gray-900 mb-8">Your Reviews</h1>

			{/* Pending Review Section */}
			<div className="bg-white rounded-xl p-6 shadow-sm mb-8">
				<div className="flex items-center justify-between">
					<div>
						<h2 className="text-lg font-semibold text-gray-900 mb-2">
							Pending Review
						</h2>
						<p className="text-gray-600 text-sm">
							You have a recent visit that you can review
						</p>
					</div>
					<button
						onClick={handleAddReview}
						className="bg-[#ff5b5b] text-white px-6 py-2 rounded-lg font-medium hover:bg-[#e04a4a] transition-colors"
					>
						Add Review
					</button>
				</div>
			</div>

			{/* Past Reviews Section */}
			<div>
				<h2 className="text-xl font-semibold text-gray-900 mb-6">
					Your Past Reviews
				</h2>

				{reviews.length === 0 ? (
					<div className="text-center py-12">
						<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
							<span className="text-2xl">⭐</span>
						</div>
						<h3 className="text-xl font-semibold text-gray-900 mb-2">
							No reviews yet
						</h3>
						<p className="text-gray-600">
							Your reviews will appear here once you start leaving feedback.
						</p>
					</div>
				) : (
					<div className="space-y-4">
						{reviews.map((review) => (
							<ReviewCard
								key={review.id}
								review={review}
								onEdit={handleEditReview}
								onDelete={handleDeleteReview}
							/>
						))}
					</div>
				)}
			</div>

			{/* Review Modal */}
			<ReviewModal
				isOpen={isReviewModalOpen}
				onClose={() => setIsReviewModalOpen(false)}
				salonId="1" // This would come from the pending visit
				salonName="Chic & Sleek Salon" // This would come from the pending visit
				onSuccess={handleReviewSuccess}
			/>
		</div>
	);
}
