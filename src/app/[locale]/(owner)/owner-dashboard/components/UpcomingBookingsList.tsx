'use client';

import { Booking } from '@/types';
import { formatDateShort, formatTimeSafe } from '@/utils/date';

interface UpcomingBookingsListProps {
	bookings: Booking[];
	loading: boolean;
	onEditBooking: (booking: Booking) => void;
	onCancelBooking: (bookingId: string) => void;
	onConfirmBooking: (bookingId: string) => void;
	onRejectBooking: (bookingId: string) => void;
}

export default function UpcomingBookingsList({
	bookings,
	loading,
	onEditBooking,
	onCancelBooking,
	onConfirmBooking,
	onRejectBooking,
}: UpcomingBookingsListProps) {
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
			case 'NOSHOW':
				return (
					<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
						No-Show
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

	const renderBookingActions = (booking: Booking) => {
		if (booking.status === 'PENDING') {
			return (
				<div
					className="flex flex-col sm:flex-row gap-2 mt-3"
					role="group"
					aria-label="Booking actions"
				>
					<button
						onClick={() => onConfirmBooking(booking.id)}
						className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 w-full sm:w-auto"
						title="Confirm booking"
						aria-label={`Confirm booking for ${booking.user?.name || 'client'}`}
					>
						Confirm
					</button>
					<button
						onClick={() => onRejectBooking(booking.id)}
						className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 w-full sm:w-auto"
						title="Reject booking"
						aria-label={`Reject booking for ${booking.user?.name || 'client'}`}
					>
						Reject
					</button>
				</div>
			);
		} else if (booking.status === 'CONFIRMED') {
			return (
				<div
					className="flex gap-2 mt-0 md:mt-3"
					role="group"
					aria-label="Booking actions"
				>
					<button
						onClick={() => onEditBooking(booking)}
						className="p-2 text-[#ff5b5b] hover:text-[#e04a4a] hover:bg-red-50 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:ring-offset-2"
						title="Edit booking"
						aria-label={`Edit booking for ${booking.user?.name || 'client'}`}
					>
						<svg
							className="w-5 h-5 md:w-4 md:h-4"
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
					</button>
					<button
						onClick={() => {
							if (confirm('Are you sure you want to cancel this booking?')) {
								onCancelBooking(booking.id);
							}
						}}
						className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
						title="Cancel booking"
						aria-label={`Cancel booking for ${booking.user?.name || 'client'}`}
					>
						<svg
							className="w-5 h-5 md:w-4 md:h-4"
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
					</button>
				</div>
			);
		}
		return null;
	};

	return (
		<div className="bg-white rounded-xl border border-[#f1d9d7] overflow-hidden">
			<div className="p-4 sm:p-6 border-b border-[#f1d9d7]">
				<h2 className="text-lg sm:text-xl font-semibold text-gray-900">
					Upcoming Bookings
				</h2>
			</div>

			{/* Desktop Table View */}
			<div className="hidden lg:block">
				<div
					className="grid grid-cols-7 px-6 py-3 text-[13px] text-gray-700 bg-[#fff2f1] font-semibold"
					role="rowgroup"
				>
					<div role="columnheader">Client</div>
					<div role="columnheader">Service</div>
					<div role="columnheader">Staff</div>
					<div role="columnheader">Date</div>
					<div role="columnheader">Time</div>
					<div role="columnheader">Status</div>
					<div role="columnheader">Actions</div>
				</div>

				<div className="divide-y divide-[#f1d9d7]" role="list">
					{loading ? (
						<div
							className="px-6 py-8 text-center"
							role="status"
							aria-live="polite"
						>
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ea4b4b] mx-auto"></div>
							<p className="mt-2 text-gray-600">Loading bookings...</p>
						</div>
					) : bookings.length === 0 ? (
						<div className="px-6 py-8 text-center" role="status">
							<div className="text-gray-400 mb-2" aria-hidden="true">
								📅
							</div>
							<p className="text-gray-600">
								No upcoming bookings in the next 7 days
							</p>
						</div>
					) : (
						bookings.map((booking, index) => (
							<div
								key={booking.id}
								className="grid grid-cols-7 px-6 py-4 text-[15px] text-gray-800"
								role="listitem"
								aria-posinset={index + 1}
								aria-setsize={bookings.length}
							>
								<div className="font-semibold">
									{booking.user?.name || `Client ID: ${booking.userId}`}
								</div>
								<div>{booking.service?.name || 'Unknown Service'}</div>
								<div>{booking.staff?.name || 'Unassigned'}</div>
								<div>{formatDateShort(booking.time)}</div>
								<div>{formatTimeSafe(booking.time)}</div>
								<div>{getStatusBadge(booking.status)}</div>
								<div className="flex gap-2">
									{booking.status === 'PENDING' ? (
										<>
											<button
												onClick={() => onConfirmBooking(booking.id)}
												className="px-3 py-1 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
												title="Confirm booking"
												aria-label={`Confirm booking for ${booking.user?.name || 'client'}`}
											>
												Confirm
											</button>
											<button
												onClick={() => onRejectBooking(booking.id)}
												className="px-3 py-1 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
												title="Reject booking"
												aria-label={`Reject booking for ${booking.user?.name || 'client'}`}
											>
												Reject
											</button>
										</>
									) : booking.status === 'CONFIRMED' ? (
										<>
											<button
												onClick={() => onEditBooking(booking)}
												className="p-1 text-[#ff5b5b] hover:text-[#e04a4a] hover:bg-red-50 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:ring-offset-2"
												title="Edit booking"
												aria-label={`Edit booking for ${booking.user?.name || 'client'}`}
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
											</button>
											<button
												onClick={() => {
													if (
														confirm(
															'Are you sure you want to cancel this booking?'
														)
													) {
														onCancelBooking(booking.id);
													}
												}}
												className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
												title="Cancel booking"
												aria-label={`Cancel booking for ${booking.user?.name || 'client'}`}
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
											</button>
										</>
									) : null}
								</div>
							</div>
						))
					)}
				</div>
			</div>

			{/* Mobile Card View */}
			<div className="lg:hidden">
				{loading ? (
					<div
						className="px-4 py-8 text-center"
						role="status"
						aria-live="polite"
					>
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ea4b4b] mx-auto"></div>
						<p className="mt-2 text-gray-600">Loading bookings...</p>
					</div>
				) : bookings.length === 0 ? (
					<div className="px-4 py-8 text-center" role="status">
						<div className="text-gray-400 mb-2" aria-hidden="true">
							📅
						</div>
						<p className="text-gray-600">
							No upcoming bookings in the next 7 days
						</p>
					</div>
				) : (
					<div className="divide-y divide-[#f1d9d7]" role="list">
						{bookings.map((booking, index) => (
							<div
								key={booking.id}
								className="p-4"
								role="listitem"
								aria-posinset={index + 1}
								aria-setsize={bookings.length}
							>
								<div className="flex items-start justify-between mb-2">
									<div className="flex-1 min-w-0">
										<h3 className="font-semibold text-gray-900 text-sm truncate">
											{booking.user?.name || `Client ID: ${booking.userId}`}
										</h3>
										<p className="text-sm text-gray-600 truncate">
											{booking.service?.name || 'Unknown Service'}
										</p>
									</div>
									<div className="ml-3 flex-shrink-0">
										{getStatusBadge(booking.status)}
									</div>
								</div>

								<div className="grid grid-cols-2 gap-3 text-xs sm:text-sm text-gray-600 mb-3">
									<div>
										<span className="font-medium">Staff:</span>
										<p className="truncate font-semibold">
											{booking.staff?.name || 'Unassigned'}
										</p>
									</div>
									<div className="flex justify-end items-start">
										{renderBookingActions(booking)}
									</div>
									<div className="text-[0.8rem]">
										<span className="font-medium">Date & time:</span>
										<p className="font-semibold">
											{formatDateShort(booking.time)}{' '}
											{formatTimeSafe(booking.time)}
										</p>
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
