'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useUserReviews } from '@/hooks/useClient';
import LoadingSpinner from '@/components/LoadingSpinner';
import ReviewModal from '@/components/ReviewModal';
import { Star, Edit2 } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';

export default function ClientReviewsClient() {
	const t = useTranslation();
	const { data: reviews = [], isLoading: loading, error } = useUserReviews();
	const [editingReview, setEditingReview] = useState<{
		id: string;
		salonId: string;
		salonName: string;
		serviceName?: string;
		rating: number;
		comment?: string;
	} | null>(null);

	const renderStars = (rating: number) => {
		return Array.from({ length: 5 }, (_, i) => (
			<Star
				key={i}
				className={`w-5 h-5 ${
					i < rating ? 'fill-[#ff5b5b] text-[#ff5b5b]' : 'text-gray-300'
				}`}
			/>
		));
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<LoadingSpinner size="lg" message={t('client.reviews.loadingYourReviews')} />
			</div>
		);
	}

	if (error) {
		return (
			<div className="text-center py-12">
				<div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
					<span className="text-2xl">⚠️</span>
				</div>
				<h3 className="text-xl font-semibold text-gray-900 mb-2">
					{t('client.reviews.errorLoadingReviews')}
				</h3>
				<p className="text-gray-600">
					{error instanceof Error ? error.message : t('client.reviews.failedToLoadReviews')}
				</p>
			</div>
		);
	}

	return (
		<main role="main" aria-labelledby="reviews-heading">
			<header className="mb-8">
				<h1 id="reviews-heading" className="text-3xl font-bold text-gray-900">
					{t('client.reviews.title')}
				</h1>
				<p className="text-gray-600 mt-2">
					{t('client.reviews.subtitle')}
				</p>
			</header>

			{reviews.length === 0 ? (
				<div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
					<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
						<Star className="w-8 h-8 text-gray-400" />
					</div>
					<h3 className="text-lg font-semibold text-gray-900 mb-2">
						{t('client.reviews.noReviewsYet')}
					</h3>
					<p className="text-gray-600 mb-6">
						{t('client.reviews.noReviewsDescription')}
					</p>
					<Link
						href="/dashboard"
						className="inline-block bg-[#ff5b5b] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#e04a4a] transition-colors"
					>
						{t('client.reviews.viewYourBookings')}
					</Link>
				</div>
			) : (
				<div className="space-y-4">
					{reviews.map((review) => (
						<div
							key={review.id}
							className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
						>
							<div className="flex items-start justify-between mb-3">
								<div>
									<h3 className="text-lg font-semibold text-gray-900">
										{review.salon?.name || t('client.reviews.unknownSalon')}
									</h3>
									{review.booking?.service?.name && (
										<p className="text-sm text-gray-600">
											{review.booking.service.name}
										</p>
									)}
								</div>
								<div>
									<div className="text-sm text-gray-500 text-right">
									{new Date(review.createdAt).toLocaleDateString('en-US', {
										month: 'short',
										day: 'numeric',
										year: 'numeric',
									})}
								</div>
								<div className="flex justify-end">
								<button
									onClick={() =>
										setEditingReview({
											id: review.id,
											salonId: review.salonId,
											salonName: review.salon?.name || t('client.reviews.unknownSalon'),
											serviceName: review.booking?.service?.name,
											rating: review.rating,
											comment: review.comment,
										})
									}
									className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-[#ff5b5b] transition-colors"
								>
									<Edit2 className="w-4 h-4" />
									{t('client.reviews.editReview')}
								</button>
							</div>
									</div>
							</div>

							<div className="flex items-center gap-1 mb-3">
								{renderStars(review.rating)}
							</div>

							{review.comment && (
								<p className="text-gray-700 text-sm">{review.comment}</p>
							)}
						</div>
					))}
				</div>
			)}

			{/* Edit Review Modal */}
			{editingReview && (
				<ReviewModal
					isOpen={!!editingReview}
					onClose={() => setEditingReview(null)}
					salonId={editingReview.salonId}
					salonName={editingReview.salonName}
					serviceName={editingReview.serviceName}
					reviewId={editingReview.id}
					initialRating={editingReview.rating}
					initialComment={editingReview.comment}
				/>
			)}
		</main>
	);
}
