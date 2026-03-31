'use client';

import { useState, useEffect } from 'react';
import { Star, X } from 'lucide-react';
import { useCreateReview, useUpdateReview } from '@/hooks/useClient';
import { toast } from 'react-hot-toast';
import { useTranslation } from '@/contexts/LanguageContext';

interface ReviewModalProps {
	isOpen: boolean;
	onClose: () => void;
	salonId: string;
	salonName: string;
	bookingId?: string;
	serviceName?: string;
	reviewId?: string; // For editing existing review
	initialRating?: number; // For editing existing review
	initialComment?: string; // For editing existing review
}

export default function ReviewModal({
	isOpen,
	onClose,
	salonId,
	salonName,
	bookingId,
	serviceName,
	reviewId,
	initialRating,
	initialComment,
}: ReviewModalProps) {
	const t = useTranslation();
	const [rating, setRating] = useState(initialRating || 0);
	const [hoveredRating, setHoveredRating] = useState(0);
	const [comment, setComment] = useState(initialComment || '');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const createReviewMutation = useCreateReview();
	const updateReviewMutation = useUpdateReview();
	const isEditing = !!reviewId;

	// Update form when initial values change
	useEffect(() => {
		if (isOpen) {
			setRating(initialRating || 0);
			setComment(initialComment || '');
		}
	}, [isOpen, initialRating, initialComment]);

	const handleRatingClick = (newRating: number) => {
		setRating(newRating);
	};

	const handleStarHover = (starValue: number) => {
		setHoveredRating(starValue);
	};

	const handleStarLeave = () => {
		setHoveredRating(0);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (rating === 0) {
			toast.error(t('client.reviews.pleaseSelectRating'));
			return;
		}

		setIsSubmitting(true);
		try {
			if (isEditing && reviewId) {
				await updateReviewMutation.mutateAsync({
					reviewId,
					rating,
					comment: comment.trim() || undefined,
				});
			} else {
				await createReviewMutation.mutateAsync({
					salonId,
					bookingId,
					rating,
					comment: comment.trim() || undefined,
				});
			}

			onClose();

			// Reset form
			if (!isEditing) {
				setRating(0);
				setComment('');
			}
		} catch (error) {
			console.error('Failed to submit review:', error);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleClose = () => {
		if (!isSubmitting) {
			onClose();
			// Reset form when closing (only if not editing)
			if (!isEditing) {
				setRating(0);
				setComment('');
			}
		}
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black/60 bg-opacity-50 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-gray-200">
					<h2 className="text-xl font-semibold text-gray-900">
						{isEditing
							? t('client.reviews.editReview')
							: t('client.reviews.leaveReview')}
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
					<div className="mb-6 relative">
						<label className="block text-sm font-medium text-gray-700 mb-3">
							{t('client.reviews.howWasYourExperience')} *
						</label>
						<div className="flex">
							{[1, 2, 3, 4, 5].map((star) => {
								const displayRating = hoveredRating || rating;
								const isFilled = star <= displayRating;
								return (
									<button
										key={star}
										type="button"
										onClick={() => handleRatingClick(star)}
										onMouseEnter={() => handleStarHover(star)}
										onMouseLeave={handleStarLeave}
										disabled={isSubmitting}
										className="transition-colors px-[2px] disabled:opacity-50"
									>
										<Star
											className={`w-8 h-8 ${
												isFilled
													? 'text-[#ff5b5b] fill-[#ff5b5b]'
													: 'text-gray-300'
											}`}
										/>
									</button>
								);
							})}
						</div>
						{rating > 0 && (
							<p className="text-sm text-gray-600 absolute top-0 right-0">
								{rating === 1 && t('client.reviews.rating1')}
								{rating === 2 && t('client.reviews.rating2')}
								{rating === 3 && t('client.reviews.rating3')}
								{rating === 4 && t('client.reviews.rating4')}
								{rating === 5 && t('client.reviews.rating5')}
							</p>
						)}
					</div>

					{/* Comment */}
					<div className="mb-6">
						<label
							htmlFor="comment"
							className="block text-sm font-medium text-gray-700 mb-2"
						>
							{t('client.reviews.shareYourExperience')}
						</label>
						<textarea
							id="comment"
							value={comment}
							onChange={(e) => setComment(e.target.value)}
							disabled={isSubmitting}
							rows={4}
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent disabled:opacity-50 disabled:bg-gray-100"
							placeholder={t('client.reviews.commentPlaceholder')}
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
							{t('common.cancel')}
						</button>
						<button
							type="submit"
							disabled={isSubmitting || rating === 0}
							className="bg-[#ff5b5b] text-white px-6 py-2 rounded-lg font-medium hover:bg-[#e04a4a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
						>
							{isSubmitting ? (
								<>
									<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
									{t('client.reviews.submitting')}
								</>
							) : isEditing ? (
								t('client.reviews.updateReview')
							) : (
								t('client.reviews.submitReview')
							)}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
