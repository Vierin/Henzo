'use client';

import { useState, useCallback, useMemo } from 'react';
import ReviewCard from '@/components/ReviewCard';
import ReviewModal from '@/components/ReviewModal';
import { useUserReviews, useCompletedBookings } from '@/hooks/useClient';
import { getDatePart } from '@/utils/date';

export default function ClientReviewsClient() {
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

	// Memoize bookings without reviews
	const bookingsWithoutReviews = useMemo(() => {
		return (
			completedBookings?.filter((booking) => {
				return !reviews?.some((review) => review.bookingId === booking.id);
			}) || []
		);
	}, [completedBookings, reviews]);

	const handleAddReview = useCallback((booking?: any) => {
		setSelectedBooking(booking);
		setIsReviewModalOpen(true);
	}, []);

	const handleEditReview = useCallback((review: any) => {
		console.log('Edit review:', review);
	}, []);

	const handleDeleteReview = useCallback((review: any) => {
		console.log('Delete review:', review);
	}, []);

	const handleReviewSuccess = useCallback(() => {
		console.log('Review added successfully');
		setIsReviewModalOpen(false);
		setSelectedBooking(null);
	}, []);

	const handleCloseModal = useCallback(() => {
		setIsReviewModalOpen(false);
		setSelectedBooking(null);
	}, []);

	// Loading skeleton component
	const LoadingSkeleton = () => (
		<div className="space-y-6" role="status" aria-label="Loading reviews">
			{/* Pending reviews skeleton */}
			<div className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
				<div className="flex items-center justify-between">
					<div className="flex-1 space-y-2">
						<div className="h-4 bg-gray-200 rounded w-1/3"></div>
						<div className="h-3 bg-gray-200 rounded w-2/3"></div>
					</div>
					<div className="w-24 h-10 bg-gray-200 rounded-lg"></div>
				</div>
			</div>

			{/* Reviews list skeleton */}
			{[1, 2, 3].map((i) => (
				<div
					key={i}
					className="bg-white rounded-xl p-6 shadow-sm animate-pulse"
					aria-hidden="true"
				>
					<div className="space-y-3">
						<div className="flex items-center space-x-3">
							<div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
							<div className="flex-1 space-y-2">
								<div className="h-4 bg-gray-200 rounded w-1/2"></div>
								<div className="h-3 bg-gray-200 rounded w-1/4"></div>
							</div>
						</div>
						<div className="h-4 bg-gray-200 rounded w-3/4"></div>
						<div className="h-4 bg-gray-200 rounded w-1/2"></div>
					</div>
				</div>
			))}
			<span className="sr-only">Loading your reviews...</span>
		</div>
	);

	// Error component
	const ErrorDisplay = () => (
		<div
			className="text-center py-12"
			role="alert"
			aria-labelledby="error-heading"
			aria-describedby="error-description"
		>
			<div
				className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"
				aria-hidden="true"
			>
				<span className="text-2xl">⚠️</span>
			</div>
			<h3
				id="error-heading"
				className="text-xl font-semibold text-gray-900 mb-2"
			>
				Error loading reviews
			</h3>
			<p id="error-description" className="text-gray-600 mb-4">
				There was an error loading your reviews. Please try again later.
			</p>
			<button
				onClick={() => window.location.reload()}
				className="bg-[#ff5b5b] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#e04a4a] transition-colors focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:ring-offset-2"
				aria-label="Retry loading reviews"
			>
				Try Again
			</button>
		</div>
	);

	const reviewsList = reviews || [];

	if (reviewsLoading || bookingsLoading) {
		return (
			<main role="main" aria-labelledby="reviews-heading">
				<header className="mb-8">
					<h1 id="reviews-heading" className="text-3xl font-bold text-gray-900">
						Your Reviews
					</h1>
					<p className="text-gray-600 mt-2">
						View and manage your beauty service reviews
					</p>
				</header>
				<LoadingSkeleton />
			</main>
		);
	}

	if (reviewsError || bookingsError) {
		return (
			<main role="main" aria-labelledby="reviews-heading">
				<header className="mb-8">
					<h1 id="reviews-heading" className="text-3xl font-bold text-gray-900">
						Your Reviews
					</h1>
					<p className="text-gray-600 mt-2">
						View and manage your beauty service reviews
					</p>
				</header>
				<ErrorDisplay />
			</main>
		);
	}

	return (
		<main role="main" aria-labelledby="reviews-heading">
			<header className="mb-8">
				<h1 id="reviews-heading" className="text-3xl font-bold text-gray-900">
					Your Reviews
				</h1>
				<p className="text-gray-600 mt-2">
					View and manage your beauty service reviews
				</p>
			</header>

			{/* Pending Review Section */}
			{bookingsWithoutReviews.length > 0 && (
				<section
					className="bg-white rounded-xl p-6 shadow-sm mb-8"
					aria-labelledby="pending-reviews-heading"
					role="region"
				>
					<div className="flex items-center justify-between">
						<div>
							<h2
								id="pending-reviews-heading"
								className="text-lg font-semibold text-gray-900 mb-2"
							>
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
							className="bg-[#ff5b5b] text-white px-6 py-2 rounded-lg font-medium hover:bg-[#e04a4a] transition-colors focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:ring-offset-2"
							aria-describedby="pending-reviews-description"
						>
							Add Review
						</button>
					</div>
					<div id="pending-reviews-description" className="sr-only">
						Click to add a review for your recent visit
					</div>
				</section>
			)}

			{/* Past Reviews Section */}
			<section aria-labelledby="past-reviews-heading">
				<h2
					id="past-reviews-heading"
					className="text-xl font-semibold text-gray-900 mb-6"
				>
					Your Past Reviews
				</h2>

				{reviewsList.length === 0 ? (
					<div
						className="text-center py-12"
						role="status"
						aria-labelledby="empty-heading"
						aria-describedby="empty-description"
					>
						<div
							className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4"
							aria-hidden="true"
						>
							<span className="text-2xl">⭐</span>
						</div>
						<h3
							id="empty-heading"
							className="text-xl font-semibold text-gray-900 mb-2"
						>
							No reviews yet
						</h3>
						<p id="empty-description" className="text-gray-600 mb-6">
							Your reviews will appear here once you start leaving feedback.
						</p>
						{bookingsWithoutReviews.length > 0 && (
							<button
								onClick={() => handleAddReview(bookingsWithoutReviews[0])}
								className="bg-[#ff5b5b] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#e04a4a] transition-colors focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:ring-offset-2"
								aria-label="Write your first review"
							>
								Write Your First Review
							</button>
						)}
					</div>
				) : (
					<div
						className="space-y-4"
						role="list"
						aria-label="Your past reviews"
						aria-live="polite"
					>
						{reviewsList.map((review, index) => (
							<div
								key={review.id}
								role="listitem"
								aria-posinset={index + 1}
								aria-setsize={reviewsList.length}
							>
								<ReviewCard
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
							</div>
						))}
					</div>
				)}
			</section>

			{/* Review Modal */}
			<ReviewModal
				isOpen={isReviewModalOpen}
				onClose={handleCloseModal}
				salonId={selectedBooking?.salonId || ''}
				salonName={selectedBooking?.salon?.name || ''}
				bookingId={selectedBooking?.id}
				onSuccess={handleReviewSuccess}
			/>
		</main>
	);
}
