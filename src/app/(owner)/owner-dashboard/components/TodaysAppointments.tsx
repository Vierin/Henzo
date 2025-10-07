'use client';

import { Booking } from '@/types';
import { formatTimeSafe, isToday, safeParseDate } from '@/utils/date';

interface TodaysAppointmentsProps {
	bookings: Booking[];
	onEditBooking: (booking: Booking) => void;
	onCancelBooking: (bookingId: string) => void;
	onViewAllAppointments: () => void;
}

export default function TodaysAppointments({
	bookings,
	onEditBooking,
	onCancelBooking,
	onViewAllAppointments,
}: TodaysAppointmentsProps) {
	// Filter today's bookings
	const todaysBookings = bookings.filter((booking) => {
		const bookingDate = safeParseDate(booking.time);
		return bookingDate && isToday(bookingDate);
	});

	// Sort by time
	const sortedBookings = [...todaysBookings].sort((a, b) => {
		const dateA = safeParseDate(a.time);
		const dateB = safeParseDate(b.time);
		if (!dateA || !dateB) return 0;
		return dateA.getTime() - dateB.getTime();
	});

	const getStatusBadge = (status: string) => {
		switch (status) {
			case 'PENDING':
				return (
					<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
						Pending
					</span>
				);
			case 'CONFIRMED':
				return (
					<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
						Confirmed
					</span>
				);
			case 'COMPLETED':
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

	if (sortedBookings.length === 0) {
		return (
			<div className="mt-1 rounded-xl h-fit border border-[#f1d9d7] bg-white p-8">
				<div className="text-center">
					<div className="w-16 h-16 bg-gray-100  rounded-full flex items-center justify-center mx-auto mb-4">
						<span className="text-2xl">📅</span>
					</div>
					<h3 className="text-lg font-semibold text-gray-900 mb-2">
						No appointments today
					</h3>
					<p className="text-gray-600 mb-4">
						You have no scheduled appointments for today.
					</p>
					<button
						onClick={onViewAllAppointments}
						className="px-4 py-2 text-sm font-medium text-[#ff5b5b] hover:text-[#e04a4a] transition-colors"
					>
						View all appointments
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="mt-6 rounded-xl border border-[#f1d9d7] bg-white p-6">
			<div className="flex items-center justify-between mb-4">
				<h3 className="text-lg font-semibold text-gray-900">
					Today's Appointments
				</h3>
				<button
					onClick={onViewAllAppointments}
					className="px-3 py-1 text-sm font-medium text-[#ff5b5b] hover:text-[#e04a4a] transition-colors"
				>
					View All
				</button>
			</div>

			<div className="space-y-3">
				{sortedBookings.map((booking) => (
					<div
						key={booking.id}
						className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
					>
						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-3 mb-1">
								<span className="text-sm font-semibold text-gray-900">
									{formatTimeSafe(booking.time)}
								</span>
								{getStatusBadge(booking.status)}
							</div>
							<p className="text-sm text-gray-700 font-medium">
								{booking.service?.name || 'Unknown Service'}
							</p>
							<p className="text-sm text-gray-600">
								{booking.user?.name || `Client ID: ${booking.userId}`}
								{booking.staff && ` • ${booking.staff.name}`}
							</p>
						</div>

						<div className="flex items-center gap-2 ml-4">
							{booking.status !== 'CANCELED' &&
								booking.status !== 'COMPLETED' && (
									<>
										<button
											onClick={() => onEditBooking(booking)}
											className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
										>
											Edit
										</button>
										<button
											onClick={() => onCancelBooking(booking.id)}
											className="px-3 py-1 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-md hover:bg-red-50 transition-colors"
										>
											Cancel
										</button>
									</>
								)}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
