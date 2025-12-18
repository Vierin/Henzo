'use client';

import { Booking } from '@/types';
import { formatDateSafe, formatDateShort, formatTimeSafe } from '@/utils/date';
import { Search, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';

interface BookingListProps {
	bookings: Booking[];
	loading: boolean;
	error: string | null;
	statusFilter: string;
	dateFilter: string;
	searchQuery: string;
	currentPage: number;
	itemsPerPage: number;
	totalPages: number;
	onFilterChange: (filterType: 'status' | 'date', value: string) => void;
	onSearchChange: (query: string) => void;
	onEditBooking: (booking: Booking) => void;
	onCancelBooking: (bookingId: string) => void;
	onConfirmBooking: (bookingId: string) => void;
	onRejectBooking: (bookingId: string) => void;
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
	searchQuery,
	currentPage,
	itemsPerPage,
	totalPages,
	onFilterChange,
	onSearchChange,
	onEditBooking,
	onCancelBooking,
	onConfirmBooking,
	onRejectBooking,
	onViewBookingDetails,
	onRetry,
	onPageChange,
}: BookingListProps) {
	const t = useTranslation();

	const getStatusBadge = (status: string) => {
		switch (status) {
			case 'PENDING':
				return (
					<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
						{t('owner.dashboard.pending')}
					</span>
				);
			case 'CONFIRMED':
				return (
					<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
						{t('owner.dashboard.confirmed')}
					</span>
				);
			case 'COMPLETED':
				return (
					<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:!bg-blue-100 dark:!text-blue-800">
						{t('owner.dashboard.completed')}
					</span>
				);
			case 'CANCELED':
				return (
					<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
						{t('owner.dashboard.cancelled')}
					</span>
				);
			case 'NOSHOW':
				return (
					<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
						{t('owner.dashboard.noShow')}
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
				<div className="flex gap-2" role="group" aria-label="Booking actions">
					<button
						onClick={() => onConfirmBooking(booking.id)}
						className="flex-1 sm:flex-none px-3 py-1 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
						title={t('owner.dashboard.confirm')}
						aria-label={`${t('owner.dashboard.confirm')} booking for ${booking.user?.name || t('owner.calendar.client')}`}
					>
						{t('owner.dashboard.confirm')}
					</button>
					<button
						onClick={() => onRejectBooking(booking.id)}
						className="flex-1 sm:flex-none px-3 py-1 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
						title={t('owner.dashboard.reject')}
						aria-label={`${t('owner.dashboard.reject')} booking for ${booking.user?.name || t('owner.calendar.client')}`}
					>
						{t('owner.dashboard.reject')}
					</button>
				</div>
			);
		} else if (booking.status === 'CONFIRMED') {
			return (
				<div className="flex gap-2" role="group" aria-label="Booking actions">
					<button
						onClick={() => onEditBooking(booking)}
						className="p-2 text-[#ff5b5b] hover:text-[#e04a4a] hover:bg-red-50 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:ring-offset-2"
						title={t('owner.dashboard.edit')}
						aria-label={`${t('owner.dashboard.edit')} booking for ${booking.user?.name || t('owner.calendar.client')}`}
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
						className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
						title={t('owner.dashboard.cancel')}
						aria-label={`${t('owner.dashboard.cancel')} booking for ${booking.user?.name || t('owner.calendar.client')}`}
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
				</div>
			);
		}
		return null;
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
				{t('owner.bookingsList')}
			</h2>

			{/* Filters */}
			<div className="mb-6 space-y-4">
				{/* Desktop Filters */}
				<div className="hidden md:flex items-center justify-between gap-4 flex-wrap">
					<div className="flex items-center gap-4 flex-wrap">
						{/* Status Filter */}
						<div className="flex items-center gap-2">
							<label
								htmlFor="status-filter"
								className="text-sm font-medium text-gray-700"
							>
								{t('owner.calendar.status')}:
							</label>
							<Select
								value={statusFilter}
								onValueChange={(value) => onFilterChange('status', value)}
							>
								<SelectTrigger className="w-32 border border-gray-300 focus:ring-2 focus:ring-[#ea4b4b] focus:border-[#ea4b4b] text-gray-900">
									<SelectValue />
								</SelectTrigger>
								<SelectContent className="bg-white border border-gray-300 shadow-lg rounded-md">
									<SelectItem
										value="all"
										className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
									>
										{t('owner.calendar.all')}
									</SelectItem>
									<SelectItem
										value="PENDING"
										className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
									>
										{t('owner.dashboard.pending')}
									</SelectItem>
									<SelectItem
										value="CONFIRMED"
										className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
									>
										{t('owner.dashboard.confirmed')}
									</SelectItem>
									<SelectItem
										value="COMPLETED"
										className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
									>
										{t('owner.dashboard.completed')}
									</SelectItem>
									<SelectItem
										value="CANCELED"
										className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
									>
										{t('owner.dashboard.cancelled')}
									</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{/* Date Filter */}
						<div className="flex items-center gap-2">
							<label
								htmlFor="date-filter"
								className="text-sm font-medium text-gray-700"
							>
								{t('owner.calendar.date')}:
							</label>
							<Select
								value={dateFilter}
								onValueChange={(value) => onFilterChange('date', value)}
							>
								<SelectTrigger className="w-36 border border-gray-300 focus:ring-2 focus:ring-[#ea4b4b] focus:border-[#ea4b4b] text-gray-900">
									<SelectValue />
								</SelectTrigger>
								<SelectContent className="bg-white border border-gray-300 shadow-lg rounded-md">
									<SelectItem
										value="all"
										className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
									>
										{t('owner.calendar.all')}
									</SelectItem>
									<SelectItem
										value="today"
										className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
									>
										{t('owner.calendar.today')}
									</SelectItem>
									<SelectItem
										value="this_week"
										className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
									>
										{t('owner.calendar.thisWeek')}
									</SelectItem>
									<SelectItem
										value="upcoming"
										className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
									>
										{t('owner.calendar.upcoming')}
									</SelectItem>
									<SelectItem
										value="past"
										className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
									>
										{t('owner.calendar.past')}
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					{/* Desktop Search Field */}
					<div className="relative max-w-md min-w-72">
						<div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
							<Search className="w-4 h-4 text-gray-400" />
						</div>
						<input
							type="text"
							placeholder={t('owner.calendar.searchPlaceholder')}
							value={searchQuery}
							onChange={(e) => onSearchChange(e.target.value)}
							className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ea4b4b] focus:border-[#ea4b4b] text-gray-900 placeholder-gray-400"
							aria-label={t('owner.calendar.searchLabel')}
						/>
						{searchQuery && (
							<button
								onClick={() => onSearchChange('')}
								className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 transition-colors"
								aria-label={t('owner.calendar.clearSearch')}
							>
								<X className="w-4 h-4" />
							</button>
						)}
					</div>
				</div>

				{/* Mobile Filters */}
				<div className="md:hidden space-y-3">
					{/* Mobile Search Field */}
					<div className="relative w-full">
						<div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
							<Search className="w-4 h-4 text-gray-400" />
						</div>
						<input
							type="text"
							placeholder={t('owner.calendar.searchPlaceholder')}
							value={searchQuery}
							onChange={(e) => onSearchChange(e.target.value)}
							className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ea4b4b] focus:border-[#ea4b4b] text-gray-900 placeholder-gray-400"
							aria-label={t('owner.calendar.searchLabel')}
						/>
						{searchQuery && (
							<button
								onClick={() => onSearchChange('')}
								className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 transition-colors"
								aria-label={t('owner.calendar.clearSearch')}
							>
								<X className="w-4 h-4" />
							</button>
						)}
					</div>

					{/* Mobile Filter Row */}
					<div className="flex gap-3">
						{/* Status Filter */}
						<div className="flex-1">
							<label
								htmlFor="status-filter-mobile"
								className="block text-xs font-medium text-gray-700 mb-1"
							>
								{t('owner.calendar.status')}
							</label>
							<Select
								value={statusFilter}
								onValueChange={(value) => onFilterChange('status', value)}
							>
								<SelectTrigger className="w-full border border-gray-300 focus:ring-2 focus:ring-[#ea4b4b] focus:border-[#ea4b4b] text-gray-900">
									<SelectValue />
								</SelectTrigger>
								<SelectContent className="bg-white border border-gray-300 shadow-lg rounded-md">
									<SelectItem
										value="all"
										className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
									>
										{t('owner.calendar.all')}
									</SelectItem>
									<SelectItem
										value="PENDING"
										className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
									>
										{t('owner.dashboard.pending')}
									</SelectItem>
									<SelectItem
										value="CONFIRMED"
										className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
									>
										{t('owner.dashboard.confirmed')}
									</SelectItem>
									<SelectItem
										value="COMPLETED"
										className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
									>
										{t('owner.dashboard.completed')}
									</SelectItem>
									<SelectItem
										value="CANCELED"
										className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
									>
										{t('owner.dashboard.cancelled')}
									</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{/* Date Filter */}
						<div className="flex-1">
							<label
								htmlFor="date-filter-mobile"
								className="block text-xs font-medium text-gray-700 mb-1"
							>
								{t('owner.calendar.date')}
							</label>
							<Select
								value={dateFilter}
								onValueChange={(value) => onFilterChange('date', value)}
							>
								<SelectTrigger className="w-full border border-gray-300 focus:ring-2 focus:ring-[#ea4b4b] focus:border-[#ea4b4b] text-gray-900">
									<SelectValue />
								</SelectTrigger>
								<SelectContent className="bg-white border border-gray-300 shadow-lg rounded-md">
									<SelectItem
										value="all"
										className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
									>
										{t('owner.calendar.all')}
									</SelectItem>
									<SelectItem
										value="today"
										className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
									>
										{t('owner.calendar.today')}
									</SelectItem>
									<SelectItem
										value="this_week"
										className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
									>
										{t('owner.calendar.thisWeek')}
									</SelectItem>
									<SelectItem
										value="upcoming"
										className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
									>
										{t('owner.calendar.upcoming')}
									</SelectItem>
									<SelectItem
										value="past"
										className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
									>
										{t('owner.calendar.past')}
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				</div>
			</div>

			{/* Bookings Table */}
			<section className="rounded-xl overflow-hidden border border-[#f1d9d7] bg-white">
				{/* Desktop Table Header */}
				<div
					className="hidden md:grid grid-cols-7 px-6 py-3 text-[13px] text-gray-700 bg-[#fff2f1] font-semibold"
					role="rowgroup"
				>
					<div role="columnheader">{t('owner.calendar.client')}</div>
					<div role="columnheader">{t('owner.calendar.service')}</div>
					<div role="columnheader">
						{t('owner.dashboard.staffLabel')?.replace(':', '') || 'Staff'}
					</div>
					<div role="columnheader">{t('owner.calendar.date')}</div>
					<div role="columnheader">{t('owner.calendar.time')}</div>
					<div role="columnheader">{t('owner.calendar.status')}</div>
					<div role="columnheader">{t('owner.dashboard.actions')}</div>
				</div>

				<div className="divide-y divide-[#f1d9d7]" role="list">
					{loading ? (
						<div
							className="px-6 py-8 text-center"
							role="status"
							aria-live="polite"
						>
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ea4b4b] mx-auto"></div>
							<p className="mt-2 text-gray-600">
								{t('owner.calendar.loadingBookings')}
							</p>
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
								{t('owner.calendar.tryAgain')}
							</button>
						</div>
					) : bookings.length === 0 ? (
						<div className="px-6 py-8 text-center" role="status">
							<p className="text-gray-600">
								{t('owner.calendar.noBookingsWithFilters')}
							</p>
						</div>
					) : (
						paginatedBookings.map((booking, index) => (
							<>
								{/* Desktop Table Row */}
								<div
									key={`desktop-${booking.id}`}
									className="hidden md:grid grid-cols-7 px-6 py-4 text-[15px] text-gray-800"
									role="listitem"
									aria-posinset={index + 1}
									aria-setsize={paginatedBookings.length}
								>
									<div className="font-semibold">
										{booking.user?.name ||
											`${t('owner.calendar.clientId')} ${booking.userId}`}
									</div>
									<div>
										{booking.service?.name || t('owner.unknownService')}
									</div>
									<div>{booking.staff?.name || t('owner.unassigned')}</div>
									<div>{formatDateShort(booking.time)}</div>
									<div>{formatTimeSafe(booking.time)}</div>
									<div>{getStatusBadge(booking.status)}</div>
									<div>{renderBookingActions(booking)}</div>
								</div>

								{/* Mobile Card */}
								<div
									key={`mobile-${booking.id}`}
									className="md:hidden p-4"
									role="listitem"
									aria-posinset={index + 1}
									aria-setsize={paginatedBookings.length}
								>
									<div className="flex items-start justify-between mb-2">
										<div className="flex-1 min-w-0">
											<h3 className="font-semibold text-gray-900 text-sm truncate">
												{booking.user?.name ||
													`${t('owner.calendar.clientId')} ${booking.userId}`}
											</h3>
											<p className="text-sm text-gray-600 truncate">
												{booking.service?.name || 'Unknown Service'}
											</p>
										</div>
										<div className="ml-3 flex-shrink-0">
											{getStatusBadge(booking.status)}
										</div>
									</div>

									<div className="grid grid-cols-2 gap-3 text-xs text-gray-600 mb-3">
										<div>
											<span className="font-medium">
												{t('owner.dashboard.staffLabel')}
											</span>
											<p className="truncate font-semibold">
												{booking.staff?.name || t('owner.unassigned')}
											</p>
										</div>
										<div>
											<span className="font-medium">
												{t('owner.calendar.dateAndTime')}
											</span>
											<p className="truncate font-semibold">
												{formatDateShort(booking.time)}{' '}
												{formatTimeSafe(booking.time)}
											</p>
										</div>
									</div>

									{renderBookingActions(booking)}
								</div>
							</>
						))
					)}
				</div>
			</section>

			{/* Pagination */}
			{totalPages > 1 && (
				<nav
					className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-6"
					aria-label="Pagination"
				>
					<div className="text-sm text-gray-700 text-center sm:text-left">
						{t('owner.calendar.showing')}{' '}
						<span className="font-medium">{startIndex + 1}</span>{' '}
						{t('owner.calendar.to')}{' '}
						<span className="font-medium">
							{Math.min(endIndex, bookings.length)}
						</span>{' '}
						{t('owner.calendar.of')}{' '}
						<span className="font-medium">{bookings.length}</span>{' '}
						{t('owner.calendar.results')}
					</div>

					<div className="flex items-center justify-center gap-2">
						<button
							onClick={() => onPageChange(currentPage - 1)}
							disabled={currentPage === 1}
							className="p-2 text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#ea4b4b] focus:ring-offset-2 transition-colors"
							aria-label={t('owner.calendar.previous')}
						>
							<ChevronLeft className="w-4 h-4" />
						</button>

						{/* Desktop: Show all page numbers */}
						<div
							className="hidden sm:flex items-center gap-1"
							aria-label="Page numbers"
						>
							{Array.from({ length: totalPages }, (_, i) => i + 1).map(
								(page) => (
									<button
										key={page}
										onClick={() => onPageChange(page)}
										className={`px-3 py-2 text-sm border rounded-md ${
											page === currentPage
												? 'bg-[#ea4b4b] text-white border-[#ea4b4b]'
												: 'text-gray-900 border-gray-300 hover:bg-gray-50'
										} focus:outline-none focus:ring-2 focus:ring-[#ea4b4b] focus:ring-offset-2 transition-colors`}
										aria-current={page === currentPage ? 'page' : undefined}
										aria-label={`${t('owner.calendar.goToPage')} ${page}`}
									>
										{page}
									</button>
								)
							)}
						</div>

						{/* Mobile: Show current page and total */}
						<div className="sm:hidden flex items-center gap-2 text-sm text-gray-700">
							<span>
								{t('owner.calendar.page')} {currentPage} {t('owner.calendar.of')} {totalPages}
							</span>
						</div>

						<button
							onClick={() => onPageChange(currentPage + 1)}
							disabled={currentPage === totalPages}
							className="p-2 text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#ea4b4b] focus:ring-offset-2 transition-colors"
							aria-label={t('owner.calendar.next')}
						>
							<ChevronRight className="w-4 h-4" />
						</button>
					</div>
				</nav>
			)}
		</div>
	);
}
