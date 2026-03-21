'use client';

import { Booking } from '@/types';
import { formatDateSafe, formatTimeSafe } from '@/utils/date';
import { getLocalizedServiceName } from '@/utils/serviceLocalization';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOwnerLayout } from '@/contexts/OwnerLayoutContext';
import { User, X } from 'lucide-react';

interface BookingDetailsModalProps {
	booking: Booking | null;
	isOpen: boolean;
	onClose: () => void;
	onEdit?: (booking: Booking) => void;
	onCancel?: (bookingId: string) => void;
	onMarkAsNoShow?: (bookingId: string) => void;
}

function isAnonymousBooking(booking: Booking): boolean {
	const email = booking.user?.email || '';
	const name = booking.user?.name || '';
	return (
		email.includes('@anonymous.local') ||
		email.startsWith('anonymous-') ||
		name.toLowerCase().includes('anonymous') ||
		name === 'Anonymous Client'
	);
}

function getClientLabel(booking: Booking, t: (key: string) => string): string {
	if (isAnonymousBooking(booking)) {
		return t('owner.calendar.anonymousClient');
	}
	if (booking.user?.name?.trim()) {
		return booking.user.name;
	}
	return `${t('owner.calendar.clientId')} ${booking.userId}`;
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
	const lang = (language === 'vi' || language === 'ru' ? language : 'en') as
		| 'vi'
		| 'en'
		| 'ru';

	if (!isOpen || !booking) return null;

	const getStatusBadge = (status: string) => {
		const base =
			'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold';
		switch (status) {
			case 'PENDING':
				return (
					<span
						className={`${base} bg-amber-50 text-amber-800 ring-1 ring-amber-200/60`}
					>
						{t('owner.calendar.pending')}
					</span>
				);
			case 'CONFIRMED':
				return (
					<span
						className={`${base} bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/60`}
					>
						{t('owner.calendar.confirmed')}
					</span>
				);
			case 'COMPLETED':
				return (
					<span
						className={`${base} bg-sky-50 text-sky-800 ring-1 ring-sky-200/60`}
					>
						{t('owner.calendar.completed')}
					</span>
				);
			case 'CANCELED':
				return (
					<span
						className={`${base} bg-red-50 text-red-800 ring-1 ring-red-200/60`}
					>
						{t('owner.calendar.cancelled')}
					</span>
				);
			case 'NOSHOW':
				return (
					<span
						className={`${base} bg-orange-50 text-orange-800 ring-1 ring-orange-200/60`}
					>
						{t('owner.calendar.noShow')}
					</span>
				);
			default:
				return (
					<span
						className={`${base} bg-gray-100 text-gray-800 ring-1 ring-gray-200/60`}
					>
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

	const serviceName = booking.service
		? getLocalizedServiceName(booking.service, lang)
		: t('owner.calendar.unknownService');

	const priceWithSymbol =
		booking.service?.price != null
			? `${booking.service.price.toLocaleString('vi-VN')}₫`
			: null;

	const durationPriceLine =
		booking.service?.duration != null && priceWithSymbol
			? `${booking.service.duration} ${t('owner.calendar.min')} · ${priceWithSymbol}`
			: booking.service?.duration != null
				? `${booking.service.duration} ${t('owner.calendar.min')}`
				: priceWithSymbol;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px]"
			onClick={onClose}
			role="presentation"
		>
			<div
				className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl shadow-black/10"
				onClick={(e) => e.stopPropagation()}
				role="dialog"
				aria-labelledby="booking-details-title"
			>
				{/* Header */}
				<div className="flex items-start justify-between gap-3 px-6 pt-6 pb-2">
					<h2
						id="booking-details-title"
						className="text-xl font-bold tracking-tight text-gray-900"
					>
						{t('owner.calendar.bookingDetails')}
					</h2>
					<button
						type="button"
						onClick={onClose}
						className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
						aria-label={t('owner.calendar.closeModal')}
					>
						<X className="h-5 w-5" strokeWidth={2} />
					</button>
				</div>

				{/* Status — right-aligned under header */}
				<div className="flex justify-end px-6 pb-4">
					{getStatusBadge(booking.status)}
				</div>

				<div className="space-y-6 px-6 pb-2">
					{/* Date | Time */}
					<div className="flex divide-x divide-gray-200/90">
						<div className="min-w-0 flex-1 pr-4">
							<p className="text-xs font-medium uppercase tracking-wide text-gray-500">
								{t('owner.calendar.date')}
							</p>
							<p className="mt-1 mb-0 text-sm font-bold leading-snug text-gray-900 sm:text-base">
								{formatDateSafe(booking.time, '—', language)}
							</p>
						</div>
						<div className="min-w-0 flex-1 pl-4">
							<p className="text-xs font-medium uppercase tracking-wide text-gray-500">
								{t('owner.calendar.time')}
							</p>
							<p className="mt-1 !mb-0 text-sm font-bold leading-snug text-gray-900 sm:text-base">
								{formatTimeSafe(booking.time, '—', salonTimezone)}
							</p>
						</div>
					</div>

					{/* Service */}
					<div>
						<p className="text-xs  font-medium uppercase tracking-wide text-gray-500">
							{t('owner.calendar.service')}
						</p>
						<div className="flex justify-between">
							<p className="mt-1 text-base font-bold text-gray-900">
								{serviceName}
							</p>

							{durationPriceLine && (
								<p className="mt-1 font-bold text-md text-gray-900">
									{durationPriceLine}
								</p>
							)}
						</div>
					</div>

					{/* Client & Staff */}
					<div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
						<div className="flex gap-3">
							<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#fff0ee] ring-1 ring-[#ff5b5b]/15">
								<User className="h-5 w-5 text-[#ff5b5b]" strokeWidth={1.75} />
							</div>
							<div className="min-w-0">
								<p className="text-xs !mb-0.5 font-medium uppercase tracking-wide text-gray-500">
									{t('owner.calendar.client')}
								</p>
								<p className="mt-0.5 !mb-0.5 text-md font-bold text-gray-900">
									{getClientLabel(booking, t)}
								</p>
								{booking.user?.email &&
									!booking.user.email.includes('@anonymous.local') && (
										<p className="mt-0.5 !mb-0.5 truncate text-xs text-gray-600">
											{booking.user.email}
										</p>
									)}
								{booking.user?.phone && (
									<p className="text-xs !mb-0.5 text-gray-600">
										{booking.user.phone}
									</p>
								)}
							</div>
						</div>

						<div className="flex gap-3">
							<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#fff0ee] ring-1 ring-[#ff5b5b]/15">
								<User className="h-5 w-5 text-[#ff5b5b]" strokeWidth={1.75} />
							</div>
							<div className="min-w-0">
								<p className="text-xs !mb-0.5 font-medium uppercase tracking-wide text-gray-500">
									{t('owner.calendar.staffMember')}
								</p>
								<p className="mt-0.5 text-md font-bold text-gray-900">
									{booking.staff?.name ?? '—'}
								</p>
							</div>
						</div>
					</div>

					{booking.notes &&
						!booking.notes.startsWith('Booking for ') &&
						!booking.notes.startsWith('Updated booking for ') && (
							<div>
								<p className="text-xs font-medium uppercase tracking-wide text-gray-500">
									{t('owner.calendar.notes')}
								</p>
								<p className="mt-1 rounded-xl bg-gray-50/90 p-3 text-sm text-gray-700 ring-1 ring-gray-100">
									{booking.notes}
								</p>
							</div>
						)}
				</div>

				{/* Footer */}
				<div className="mt-6 flex flex-col gap-3 border-t border-gray-200/80 bg-[#fafafa]/80 px-6 py-4 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
					<div className="flex flex-wrap items-center gap-x-4 gap-y-2">
						{canCancel && onCancel && (
							<button
								type="button"
								onClick={() => {
									if (confirm(t('owner.calendar.areYouSureCancel'))) {
										onCancel(booking.id);
										onClose();
									}
								}}
								className="text-sm font-semibold text-red-600 transition-colors hover:text-red-700"
							>
								{t('owner.calendar.cancel')}
							</button>
						)}
						{canMarkAsNoShow && onMarkAsNoShow && (
							<button
								type="button"
								onClick={() => {
									if (confirm(t('owner.calendar.areYouSureNoShow'))) {
										onMarkAsNoShow(booking.id);
										onClose();
									}
								}}
								className="text-sm font-semibold text-orange-600 transition-colors hover:text-orange-700"
							>
								{t('owner.calendar.markAsNoShow')}
							</button>
						)}
					</div>

					<div className="flex items-center justify-end gap-2 sm:ml-auto">
						{canEdit && onEdit && (
							<button
								type="button"
								onClick={() => {
									onEdit(booking);
									onClose();
								}}
								className="rounded-full bg-gradient-to-r from-[#ff5b5b] to-[#ea4b4b] px-5 py-2.5 text-sm font-semibold !text-white shadow-md shadow-[#ff5b5b]/25"
							>
								{t('owner.calendar.edit')}
							</button>
						)}
						<button
							type="button"
							onClick={onClose}
							className="rounded-full border border-gray-200/90 bg-white/90 px-5 py-2.5 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50"
						>
							{t('owner.calendar.close')}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
