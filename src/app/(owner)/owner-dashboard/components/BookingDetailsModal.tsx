'use client';

import { Booking } from '@/types';
import { formatDateSafe, formatTimeSafe } from '@/utils/date';

interface BookingDetailsModalProps {
	booking: Booking | null;
	isOpen: boolean;
	onClose: () => void;
	onEdit?: (booking: Booking) => void;
	onCancel?: (bookingId: string) => void;
}

export default function BookingDetailsModal({
	booking,
	isOpen,
	onClose,
	onEdit,
	onCancel,
}: BookingDetailsModalProps) {
	if (!isOpen || !booking) return null;

	const getStatusBadge = (status: string) => {
		switch (status) {
			case 'PENDING':
				return (
					<span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
						Pending
					</span>
				);
			case 'CONFIRMED':
				return (
					<span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
						Confirmed
					</span>
				);
			case 'COMPLETED':
				return (
					<span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
						Completed
					</span>
				);
			case 'CANCELED':
				return (
					<span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
						Cancelled
					</span>
				);
			default:
				return (
					<span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
						{status}
					</span>
				);
		}
	};

	const canEdit =
		booking.status !== 'CANCELED' && booking.status !== 'COMPLETED';
	const canCancel =
		booking.status === 'CONFIRMED' || booking.status === 'PENDING';

	return (
		<div
			className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
			onClick={onClose}
		>
			<div
				className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-gray-200">
					<h2 className="text-2xl font-bold text-gray-900">Booking Details</h2>
					<button
						onClick={onClose}
						className="p-2 hover:bg-gray-100 rounded-full transition-colors"
						aria-label="Close modal"
					>
						<svg
							className="w-6 h-6 text-gray-500"
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

				{/* Content */}
				<div className="p-6 space-y-6">
					{/* Status */}
					<div>
						<label className="text-sm font-medium text-gray-500 block mb-2">
							Status
						</label>
						{getStatusBadge(booking.status)}
					</div>

					{/* Date & Time */}
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="text-sm font-medium text-gray-500 block mb-2">
								Date
							</label>
							<p className="text-base font-semibold text-gray-900">
								{formatDateSafe(booking.time)}
							</p>
						</div>
						<div>
							<label className="text-sm font-medium text-gray-500 block mb-2">
								Time
							</label>
							<p className="text-base font-semibold text-gray-900">
								{formatTimeSafe(booking.time)}
							</p>
						</div>
					</div>

					{/* Service */}
					<div>
						<label className="text-sm font-medium text-gray-500 block mb-2">
							Service
						</label>
						<p className="text-base font-semibold text-gray-900">
							{booking.service?.name || 'Unknown Service'}
						</p>
						{booking.service?.description && (
							<p className="text-sm text-gray-600 mt-1">
								{booking.service.description}
							</p>
						)}
						<div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
							{booking.service?.duration && (
								<span>Duration: {booking.service.duration} min</span>
							)}
							{booking.service?.price && (
								<span>Price: ${booking.service.price}</span>
							)}
						</div>
					</div>

					{/* Client */}
					<div>
						<label className="text-sm font-medium text-gray-500 block mb-2">
							Client
						</label>
						<p className="text-base font-semibold text-gray-900">
							{booking.user?.name || `Client ID: ${booking.userId}`}
						</p>
						{booking.user?.email && (
							<p className="text-sm text-gray-600 mt-1">{booking.user.email}</p>
						)}
						{booking.user?.phone && (
							<p className="text-sm text-gray-600">{booking.user.phone}</p>
						)}
					</div>

					{/* Staff */}
					{booking.staff && (
						<div>
							<label className="text-sm font-medium text-gray-500 block mb-2">
								Staff Member
							</label>
							<p className="text-base font-semibold text-gray-900">
								{booking.staff.name}
							</p>
						</div>
					)}

					{/* Notes */}
					{booking.notes && (
						<div>
							<label className="text-sm font-medium text-gray-500 block mb-2">
								Notes
							</label>
							<p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
								{booking.notes}
							</p>
						</div>
					)}

					{/* Booking ID */}
					<div>
						<label className="text-sm font-medium text-gray-500 block mb-2">
							Booking ID
						</label>
						<p className="text-sm text-gray-600 font-mono">{booking.id}</p>
					</div>
				</div>

				{/* Actions */}
				<div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
					<button
						onClick={onClose}
						className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
					>
						Close
					</button>
					{canEdit && onEdit && (
						<button
							onClick={() => {
								onEdit(booking);
								onClose();
							}}
							className="px-4 py-2 text-sm font-medium text-white bg-[#ff5b5b] rounded-lg hover:bg-[#e04a4a] transition-colors"
						>
							Edit Booking
						</button>
					)}
					{canCancel && onCancel && (
						<button
							onClick={() => {
								if (confirm('Are you sure you want to cancel this booking?')) {
									onCancel(booking.id);
									onClose();
								}
							}}
							className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
						>
							Cancel Booking
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
