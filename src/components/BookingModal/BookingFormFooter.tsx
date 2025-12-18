'use client';

import React from 'react';
import { useTranslation } from '@/contexts/LanguageContext';

interface BookingFormFooterProps {
	loading: boolean;
	editingBooking?: any;
	onBooking: () => void;
	onClose: () => void;
}

export default function BookingFormFooter({
	loading,
	editingBooking,
	onBooking,
	onClose,
}: BookingFormFooterProps) {
	const t = useTranslation();

	return (
		<div className="w-full sm:w-80 flex-shrink-0 bg-gray-50 sm:bg-gray-50 p-4 sm:p-8 sm:rounded-r-2xl max-h-[30vh] sm:max-h-[90vh] overflow-y-auto border-t sm:border-t-0">
			{/* Book Appointment Button */}
			<button
				onClick={onBooking}
				disabled={loading}
				className="w-full bg-[#ff5b5b] text-white py-3 sm:py-4 rounded-lg font-semibold text-base sm:text-lg hover:bg-[#e04a4a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{loading
					? editingBooking
						? t.booking.updating
						: t.booking.booking
					: editingBooking
						? t.booking.updateAppointment
						: t.booking.bookAppointment}
			</button>

			{/* Close Button */}
			<button
				onClick={onClose}
				className="w-full mt-3 sm:mt-4 text-gray-500 hover:text-gray-700 font-medium text-sm sm:text-base"
			>
				{t.common.close || 'Cancel'}
			</button>
		</div>
	);
}










