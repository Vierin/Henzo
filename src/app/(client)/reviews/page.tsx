'use client';

import { useState } from 'react';
import ReviewCard from '@/components/ReviewCard';
import ReviewModal from '@/components/ReviewModal';
import { useUserReviews, useCompletedBookings } from '@/hooks/useClient';
import { getDatePart } from '@/utils/date';

export default function ClientReviews() {
	const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
	const [selectedBooking, setSelectedBooking] = useState<any>(null);

	const {
		data: reviews,
		isLoading: reviewsLoading,
		error: reviewsError,
	} = useUserReviews();
	const {
		data: completedBookings,
		isLoading: bookingsLoading,
		error: bookingsError,
	} = useCompletedBookings();

	// Find bookings that don't have reviews yet
	const bookingsWithoutReviews =
		completedBookings?.filter((booking) => {
			return !reviews?.some((review) => review.bookingId === booking.id);
		}) || [];

	const handleAddReview = (booking?: any) => {
		setSelectedBooking(booking);
		setIsReviewModalOpen(true);
	};

	const handleEditReview = (review: any) => {
		console.log('Edit review:', review);
	};

	const handleDeleteReview = (review: any) => {
		console.log('Delete review:', review);
	};

	const handleReviewSuccess = () => {
		// Refresh reviews or show success message
		console.log('Review added successfully');
		setIsReviewModalOpen(false);
		setSelectedBooking(null);
	};

	if (reviewsLoading || bookingsLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff5b5b]"></div>
			</div>
		);
	}

	if (reviewsError || bookingsError) {
		return (
			<div className="text-center py-12">
				<div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
					<span className="text-2xl">⚠️</span>
				</div>
				<h3 className="text-xl font-semibold text-gray-900 mb-2">
					Error loading reviews
				</h3>
				<p className="text-gray-600">
					There was an error loading your reviews. Please try again later.
				</p>
			</div>
		);
	}

	const reviewsList = reviews || [];

	return (
		<div>
			<h1 className="text-3xl font-bold text-gray-900 mb-8">Your Reviews</h1>

			{/* Pending Review Section */}
			{bookingsWithoutReviews.length > 0 && (
				<div className="bg-white rounded-xl p-6 shadow-sm mb-8">
					<div className="flex items-center justify-between">
						<div>
							<h2 className="text-lg font-semibold text-gray-900 mb-2">
								Pending Reviews
							</h2>
							<p className="text-gray-600 text-sm">
								You have {bookingsWithoutReviews.length} recent visit
								{bookingsWithoutReviews.length > 1 ? 's' : ''} that you can
								review
							</p>
						</div>
						<button
							onClick={() => handleAddReview(bookingsWithoutReviews[0])}
							className="bg-[#ff5b5b] text-white px-6 py-2 rounded-lg font-medium hover:bg-[#e04a4a] transition-colors"
						>
							Add Review
						</button>
					</div>
				</div>
			)}

			{/* Past Reviews Section */}
			<div>
				<h2 className="text-xl font-semibold text-gray-900 mb-6">
					Your Past Reviews
				</h2>

				{reviewsList.length === 0 ? (
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
						{reviewsList.map((review) => (
							<ReviewCard
								key={review.id}
								review={{
									id: review.id,
									salonName: review.salon.name,
									visitDate: getDatePart(review.booking?.time),
									service: review.booking?.service?.name || 'Service',
									rating: review.rating,
									comment: review.comment || '',
								}}
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
				onClose={() => {
					setIsReviewModalOpen(false);
					setSelectedBooking(null);
				}}
				salonId={selectedBooking?.salonId || ''}
				salonName={selectedBooking?.salon?.name || ''}
				bookingId={selectedBooking?.id}
				onSuccess={handleReviewSuccess}
			/>
		</div>
	);
}
