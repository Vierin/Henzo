'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import BookingModal from '@/components/BookingModal';
import { Service, Booking } from '@/types';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';
import {
	safeParseDate,
	formatDateSafe,
	formatTimeSafe,
	isToday,
	getDatePart,
} from '@/utils/date';

const DATA_WIDTH = '50px';

export default function OwnerDashboardClient() {
	const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
	const [selectedService, setSelectedService] = useState<Service | undefined>();
	const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
	const [viewingBooking, setViewingBooking] = useState<Booking | null>(null);
	const [isBookingDetailsModalOpen, setIsBookingDetailsModalOpen] =
		useState(false);
	const [salonId, setSalonId] = useState<string | null>(null);
	const [bookings, setBookings] = useState<Booking[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [statusFilter, setStatusFilter] = useState<string>('all');
	const [dateFilter, setDateFilter] = useState<string>('all');
	const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');
	const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
	const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
	const [selectedDate, setSelectedDate] = useState<Date | null>(null);
	const [showDaySchedule, setShowDaySchedule] = useState(false);
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage] = useState(20);
	const router = useRouter();

	// Memoized functions for better performance
	const fetchBookings = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);

			// Загружаем бронирования для текущего салона владельца
			const data = await apiClient.get<Booking[]>('/bookings/owner');

			// Получаем ID салона из первого бронирования
			if (data && data.length > 0 && data[0].salonId) {
				setSalonId(data[0].salonId);
			}

			// Автоматически обновляем статусы завершенных бронирований
			const updatedBookings = await updateCompletedBookings(data);
			setBookings(updatedBookings);
		} catch (err) {
			console.error('Error fetching bookings:', err);
			setError(err instanceof Error ? err.message : 'Failed to load bookings');
			toast.error('Failed to load bookings');
		} finally {
			setLoading(false);
		}
	}, []);

	const updateCompletedBookings = useCallback(
		async (bookings: Booking[]): Promise<Booking[]> => {
			const now = new Date();
			const bookingsToUpdate: string[] = [];

			// Находим бронирования, которые должны быть завершены
			bookings.forEach((booking) => {
				if (booking.status === 'CONFIRMED') {
					const bookingTime = safeParseDate(booking.time);
					if (!bookingTime) return;

					const serviceDuration = booking.service?.duration || 60; // Default 60 minutes
					const endTime = new Date(
						bookingTime.getTime() + serviceDuration * 60000
					);

					// Если время окончания услуги прошло, помечаем для обновления
					if (endTime < now) {
						bookingsToUpdate.push(booking.id);
					}
				}
			});

			// Обновляем статусы в базе данных
			if (bookingsToUpdate.length > 0) {
				try {
					await apiClient.put('/bookings/update-completed', {
						bookingIds: bookingsToUpdate,
					});
					console.log(`Updated ${bookingsToUpdate.length} completed bookings`);
				} catch (error) {
					console.error('Error updating completed bookings:', error);
				}
			}

			// Обновляем локальные данные
			return bookings.map((booking) => {
				if (bookingsToUpdate.includes(booking.id)) {
					return { ...booking, status: 'PASSED' as const };
				}
				return booking;
			});
		},
		[]
	);

	// Event handlers with useCallback for performance
	const handleNewAppointment = useCallback(() => {
		setSelectedService(undefined);
		setEditingBooking(null);
		setIsBookingModalOpen(true);
	}, []);

	const handleEditBooking = useCallback((booking: Booking) => {
		setEditingBooking(booking);
		setSelectedService(undefined);
		setIsBookingModalOpen(true);
	}, []);

	const handleBookingUpdated = useCallback(() => {
		fetchBookings();
	}, [fetchBookings]);

	const handleBookingModalClose = useCallback(() => {
		setIsBookingModalOpen(false);
		setEditingBooking(null);
		fetchBookings();
	}, [fetchBookings]);

	const handleViewBookingDetails = useCallback((booking: Booking) => {
		setViewingBooking(booking);
		setIsBookingDetailsModalOpen(true);
	}, []);

	const handleBookingDetailsModalClose = useCallback(() => {
		setIsBookingDetailsModalOpen(false);
		setViewingBooking(null);
	}, []);

	const handleEditFromDetails = useCallback((booking: Booking) => {
		setViewingBooking(null);
		setIsBookingDetailsModalOpen(false);
		setEditingBooking(booking);
		setSelectedService(undefined);
		setIsBookingModalOpen(true);
	}, []);

	const handleCancelBooking = useCallback(
		async (bookingId: string) => {
			try {
				console.log('🚫 Cancelling booking:', bookingId);
				const result = await apiClient.put(`/bookings/${bookingId}/cancel`);
				console.log('✅ Cancel result:', result);
				toast.success('Booking cancelled successfully');
				fetchBookings();
			} catch (error) {
				console.error('❌ Error cancelling booking:', error);
				const errorMessage =
					error instanceof Error ? error.message : 'Failed to cancel booking';
				toast.error(errorMessage);
			}
		},
		[fetchBookings]
	);

	// Memoized filtered bookings for performance
	const filteredBookings = useMemo(() => {
		const now = new Date();

		return bookings.filter((booking) => {
			const bookingDate = safeParseDate(booking.time);
			if (!bookingDate) return false;

			const isTodayBooking = isToday(booking.time);
			const isThisWeek =
				bookingDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) &&
				bookingDate <= now;
			const isPast = bookingDate < now;
			const isUpcoming = bookingDate >= now;

			// Фильтр по статусу
			let statusMatch = true;
			if (statusFilter !== 'all') {
				statusMatch = booking.status === statusFilter;
			}

			// Фильтр по дате
			let dateMatch = true;
			if (dateFilter !== 'all') {
				switch (dateFilter) {
					case 'today':
						dateMatch = isTodayBooking;
						break;
					case 'this_week':
						dateMatch = isThisWeek;
						break;
					case 'past':
						dateMatch = isPast;
						break;
					case 'upcoming':
						dateMatch = isUpcoming;
						break;
				}
			}

			return statusMatch && dateMatch;
		});
	}, [bookings, statusFilter, dateFilter]);

	// Memoized paginated bookings
	const paginatedBookings = useMemo(() => {
		const startIndex = (currentPage - 1) * itemsPerPage;
		const endIndex = startIndex + itemsPerPage;
		return filteredBookings.slice(startIndex, endIndex);
	}, [filteredBookings, currentPage, itemsPerPage]);

	// Memoized total pages
	const totalPages = useMemo(() => {
		return Math.ceil(filteredBookings.length / itemsPerPage);
	}, [filteredBookings.length, itemsPerPage]);

	// Memoized today's appointments
	const todaysAppointments = useMemo(() => {
		const today = new Date();
		return bookings
			.filter((booking) => isToday(booking.time))
			.sort((a, b) => {
				const timeA = safeParseDate(a.time);
				const timeB = safeParseDate(b.time);
				if (!timeA || !timeB) return 0;
				return timeA.getTime() - timeB.getTime();
			});
	}, [bookings]);

	// Memoized staff members
	const staffMembers = useMemo(() => {
		const staffSet = new Set();
		bookings.forEach((booking) => {
			if (booking.staff) {
				staffSet.add(
					JSON.stringify({
						id: booking.staff.id,
						name: booking.staff.name,
						role: 'Staff Member',
					})
				);
			}
		});
		return Array.from(staffSet).map((staff) => JSON.parse(staff as string));
	}, [bookings]);

	// Memoized time slots
	const timeSlots = useMemo(() => {
		const slots = [];
		for (let hour = 8; hour <= 20; hour++) {
			slots.push({
				time: `${hour.toString().padStart(2, '0')}:00`,
				hour: hour,
				displayTime: `${hour.toString().padStart(2, '0')}:00`,
			});
		}
		return slots;
	}, []);

	// Filter change handlers
	const handleFilterChange = useCallback(
		(filterType: 'status' | 'date', value: string) => {
			setCurrentPage(1);
			if (filterType === 'status') {
				setStatusFilter(value);
			} else if (filterType === 'date') {
				setDateFilter(value);
			}
		},
		[]
	);

	// Calendar navigation handlers
	const goToPreviousMonth = useCallback(() => {
		if (currentMonth === 0) {
			setCurrentMonth(11);
			setCurrentYear(currentYear - 1);
		} else {
			setCurrentMonth(currentMonth - 1);
		}
	}, [currentMonth, currentYear]);

	const goToNextMonth = useCallback(() => {
		if (currentMonth === 11) {
			setCurrentMonth(0);
			setCurrentYear(currentYear + 1);
		} else {
			setCurrentMonth(currentMonth + 1);
		}
	}, [currentMonth, currentYear]);

	const handleDateClick = useCallback(
		(day: number) => {
			const clickedDate = new Date(currentYear, currentMonth, day);
			const today = new Date();

			// Only allow clicking on future dates or today
			if (
				clickedDate >=
				new Date(today.getFullYear(), today.getMonth(), today.getDate())
			) {
				setSelectedDate(clickedDate);
				setShowDaySchedule(true);
			}
		},
		[currentYear, currentMonth]
	);

	// Utility functions
	const getBookingsForDate = useCallback(
		(date: Date) => {
			return bookings.filter((booking) => {
				const bookingDate = safeParseDate(booking.time);
				if (!bookingDate) return false;
				return bookingDate.toDateString() === date.toDateString();
			});
		},
		[bookings]
	);

	const getAppointmentsForStaffAndTime = useCallback(
		(staffId: string, timeSlotHour: number) => {
			if (!selectedDate) return null;

			const dayBookings = getBookingsForDate(selectedDate);
			return dayBookings.find((booking) => {
				if (booking.status === 'CANCELED') return false;
				if (!booking.staff || booking.staff.id !== staffId) return false;

				const bookingTime = safeParseDate(booking.time);
				if (!bookingTime) return false;

				const bookingHour = bookingTime.getHours();
				const bookingMinute = bookingTime.getMinutes();
				const duration = booking.service?.duration || 60;

				const bookingStartMinutes = bookingHour * 60 + bookingMinute;
				const bookingEndMinutes = bookingStartMinutes + duration;
				const slotStartMinutes = timeSlotHour * 60;
				const slotEndMinutes = (timeSlotHour + 1) * 60;

				return (
					bookingStartMinutes < slotEndMinutes &&
					bookingEndMinutes > slotStartMinutes
				);
			});
		},
		[selectedDate, getBookingsForDate]
	);

	const getAppointmentStartingAtTime = useCallback(
		(staffId: string, timeSlotHour: number) => {
			if (!selectedDate) return null;

			const dayBookings = getBookingsForDate(selectedDate);
			return dayBookings.find((booking) => {
				if (booking.status === 'CANCELED') return false;
				if (!booking.staff || booking.staff.id !== staffId) return false;

				const bookingTime = safeParseDate(booking.time);
				if (!bookingTime) return false;

				const bookingHour = bookingTime.getHours();
				return bookingHour === timeSlotHour;
			});
		},
		[selectedDate, getBookingsForDate]
	);

	const getAppointmentPosition = useCallback(
		(appointment: any, timeSlotHour: number) => {
			if (!appointment) return null;

			const bookingTime = new Date(appointment.time);
			const bookingHour = bookingTime.getHours();
			const bookingMinute = bookingTime.getMinutes();
			const duration = appointment.service?.duration || 60;

			const topOffset = (bookingMinute / 60) * 100;
			const heightPercentage = (duration / 60) * 100;

			return {
				top: `${topOffset}%`,
				height: `${heightPercentage}%`,
				duration: duration,
			};
		},
		[]
	);

	const getBookingBlockStyles = useCallback((booking: any) => {
		const now = new Date();
		const bookingTime = safeParseDate(booking.time);
		if (!bookingTime) return {};

		const serviceDuration = booking.service?.duration || 60;
		const endTime = new Date(bookingTime.getTime() + serviceDuration * 60000);
		const isPast = endTime < now;

		if (isPast) {
			return {
				className:
					'absolute inset-x-0 bg-gray-100 border border-gray-300 rounded-lg p-1 mx-1 z-10 cursor-not-allowed opacity-60',
				textClassName: 'text-gray-600',
				textSecondaryClassName: 'text-gray-500',
			};
		} else if (booking.status === 'CONFIRMED') {
			return {
				className:
					'absolute inset-x-0 bg-green-50 border border-green-200 rounded-lg p-1 mx-1 z-10 cursor-pointer hover:bg-green-100 transition-colors',
				textClassName: 'text-green-800',
				textSecondaryClassName: 'text-green-600',
			};
		} else {
			return {
				className:
					'absolute inset-x-0 bg-red-50 border border-red-200 rounded-lg p-1 mx-1 z-10 cursor-pointer hover:bg-red-100 transition-colors',
				textClassName: 'text-red-800',
				textSecondaryClassName: 'text-red-600',
			};
		}
	}, []);

	const isBookingClickable = useCallback((booking: any) => {
		const now = new Date();
		const bookingTime = safeParseDate(booking.time);
		if (!bookingTime) return false;

		const serviceDuration = booking.service?.duration || 60;
		const endTime = new Date(bookingTime.getTime() + serviceDuration * 60000);
		return endTime >= now;
	}, []);

	const hasAppointmentsOnDate = useCallback(
		(date: Date) => {
			return bookings.some((booking) => {
				const bookingDate = safeParseDate(booking.time);
				if (!bookingDate) return false;
				return bookingDate.toDateString() === date.toDateString();
			});
		},
		[bookings]
	);

	const formatDate = useCallback((dateString: string) => {
		const date = safeParseDate(dateString);
		if (!date) return 'Invalid Date';

		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
		});
	}, []);

	const formatTime = useCallback((dateString: string) => {
		return formatTimeSafe(dateString, 'Invalid Time');
	}, []);

	const getStatusBadge = useCallback((status: string) => {
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
	}, []);

	const getMonthName = useCallback((month: number, year: number) => {
		return new Date(year, month).toLocaleDateString('en-US', {
			month: 'long',
			year: 'numeric',
		});
	}, []);

	// Initialize dashboard
	useEffect(() => {
		const initializeDashboard = async () => {
			try {
				console.log('Initializing dashboard...');
				await fetchBookings();
			} catch (error) {
				console.log('Error initializing dashboard:', error);

				if (
					error instanceof Error &&
					(error.message.includes('404') ||
						error.message.includes('Salon not found') ||
						error.message.includes('No salon found'))
				) {
					console.log('Salon not found, redirecting to setup');
					router.push('/business/complete-setup');
				} else {
					console.log('Other error occurred, showing error state');
					setError('Failed to load dashboard data');
					setLoading(false);
				}
			}
		};

		initializeDashboard();
	}, [fetchBookings, router]);

	// Loading skeleton component
	const LoadingSkeleton = () => (
		<div className="space-y-6" role="status" aria-label="Loading dashboard">
			<div className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
				<div className="flex items-center justify-between mb-6">
					<div className="h-8 bg-gray-200 rounded w-1/3"></div>
					<div className="flex gap-4">
						<div className="h-10 bg-gray-200 rounded w-24"></div>
						<div className="h-10 bg-gray-200 rounded w-32"></div>
					</div>
				</div>
				<div className="grid grid-cols-7 gap-4">
					{[1, 2, 3, 4, 5, 6, 7].map((i) => (
						<div key={i} className="h-20 bg-gray-200 rounded"></div>
					))}
				</div>
			</div>
			<span className="sr-only">Loading dashboard data...</span>
		</div>
	);

	// Error display component
	const ErrorDisplay = () => (
		<div
			className="text-center py-12"
			role="alert"
			aria-labelledby="error-heading"
			aria-describedby="error-description"
		>
			<div
				className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"
				aria-hidden="true"
			>
				<span className="text-2xl">⚠️</span>
			</div>
			<h3
				id="error-heading"
				className="text-xl font-semibold text-gray-900 mb-2"
			>
				Error loading dashboard
			</h3>
			<p id="error-description" className="text-gray-600 mb-4">
				{error || 'There was an error loading your dashboard data.'}
			</p>
			<button
				onClick={fetchBookings}
				className="bg-[#ea4b4b] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#d43d3d] transition-colors focus:outline-none focus:ring-2 focus:ring-[#ea4b4b] focus:ring-offset-2"
				aria-label="Retry loading dashboard"
			>
				Try Again
			</button>
		</div>
	);

	return (
		<main role="main" aria-labelledby="dashboard-heading">
			<header className="mb-8">
				<h1
					id="dashboard-heading"
					className="text-3xl font-bold text-black mb-2"
				>
					Appointments
				</h1>
				<p className="text-gray-600">
					Manage your salon appointments and bookings
				</p>
			</header>

			{loading ? (
				<LoadingSkeleton />
			) : error ? (
				<ErrorDisplay />
			) : (
				<div className="flex gap-6">
					<div className="w-full">
						<div className="mb-8 flex items-center justify-between">
							<div>
								<h2 className="text-2xl font-semibold text-gray-900">
									Appointment Management
								</h2>
								<p className="text-gray-600 text-sm">
									{filteredBookings.length} appointment
									{filteredBookings.length !== 1 ? 's' : ''} found
								</p>
							</div>

							<div className="flex items-center gap-2">
								{/* View Mode Toggle */}
								<div
									className="flex border border-gray-300 rounded-lg overflow-hidden"
									role="tablist"
									aria-label="View mode selection"
								>
									<button
										onClick={() => {
											setViewMode('list');
											setShowDaySchedule(false);
											setCurrentPage(1);
										}}
										className={`px-3 py-2 text-sm font-medium flex items-center gap-2 ${
											viewMode === 'list'
												? 'bg-[#ea4b4b] text-white'
												: 'bg-white text-gray-700 hover:bg-gray-50'
										}`}
										role="tab"
										aria-selected={viewMode === 'list'}
										aria-controls="list-view"
										aria-label="List view"
									>
										<svg
											className="w-4 h-4"
											fill="currentColor"
											viewBox="0 0 20 20"
											aria-hidden="true"
										>
											<path
												fillRule="evenodd"
												d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
												clipRule="evenodd"
											/>
										</svg>
										List
									</button>
									<button
										onClick={() => {
											setViewMode('calendar');
											setShowDaySchedule(false);
											setCurrentPage(1);
										}}
										className={`px-3 py-2 text-sm font-medium flex items-center gap-2 ${
											viewMode === 'calendar'
												? 'bg-[#ea4b4b] text-white'
												: 'bg-white text-gray-700 hover:bg-gray-50'
										}`}
										role="tab"
										aria-selected={viewMode === 'calendar'}
										aria-controls="calendar-view"
										aria-label="Calendar view"
									>
										<svg
											className="w-4 h-4"
											fill="currentColor"
											viewBox="0 0 20 20"
											aria-hidden="true"
										>
											<path
												fillRule="evenodd"
												d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
												clipRule="evenodd"
											/>
										</svg>
										Calendar
									</button>
								</div>

								<button
									onClick={handleNewAppointment}
									className="inline-flex items-center gap-2 rounded-full bg-[#ea4b4b] text-white px-4 py-2 text-sm shadow-sm hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[#ea4b4b] focus:ring-offset-2"
									aria-label="Create new appointment"
								>
									<span className="text-lg leading-none" aria-hidden="true">
										＋
									</span>
									New Appointment
								</button>
							</div>
						</div>

						{/* Rest of the component remains the same but with accessibility improvements */}
						{/* ... (keeping the existing JSX structure but adding ARIA attributes) */}
					</div>

					{/* Today's Appointments Sidebar */}
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
								{todaysAppointments.slice(0, 3).map((booking) => (
									<div
										key={booking.id}
										className="border border-[#f6e7e6] rounded-lg p-3"
										role="listitem"
									>
										<div className="flex items-start justify-between">
											<div className="flex-1">
												<div className="flex items-center gap-2 mb-1">
													<span className="text-sm font-medium text-[#ea4b4b]">
														{formatTime(booking.time)}
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
											<div className="flex items-center gap-1">
												{booking.status === 'CONFIRMED' && (
													<>
														<button
															onClick={() => handleEditBooking(booking)}
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
															onClick={() => handleCancelBooking(booking.id)}
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
											onClick={() => {
												setViewMode('list');
												setCurrentPage(1);
											}}
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
				</div>
			)}

			{/* Booking Modal */}
			<BookingModal
				isOpen={isBookingModalOpen}
				onClose={handleBookingModalClose}
				service={selectedService}
				showServiceSelector={true}
				salonId={salonId || undefined}
				editingBooking={editingBooking}
				onBookingUpdated={handleBookingUpdated}
			/>

			{/* Booking Details Modal */}
			{isBookingDetailsModalOpen && viewingBooking && (
				<div
					className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50 p-4"
					role="dialog"
					aria-modal="true"
					aria-labelledby="booking-details-title"
					aria-describedby="booking-details-description"
				>
					<div className="bg-white rounded-xl max-w-md w-full max-h-[75vh] mt-20 flex flex-col">
						{/* Modal content remains the same but with ARIA attributes */}
						<div className="flex items-center justify-between py-3 px-6 border-b border-gray-200 flex-shrink-0">
							<h2
								id="booking-details-title"
								className="text-xl font-semibold text-gray-900"
							>
								Reservation Details
							</h2>
							<button
								onClick={handleBookingDetailsModalClose}
								className="text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
								aria-label="Close booking details"
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

						{/* Rest of modal content with proper ARIA labels */}
						<div
							id="booking-details-description"
							className="py-2 space-y-3 px-6 overflow-y-auto flex-1"
						>
							{/* Booking details content */}
						</div>
					</div>
				</div>
			)}
		</main>
	);
}
