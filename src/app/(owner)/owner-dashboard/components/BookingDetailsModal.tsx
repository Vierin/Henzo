'use client';

import { Booking } from '@/types';
import { formatDateSafe, formatTimeSafe } from '@/utils/date';

interface BookingDetailsModalProps {
	isOpen: boolean;
	booking: Booking | null;
	onClose: () => void;
	onEdit: (booking: Booking) => void;
	onCancel: (bookingId: string) => void;
}

export default function BookingDetailsModal({
	isOpen,
	booking,
	onClose,
	onEdit,
	onCancel,
}: BookingDetailsModalProps) {
	if (!isOpen || !booking) return null;

	const getStatusBadge = (status: string) => {
		switch (status) {
			case 'CONFIRMED':
				return (
					<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
						Confirmed
					</span>
				);
			case 'PASSED':
				return (
					<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
						Completed
					</span>
				);
			case 'CANCELED':
				return (
					<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
						Cancelled
					</span>
				);
			default:
				return (
					<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
						{status}
					</span>
				);
		}
	};

	return (
		<div
			className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50 p-4"
			role="dialog"
			aria-modal="true"
			aria-labelledby="booking-details-title"
			aria-describedby="booking-details-description"
		>
			<div className="bg-white rounded-xl max-w-md w-full max-h-[75vh] mt-20 flex flex-col">
				{/* Header */}
				<div className="flex items-center justify-between py-3 px-6 border-b border-gray-200 flex-shrink-0">
					<h2
						id="booking-details-title"
						className="text-xl font-semibold text-gray-900"
					>
						Reservation Details
					</h2>
					<button
						onClick={onClose}
						className="text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 rounded"
						aria-label="Close reservation details"
					>
						<svg
							className="w-6 h-6"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-hidden="true"
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

				{/* Content */}
				<div
					id="booking-details-description"
					className="py-2 space-y-3 px-6 overflow-y-auto flex-1"
				>
					{/* Client Information */}
					<div className="border-b border-gray-200 pb-2">
						<h3 className="text-sm font-bold text-gray-700 mb-2">
							Client Information
						</h3>
						<div className="space-y-1">
							<p className="text-gray-900">
								<strong>Name:</strong>{' '}
								{booking.user?.name || `Client ID: ${booking.userId}`}
							</p>
							{booking.user?.email && (
								<p className="text-gray-900">
									<strong>Email:</strong> {booking.user.email}
								</p>
							)}
							{booking.user?.phone && (
								<p className="text-gray-900">
									<strong>Phone:</strong> {booking.user.phone}
								</p>
							)}
						</div>
					</div>

					{/* Service Information */}
					<div className="border-b border-gray-200 pb-2">
						<h3 className="text-sm font-bold text-gray-700 mb-2">
							Service Information
						</h3>
						<div className="space-y-1">
							<p className="text-gray-900">
								<strong>Service:</strong>{' '}
								{booking.service?.name || 'Unknown Service'}
							</p>
							{booking.service?.description && (
								<p className="text-gray-900">
									<strong>Description:</strong> {booking.service.description}
								</p>
							)}
							{booking.service?.duration && (
								<p className="text-gray-900">
									<strong>Duration:</strong> {booking.service.duration} minutes
								</p>
							)}
							{booking.service?.price && (
								<p className="text-gray-900">
									<strong>Price:</strong> ${booking.service.price}
								</p>
							)}
						</div>
					</div>

					{/* Staff Information */}
					<div className="border-b border-gray-200 pb-2">
						<h3 className="text-sm font-bold text-gray-700 mb-2">
							Staff Information
						</h3>
						<p className="text-gray-900">
							<strong>Assigned to:</strong>{' '}
							{booking.staff?.name || 'Unassigned'}
						</p>
					</div>

					{/* Appointment Details */}
					<div className="border-b border-gray-200 pb-2">
						<h3 className="text-sm font-bold text-gray-700 mb-2">
							Appointment Details
						</h3>
						<div className="space-y-1">
							<p className="text-gray-900">
								<strong>Date:</strong> {formatDateSafe(booking.time)}
							</p>
							<p className="text-gray-900">
								<strong>Time:</strong> {formatTimeSafe(booking.time)}
							</p>
							<p className="text-gray-900">
								<strong>Status:</strong> {getStatusBadge(booking.status)}
							</p>
						</div>
					</div>

					{/* Notes */}
					{booking.notes && (
						<div>
							<h3 className="text-sm font-bold text-gray-700 mb-2">Notes</h3>
							<p className="text-gray-900 bg-gray-50 p-3 rounded-lg">
								{booking.notes}
							</p>
						</div>
					)}
				</div>

				{/* Actions */}
				<div
					className="flex items-center justify-end gap-3 px-6 py-3 border-t border-gray-200 flex-shrink-0"
					role="group"
					aria-label="Reservation actions"
				>
					<button
						onClick={onClose}
						className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
						aria-label="Close"
					>
						Close
					</button>
					{booking.status === 'CONFIRMED' && (
						<>
							<button
								onClick={() => onEdit(booking)}
								className="px-4 py-2 text-sm font-medium text-white bg-[#ea4b4b] rounded-lg hover:bg-[#d43d3d] transition-colors focus:outline-none focus:ring-2 focus:ring-[#ea4b4b] focus:ring-offset-2 flex items-center gap-2"
								aria-label="Edit reservation"
							>
								<svg
									className="w-4 h-4"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
									aria-hidden="true"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
									/>
								</svg>
								Edit
							</button>
							<button
								onClick={() => onCancel(booking.id)}
								className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 flex items-center gap-2"
								aria-label="Cancel reservation"
							>
								<svg
									className="w-4 h-4"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
									aria-hidden="true"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
									/>
								</svg>
								Cancel
							</button>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
