'use client';

import { Booking } from '@/types';
import { formatDateSafe, formatDateShort, formatTimeSafe } from '@/utils/date';

interface BookingListProps {
	bookings: Booking[];
	loading: boolean;
	error: string | null;
	statusFilter: string;
	dateFilter: string;
	currentPage: number;
	itemsPerPage: number;
	totalPages: number;
	onFilterChange: (filterType: 'status' | 'date', value: string) => void;
	onEditBooking: (booking: Booking) => void;
	onCancelBooking: (bookingId: string) => void;
	onViewBookingDetails: (booking: Booking) => void;
	onRetry: () => void;
	onPageChange: (page: number) => void;
}

export default function BookingList({
	bookings,
	loading,
	error,
	statusFilter,
	dateFilter,
	currentPage,
	itemsPerPage,
	totalPages,
	onFilterChange,
	onEditBooking,
	onCancelBooking,
	onViewBookingDetails,
	onRetry,
	onPageChange,
}: BookingListProps) {
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

	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;
	const paginatedBookings = bookings.slice(startIndex, endIndex);

	return (
		<div
			className="mt-6 w-full"
			role="region"
			aria-labelledby="booking-list-heading"
		>
			<h2 id="booking-list-heading" className="sr-only">
				Bookings List
			</h2>

			{/* Filters */}
			<div className="flex items-center justify-between mb-6">
				<div className="flex gap-4">
					{/* Status Filter */}
					<div className="flex items-center gap-2">
						<label
							htmlFor="status-filter"
							className="text-sm font-medium text-gray-700"
						>
							Status:
						</label>
						<select
							id="status-filter"
							value={statusFilter}
							onChange={(e) => onFilterChange('status', e.target.value)}
							className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#ea4b4b] focus:border-[#ea4b4b] text-gray-900"
							aria-label="Filter by status"
						>
							<option value="all">All</option>
							<option value="CONFIRMED">Confirmed</option>
							<option value="PASSED">Completed</option>
							<option value="CANCELED">Cancelled</option>
						</select>
					</div>

					{/* Date Filter */}
					<div className="flex items-center gap-2">
						<label
							htmlFor="date-filter"
							className="text-sm font-medium text-gray-700"
						>
							Date:
						</label>
						<select
							id="date-filter"
							value={dateFilter}
							onChange={(e) => onFilterChange('date', e.target.value)}
							className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#ea4b4b] focus:border-[#ea4b4b] text-gray-900"
							aria-label="Filter by date"
						>
							<option value="all">All</option>
							<option value="today">Today</option>
							<option value="this_week">This Week</option>
							<option value="upcoming">Upcoming</option>
							<option value="past">Past</option>
						</select>
					</div>
				</div>
			</div>

			{/* Bookings Table */}
			<section className="rounded-xl overflow-hidden border border-[#f1d9d7] bg-white">
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
					) : error ? (
						<div className="px-6 py-8 text-center" role="alert">
							<div className="text-red-500 mb-2" aria-hidden="true">
								⚠️
							</div>
							<p className="text-gray-600 mb-4">{error}</p>
							<button
								onClick={onRetry}
								className="text-[#ea4b4b] hover:text-[#d43d3d] font-medium focus:outline-none focus:ring-2 focus:ring-[#ea4b4b] focus:ring-offset-2 rounded px-2 py-1"
								aria-label="Retry loading bookings"
							>
								Try again
							</button>
						</div>
					) : bookings.length === 0 ? (
						<div className="px-6 py-8 text-center" role="status">
							<div className="text-gray-400 mb-2" aria-hidden="true">
								📅
							</div>
							<p className="text-gray-600">
								No bookings found with current filters
							</p>
						</div>
					) : (
						paginatedBookings.map((booking, index) => (
							<div
								key={booking.id}
								className="grid grid-cols-7 px-6 py-4 text-[15px] text-gray-800"
								role="listitem"
								aria-posinset={index + 1}
								aria-setsize={paginatedBookings.length}
							>
								<div className="font-semibold">
									{booking.user?.name || `Client ID: ${booking.userId}`}
								</div>
								<div>{booking.service?.name || 'Unknown Service'}</div>
								<div>{booking.staff?.name || 'Unassigned'}</div>
								<div>{formatDateShort(booking.time)}</div>
								<div>{formatTimeSafe(booking.time)}</div>
								<div>{getStatusBadge(booking.status)}</div>
								<div
									className="flex gap-2"
									role="group"
									aria-label="Booking actions"
								>
									{booking.status === 'CONFIRMED' && (
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
												onClick={() => onCancelBooking(booking.id)}
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
									)}
								</div>
							</div>
						))
					)}
				</div>
			</section>

			{/* Pagination */}
			{totalPages > 1 && (
				<nav
					className="flex items-center justify-between mt-6"
					aria-label="Pagination"
				>
					<div className="text-sm text-gray-700">
						Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
						<span className="font-medium">
							{Math.min(endIndex, bookings.length)}
						</span>{' '}
						of <span className="font-medium">{bookings.length}</span> results
					</div>

					<div className="flex items-center gap-2">
						<button
							onClick={() => onPageChange(currentPage - 1)}
							disabled={currentPage === 1}
							className="px-3 py-1 text-sm text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#ea4b4b] focus:ring-offset-2"
							aria-label="Go to previous page"
						>
							Previous
						</button>

						<div className="flex items-center gap-1" aria-label="Page numbers">
							{Array.from({ length: totalPages }, (_, i) => i + 1).map(
								(page) => (
									<button
										key={page}
										onClick={() => onPageChange(page)}
										className={`px-3 py-1 text-sm border rounded-md ${
											page === currentPage
												? 'bg-[#ea4b4b] text-white border-[#ea4b4b]'
												: 'text-gray-900 border-gray-300 hover:bg-gray-50'
										} focus:outline-none focus:ring-2 focus:ring-[#ea4b4b] focus:ring-offset-2`}
										aria-current={page === currentPage ? 'page' : undefined}
										aria-label={`Go to page ${page}`}
									>
										{page}
									</button>
								)
							)}
						</div>

						<button
							onClick={() => onPageChange(currentPage + 1)}
							disabled={currentPage === totalPages}
							className="px-3 py-1 text-sm text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#ea4b4b] focus:ring-offset-2"
							aria-label="Go to next page"
						>
							Next
						</button>
					</div>
				</nav>
			)}
		</div>
	);
}
