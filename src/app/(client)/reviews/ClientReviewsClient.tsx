'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Star } from 'lucide-react';

interface Review {
	id: string;
	rating: number;
	comment?: string;
	createdAt: string;
	salon: {
		id: string;
		name: string;
	};
	booking?: {
		id: string;
		service: {
			name: string;
		};
	};
}

export default function ClientReviewsClient() {
	const [reviews, setReviews] = useState<Review[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		fetchReviews();
	}, []);

	const fetchReviews = async () => {
		try {
			setLoading(true);
			const data = await apiClient.get<Review[]>('/reviews/user');
			setReviews(data);
		} catch (err) {
			console.error('Failed to fetch reviews:', err);
			setError(err instanceof Error ? err.message : 'Failed to load reviews');
		} finally {
			setLoading(false);
		}
	};

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
				<LoadingSpinner size="lg" message="Loading your reviews..." />
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
					Error loading reviews
				</h3>
				<p className="text-gray-600">{error}</p>
			</div>
		);
	}

	return (
		<main role="main" aria-labelledby="reviews-heading">
			<header className="mb-8">
				<h1 id="reviews-heading" className="text-3xl font-bold text-gray-900">
					Your Reviews
				</h1>
				<p className="text-gray-600 mt-2">
					See all the reviews you've left for salons
				</p>
			</header>

			{reviews.length === 0 ? (
				<div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
					<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
						<Star className="w-8 h-8 text-gray-400" />
					</div>
					<h3 className="text-lg font-semibold text-gray-900 mb-2">
						No reviews yet
					</h3>
					<p className="text-gray-600 mb-6">
						Complete a booking to leave your first review
					</p>
					<a
						href="/dashboard"
						className="inline-block bg-[#ff5b5b] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#e04a4a] transition-colors"
					>
						View Your Bookings
					</a>
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
										{review.salon.name}
									</h3>
									{review.booking && (
										<p className="text-sm text-gray-600">
											{review.booking.service.name}
										</p>
									)}
								</div>
								<div className="text-sm text-gray-500">
									{new Date(review.createdAt).toLocaleDateString('en-US', {
										month: 'short',
										day: 'numeric',
										year: 'numeric',
									})}
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
		</main>
	);
}
