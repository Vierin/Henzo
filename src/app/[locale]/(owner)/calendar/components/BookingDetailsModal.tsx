'use client';

import { Booking } from '@/types';
import { formatDateSafe, formatTimeSafe } from '@/utils/date';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOwnerLayout } from '@/contexts/OwnerLayoutContext';

interface BookingDetailsModalProps {
	booking: Booking | null;
	isOpen: boolean;
	onClose: () => void;
	onEdit?: (booking: Booking) => void;
	onCancel?: (bookingId: string) => void;
	onMarkAsNoShow?: (bookingId: string) => void;
}

export default function BookingDetailsModal({
	booking,
	isOpen,
	onClose,
	onEdit,
	onCancel,
	onMarkAsNoShow,
}: BookingDetailsModalProps) {
	const { t, language } = useLanguage();
	const { salonData } = useOwnerLayout();
	const salonTimezone = salonData?.timezone || 'Asia/Ho_Chi_Minh';
	if (!isOpen || !booking) return null;

	const getStatusBadge = (status: string) => {
		switch (status) {
			case 'PENDING':
				return (
					<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
						{t('owner.pending')}
					</span>
				);
			case 'CONFIRMED':
				return (
					<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
						{t('owner.confirmed')}
					</span>
				);
			case 'COMPLETED':
				return (
					<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-100 dark:text-blue-800">
						{t('owner.completed')}
					</span>
				);
			case 'CANCELED':
				return (
					<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
						{t('owner.cancelled')}
					</span>
				);
			case 'NOSHOW':
				return (
					<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
						{t('owner.noShow')}
					</span>
				);
			default:
				return (
					<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
						{status}
					</span>
				);
		}
	};

	const canEdit =
		booking.status !== 'CANCELED' &&
		booking.status !== 'COMPLETED' &&
		booking.status !== 'NOSHOW';
	const canCancel =
		booking.status === 'CONFIRMED' || booking.status === 'PENDING';
	const canMarkAsNoShow = booking.status === 'COMPLETED';

	return (
		<div
			className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
			onClick={onClose}
		>
			<div
				className="bg-white rounded-xl max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-xl"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div className="flex items-center justify-between p-4 border-b border-gray-200">
					<h2 className="text-lg font-semibold text-gray-900">
						{t('owner.calendar.bookingDetails')}
					</h2>
					<button
						onClick={onClose}
						className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
						aria-label={t('owner.calendar.closeModal')}
					>
						<svg
							className="w-5 h-5 text-gray-500"
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
				<div className="p-4 space-y-4">
					{/* Status */}
					<div>
						<label className="text-xs font-medium text-gray-500 block mb-1">
							{t('owner.calendar.status')}
						</label>
						{getStatusBadge(booking.status)}
					</div>

					{/* Date & Time */}
					<div className="grid grid-cols-2 gap-3">
						<div>
							<label className="text-xs font-medium text-gray-500 block mb-1">
								{t('owner.calendar.date')}
							</label>
							<p className="text-sm font-semibold text-gray-900">
								{formatDateSafe(booking.time, 'Date not available', language)}
							</p>
						</div>
						<div>
							<label className="text-xs font-medium text-gray-500 block mb-1">
								{t('owner.calendar.time')}
							</label>
							<p className="text-sm font-semibold text-gray-900">
								{formatTimeSafe(booking.time, 'Time not available', salonTimezone)}
							</p>
						</div>
					</div>

					{/* Service */}
					<div>
						<label className="text-xs font-medium text-gray-500 block mb-1">
							{t('owner.calendar.service')}
						</label>
						<p className="text-sm font-semibold text-gray-900">
							{booking.service?.name || t('owner.unknownService')}
						</p>
						{booking.service?.description && (
							<p className="text-xs text-gray-600 mt-1 line-clamp-2">
								{booking.service.description}
							</p>
						)}
						<div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
							{booking.service?.duration && (
								<span>{booking.service.duration} min</span>
							)}
							{booking.service?.price && (
								<span>{booking.service.price.toLocaleString()}₫</span>
							)}
						</div>
					</div>

					{/* Client & Staff */}
					<div className="grid grid-cols-2 gap-3">
						<div>
							<label className="text-xs font-medium text-gray-500 block mb-1">
								{t('owner.calendar.client')}
							</label>
							<p className="text-sm font-semibold text-gray-900">
								{booking.user?.name ||
									`${t('owner.calendar.clientId')} ${booking.userId}`}
							</p>
							{booking.user?.email && (
								<p className="text-xs text-gray-600 mt-0.5">
									{booking.user.email}
								</p>
							)}
							{booking.user?.phone && (
								<p className="text-xs text-gray-600">{booking.user.phone}</p>
							)}
						</div>

						{booking.staff && (
							<div>
								<label className="text-xs font-medium text-gray-500 block mb-1">
									{t('owner.calendar.staffMember')}
								</label>
								<p className="text-sm font-semibold text-gray-900">
									{booking.staff.name}
								</p>
							</div>
						)}
					</div>

					{/* Notes */}
					{booking.notes && (
						<div>
							<label className="text-xs font-medium text-gray-500 block mb-1">
								{t('owner.calendar.notes')}
							</label>
							<p className="text-xs text-gray-700 bg-gray-50 p-2 rounded-lg">
								{booking.notes}
							</p>
						</div>
					)}
				</div>

				{/* Actions */}
				<div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 bg-gray-50">
					<button
						onClick={onClose}
						className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
					>
						{t('owner.calendar.close')}
					</button>
					{canEdit && onEdit && (
						<button
							onClick={() => {
								onEdit(booking);
								onClose();
							}}
							className="px-3 py-1.5 text-xs font-medium text-white bg-[#ff5b5b] rounded-lg hover:bg-[#e04a4a] transition-colors"
						>
							{t('owner.edit')}
						</button>
					)}
					{canCancel && onCancel && (
						<button
							onClick={() => {
								if (confirm(t('owner.areYouSureCancel'))) {
									onCancel(booking.id);
									onClose();
								}
							}}
							className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
						>
							{t('owner.cancel')}
						</button>
					)}
					{canMarkAsNoShow && onMarkAsNoShow && (
						<button
							onClick={() => {
								if (confirm(t('owner.areYouSureNoShow'))) {
									onMarkAsNoShow(booking.id);
									onClose();
								}
							}}
							className="px-3 py-1.5 text-xs font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors"
						>
							{t('owner.markAsNoShow')}
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
