'use client';

import SalonImage from '@/components/SalonImage';
import { isPastDate, formatBookingDateTime, getDateBadge } from '@/utils/date';
import { useState } from 'react';
import { useTranslation } from '@/contexts/LanguageContext';
import Link from 'next/link';

interface VisitHistory {
	id: string;
	salonName: string;
	serviceName: string;
	date: string;
	image: string;
	time?: string; // ISO string for comparison
	status?: string;
	salonId?: string;
	serviceId?: string;
	staffName?: string;
	// Additional fields for review functionality
	salon?: {
		id: string;
		name: string;
	};
	service?: {
		id: string;
		name: string;
	};
}

interface VisitHistoryCardProps {
	visit: VisitHistory;
	onBookAgain?: (visit: VisitHistory) => void;
	onCancel?: (visit: VisitHistory) => void;
	onLeaveReview?: (visit: VisitHistory) => void;
	isUpcoming?: boolean; // Whether this is an upcoming appointment
	hasReview?: boolean; // Whether the user has already left a review for this booking
}

export default function VisitHistoryCard({
	visit,
	onBookAgain,
	onCancel,
	onLeaveReview,
	isUpcoming = false,
	hasReview = false,
}: VisitHistoryCardProps) {
	const t = useTranslation();
	const [showCancelConfirm, setShowCancelConfirm] = useState(false);

	const handleBookAgain = () => {
		onBookAgain?.(visit);
	};

	const handleCancel = () => {
		setShowCancelConfirm(true);
	};

	const confirmCancel = () => {
		onCancel?.(visit);
		setShowCancelConfirm(false);
	};

	const handleLeaveReview = () => {
		onLeaveReview?.(visit);
	};

	// Check if appointment time has passed
	const isPast = isPastDate(visit.time);

	// Format date and time
	const { date: formattedDate, time: formattedTime } = formatBookingDateTime(
		visit.time
	);

	// Get date badge
	const dateBadge = getDateBadge(visit.time);

	// Get status badge
	const getStatusBadge = (status?: string) => {
		switch (status) {
			case 'CONFIRMED':
				return { text: t('client.dashboard.confirmed'), className: 'bg-green-100 text-green-800' };
			case 'PENDING':
				return { text: t('client.dashboard.pending'), className: 'bg-yellow-100 text-yellow-800' };
			case 'CANCELED':
				return { text: t('client.dashboard.canceled'), className: 'bg-red-100 text-red-800' };
		case 'COMPLETED':
			return { text: t('client.dashboard.completed'), className: 'bg-blue-100 text-blue-800 dark:bg-blue-100 dark:text-blue-800' };
		case 'NOSHOW':
			return { text: t('client.dashboard.noShow'), className: 'bg-orange-100 text-orange-800' };
		default:
			return null;
		}
	};

	const statusBadge = getStatusBadge(visit.status);

	return (
		<>
			<div className="relative bg-white rounded-xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
				<div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
					{/* Service Image */}
					<div className="w-full sm:w-32 aspect-[4/3] rounded-lg flex-shrink-0">
						<SalonImage
							src={visit.image}
							alt={visit.salonName}
							width={128}
							height={96}
							className="w-full h-full object-cover rounded-lg"
						/>
					</div>

					{/* Service Info */}
					<div className="flex-1 min-w-0 w-full sm:w-auto">
						<div className="flex items-start justify-between mb-2 gap-2">
							{visit.salonId ? (
								<Link
									href={`/salon/${visit.salonId}`}
									className="text-base sm:text-lg font-semibold text-gray-900 truncate flex-1 hover:text-[#ff5b5b] transition-colors"
								>
									{visit.salonName}
								</Link>
							) : (
								<h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate flex-1">
									{visit.salonName}
								</h3>
							)}
							{dateBadge && (
								<span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full flex-shrink-0">
									{dateBadge}
								</span>
							)}
							{statusBadge && (
								<span
									className={`sm:hidden text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${statusBadge.className}`}
								>
									{statusBadge.text}
								</span>
							)}
						</div>

						<p className="text-gray-600 text-sm mb-1">{visit.serviceName}</p>

						{visit.staffName && (
							<p className="text-gray-500 text-sm mb-2">
								{t('client.dashboard.with')} {visit.staffName}
							</p>
						)}

						<div className="flex items-center gap-4 mb-3 sm:mb-0">
							<div>
								<p className="text-gray-500 text-xs">{formattedDate}</p>
								<p className="text-gray-700 text-sm font-medium">
									{formattedTime}
								</p>
							</div>
						</div>

						{statusBadge && (
							<span
								className={`hidden sm:block absolute top-6 right-6 text-sm font-medium px-2.5 py-0.5 rounded-full ${statusBadge.className}`}
							>
								{statusBadge.text}
							</span>
						)}

						{/* Action Buttons - Mobile */}
						<div className="flex flex-col sm:hidden gap-2 w-full mt-2">
							{isUpcoming && !isPast ? (
								<button
									onClick={handleCancel}
									className="w-full bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
								>
									{t('client.dashboard.cancelReservation')}
								</button>
							) : (
								<div className="flex flex-col gap-2 w-full">
									<button
										onClick={handleBookAgain}
										className="w-full bg-[#ff5b5b] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#e04a4a] transition-colors"
									>
										{t('client.dashboard.bookAgain')}
									</button>
									{onLeaveReview && (
										<button
											onClick={handleLeaveReview}
											disabled={hasReview}
											className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
												hasReview
													? 'bg-gray-300 text-gray-500 cursor-not-allowed'
													: 'bg-gray-500 text-white hover:bg-gray-600'
											}`}
										>
											{hasReview ? t('client.dashboard.reviewLeft') : t('client.dashboard.leaveReview')}
										</button>
									)}
								</div>
							)}
						</div>
					</div>

					{/* Action Buttons - Desktop */}
					<div className="hidden sm:flex gap-2 flex-shrink-0 mt-auto">
						{isUpcoming && !isPast ? (
							<button
								onClick={handleCancel}
								className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
							>
								{t('client.dashboard.cancelReservation')}
							</button>
						) : (
							<div className="flex gap-2">
								<button
									onClick={handleBookAgain}
									className="bg-[#ff5b5b] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#e04a4a] transition-colors"
								>
									{t('client.dashboard.bookAgain')}
								</button>
								{onLeaveReview && (
									<button
										onClick={handleLeaveReview}
										disabled={hasReview}
										className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
											hasReview
												? 'bg-gray-300 text-gray-500 cursor-not-allowed'
												: 'bg-gray-500 text-white hover:bg-gray-600'
										}`}
									>
										{hasReview ? t('client.dashboard.reviewLeft') : t('client.dashboard.leaveReview')}
									</button>
								)}
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Cancel Confirmation Modal */}
			{showCancelConfirm && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-xl p-6 max-w-md mx-4">
						<h3 className="text-lg font-semibold text-gray-900 mb-4">
							{t('client.dashboard.cancelReservation')}
						</h3>
						<p className="text-gray-600 mb-6">
							{t('client.dashboard.cancelReservationConfirmation')}
						</p>
						<div className="flex gap-3 justify-end">
							<button
								onClick={() => setShowCancelConfirm(false)}
								className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
							>
								{t('client.dashboard.keepReservation')}
							</button>
							<button
								onClick={confirmCancel}
								className="bg-red-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-600 transition-colors"
							>
								{t('client.dashboard.yesCancel')}
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
