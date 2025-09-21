'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface ReviewModalProps {
	isOpen: boolean;
	onClose: () => void;
	salonId: string;
	salonName: string;
	bookingId?: string;
	onSuccess?: () => void;
}

export default function ReviewModal({
	isOpen,
	onClose,
	salonId,
	salonName,
	bookingId,
	onSuccess,
}: ReviewModalProps) {
	const [rating, setRating] = useState(0);
	const [comment, setComment] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState('');

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');

		if (rating === 0) {
			setError('Please select a rating');
			return;
		}

		setIsSubmitting(true);

		try {
			// Get current user session
			const {
				data: { session },
			} = await supabase.auth.getSession();

			if (!session?.access_token) {
				throw new Error('You must be logged in to leave a review');
			}

			// Submit review
			const response = await fetch('http://localhost:3001/reviews', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${session.access_token}`,
				},
				body: JSON.stringify({
					salonId,
					bookingId,
					rating,
					comment: comment.trim() || undefined,
				}),
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.message || 'Failed to submit review');
			}

			// Reset form
			setRating(0);
			setComment('');
			onClose();
			onSuccess?.();
		} catch (err: any) {
			setError(err.message);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleStarClick = (starRating: number) => {
		setRating(starRating);
	};

	const renderStars = () => {
		return Array.from({ length: 5 }, (_, i) => {
			const starRating = i + 1;
			return (
				<button
					key={i}
					type="button"
					onClick={() => handleStarClick(starRating)}
					className={`text-3xl transition-colors ${
						starRating <= rating
							? 'text-yellow-400'
							: 'text-gray-300 hover:text-yellow-200'
					}`}
				>
					★
				</button>
			);
		});
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
				<div className="flex items-center justify-between mb-6">
					<h2 className="text-2xl font-bold text-gray-800">Leave a Review</h2>
					<button
						onClick={onClose}
						className="text-gray-400 hover:text-gray-600 transition-colors"
					>
						<svg
							className="w-6 h-6"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>

				<div className="mb-6">
					<h3 className="text-lg font-semibold text-gray-800 mb-2">
						{salonName}
					</h3>
					<p className="text-gray-600 text-sm">
						Share your experience to help others
					</p>
				</div>

				<form onSubmit={handleSubmit} className="space-y-6">
					{/* Rating */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-3">
							Rating *
						</label>
						<div className="flex gap-1">{renderStars()}</div>
						{rating > 0 && (
							<p className="text-sm text-gray-600 mt-2">
								{rating} star{rating !== 1 ? 's' : ''}
							</p>
						)}
					</div>

					{/* Comment */}
					<div>
						<label
							htmlFor="comment"
							className="block text-sm font-medium text-gray-700 mb-2"
						>
							Review (optional)
						</label>
						<textarea
							id="comment"
							value={comment}
							onChange={(e) => setComment(e.target.value)}
							placeholder="Tell us about your experience..."
							className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent resize-none"
							rows={4}
							maxLength={500}
						/>
						<div className="flex justify-between text-xs text-gray-500 mt-1">
							<span>Share details about your visit</span>
							<span>{comment.length}/500</span>
						</div>
					</div>

					{/* Error */}
					{error && (
						<div className="bg-red-50 border border-red-200 rounded-lg p-3">
							<p className="text-red-600 text-sm">{error}</p>
						</div>
					)}

					{/* Buttons */}
					<div className="flex gap-3 pt-4">
						<button
							type="button"
							onClick={onClose}
							className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={isSubmitting || rating === 0}
							className="flex-1 px-4 py-3 bg-[#ff5b5b] text-white rounded-lg font-medium hover:bg-[#e04a4a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isSubmitting ? 'Submitting...' : 'Submit Review'}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
