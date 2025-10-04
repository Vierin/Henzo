'use client';

import { Booking } from '@/types';
import { formatTimeSafe, isToday } from '@/utils/date';

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
	const getStatusBadge = (status: string) => {
		switch (status) {
			case 'CONFIRMED':
				return (
					<span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
						{status}
					</span>
				);
			case 'PASSED':
				return (
					<span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
						Completed
					</span>
				);
			case 'CANCELED':
				return (
					<span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
						Cancelled
					</span>
				);
			default:
				return (
					<span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
						{status}
					</span>
				);
		}
	};

	// Filter and sort today's appointments
	const todaysAppointments = bookings
		.filter((booking) => isToday(booking.time))
		.sort((a, b) => {
			const timeA = new Date(a.time);
			const timeB = new Date(b.time);
			return timeA.getTime() - timeB.getTime();
		});

	return (
		<aside
			className="rounded-xl border border-[#f1d9d7] bg-white p-6 h-[fit-content] min-w-[340px] sticky top-22"
			aria-labelledby="today-appointments-heading"
		>
			<h3
				id="today-appointments-heading"
				className="text-lg font-semibold text-gray-900 mb-4"
			>
				Today's Appointments ({todaysAppointments.length})
			</h3>

			{todaysAppointments.length === 0 ? (
				<div
					className="text-center py-8"
					role="status"
					aria-label="No appointments today"
				>
					<div className="text-gray-400 mb-2" aria-hidden="true">
						📅
					</div>
					<p className="text-gray-500 text-sm">No appointments today</p>
				</div>
			) : (
				<div
					className="space-y-3"
					role="list"
					aria-label="Today's appointments"
				>
					{todaysAppointments.slice(0, 3).map((booking, index) => (
						<div
							key={booking.id}
							className="border border-[#f6e7e6] rounded-lg p-3"
							role="listitem"
							aria-posinset={index + 1}
							aria-setsize={Math.min(todaysAppointments.length, 3)}
						>
							<div className="flex items-start justify-between">
								<div className="flex-1">
									<div className="flex items-center gap-2 mb-1">
										<span className="text-sm font-medium text-[#ea4b4b]">
											{formatTimeSafe(booking.time)}
										</span>
										{getStatusBadge(booking.status)}
									</div>
									<div className="text-sm font-medium text-gray-900">
										{booking.user?.name || `Client ID: ${booking.userId}`}
									</div>
									<div className="text-xs text-gray-500">
										{booking.service?.name} with{' '}
										{booking.staff?.name || 'Unassigned'}
									</div>
								</div>
								<div
									className="flex items-center gap-1"
									role="group"
									aria-label="Appointment actions"
								>
									{booking.status === 'CONFIRMED' && (
										<>
											<button
												onClick={() => onEditBooking(booking)}
												className="p-1 hover:bg-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-[#ea4b4b] focus:ring-offset-2"
												title="Edit booking"
												aria-label={`Edit booking for ${booking.user?.name || 'client'}`}
											>
												<svg
													className="w-4 h-4 text-gray-500"
													fill="currentColor"
													viewBox="0 0 20 20"
													aria-hidden="true"
												>
													<path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
												</svg>
											</button>
											<button
												onClick={() => onCancelBooking(booking.id)}
												className="p-1 hover:bg-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
												title="Cancel booking"
												aria-label={`Cancel booking for ${booking.user?.name || 'client'}`}
											>
												<svg
													className="w-4 h-4 text-gray-500"
													fill="currentColor"
													viewBox="0 0 20 20"
													aria-hidden="true"
												>
													<path
														fillRule="evenodd"
														d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"
														clipRule="evenodd"
													/>
													<path
														fillRule="evenodd"
														d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
														clipRule="evenodd"
													/>
												</svg>
											</button>
										</>
									)}
								</div>
							</div>
						</div>
					))}

					{todaysAppointments.length > 3 && (
						<div className="pt-2 border-t border-gray-200">
							<button
								onClick={onViewAllAppointments}
								className="w-full text-[#ea4b4b] hover:text-[#d43d3d] text-sm font-medium py-2 hover:bg-gray-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#ea4b4b] focus:ring-offset-2"
								aria-label={`View all ${todaysAppointments.length} appointments`}
							>
								View all appointments ({todaysAppointments.length})
							</button>
						</div>
					)}
				</div>
			)}
		</aside>
	);
}
