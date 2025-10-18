'use client';

import { useState } from 'react';
import { Star, X } from 'lucide-react';
import { useCreateReview } from '@/hooks/useClient';
import { toast } from 'react-hot-toast';

interface ReviewModalProps {
	isOpen: boolean;
	onClose: () => void;
	salonId: string;
	salonName: string;
	bookingId?: string;
	serviceName?: string;
}

export default function ReviewModal({
	isOpen,
	onClose,
	salonId,
	salonName,
	bookingId,
	serviceName,
}: ReviewModalProps) {
	const [rating, setRating] = useState(0);
	const [comment, setComment] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const createReviewMutation = useCreateReview();

	const handleRatingClick = (newRating: number) => {
		setRating(newRating);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (rating === 0) {
			toast.error('Please select a rating');
			return;
		}

		setIsSubmitting(true);
		try {
			await createReviewMutation.mutateAsync({
				salonId,
				bookingId,
				rating,
				comment: comment.trim() || undefined,
			});

			onClose();

			// Reset form
			setRating(0);
			setComment('');
		} catch (error) {
			console.error('Failed to submit review:', error);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleClose = () => {
		if (!isSubmitting) {
			onClose();
			// Reset form when closing
			setRating(0);
			setComment('');
		}
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black/60 bg-opacity-50 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-gray-200">
					<h2 className="text-xl font-semibold text-gray-900">
						Leave a Review
					</h2>
					<button
						onClick={handleClose}
						disabled={isSubmitting}
						className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
					>
						<X className="w-6 h-6" />
					</button>
				</div>

				{/* Content */}
				<form onSubmit={handleSubmit} className="p-6">
					{/* Salon Info */}
					<div className="mb-6">
						<h3 className="font-medium text-gray-900 mb-1">{salonName}</h3>
						{serviceName && (
							<p className="text-sm text-gray-600">{serviceName}</p>
						)}
					</div>

					{/* Rating */}
					<div className="mb-6">
						<label className="block text-sm font-medium text-gray-700 mb-3">
							How was your experience? *
						</label>
						<div className="flex gap-1">
							{[1, 2, 3, 4, 5].map((star) => (
								<button
									key={star}
									type="button"
									onClick={() => handleRatingClick(star)}
									disabled={isSubmitting}
									className="transition-colors disabled:opacity-50"
								>
									<Star
										className={`w-8 h-8 ${
											star <= rating
												? 'text-[#ff5b5b] fill-[#ff5b5b]'
												: 'text-gray-300'
										} hover:text-[#ff5b5b] hover:fill-[#ff5b5b]`}
									/>
								</button>
							))}
						</div>
						{rating > 0 && (
							<p className="text-sm text-gray-600 mt-2">
								{rating === 1 && 'Poor'}
								{rating === 2 && 'Fair'}
								{rating === 3 && 'Good'}
								{rating === 4 && 'Very Good'}
								{rating === 5 && 'Excellent'}
							</p>
						)}
					</div>

					{/* Comment */}
					<div className="mb-6">
						<label
							htmlFor="comment"
							className="block text-sm font-medium text-gray-700 mb-2"
						>
							Share your experience (optional)
						</label>
						<textarea
							id="comment"
							value={comment}
							onChange={(e) => setComment(e.target.value)}
							disabled={isSubmitting}
							rows={4}
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent disabled:opacity-50 disabled:bg-gray-100"
							placeholder="Tell others about your experience..."
							maxLength={500}
						/>
						<div className="text-xs text-gray-500 mt-1 text-right">
							{comment.length}/500
						</div>
					</div>

					{/* Actions */}
					<div className="flex gap-3 justify-end">
						<button
							type="button"
							onClick={handleClose}
							disabled={isSubmitting}
							className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={isSubmitting || rating === 0}
							className="bg-[#ff5b5b] text-white px-6 py-2 rounded-lg font-medium hover:bg-[#e04a4a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
						>
							{isSubmitting ? (
								<>
									<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
									Submitting...
								</>
							) : (
								'Submit Review'
							)}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
