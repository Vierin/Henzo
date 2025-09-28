'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BookingModal from '@/components/BookingModal';
import { Service, Booking } from '@/types';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';

const DATA_WIDTH = '50px';

export default function OwnerDashboardPage() {
	const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
	const [selectedService, setSelectedService] = useState<Service | undefined>();
	const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
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

	const fetchBookings = async () => {
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
	};

	const updateCompletedBookings = async (
		bookings: Booking[]
	): Promise<Booking[]> => {
		const now = new Date();
		const bookingsToUpdate: string[] = [];

		// Находим бронирования, которые должны быть завершены
		bookings.forEach((booking) => {
			if (booking.status === 'CONFIRMED') {
				const bookingTime = new Date(booking.time);
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
	};

	useEffect(() => {
		// Fetch bookings directly - if user is on owner dashboard, they should have a salon
		const initializeDashboard = async () => {
			try {
				console.log('Initializing dashboard...');
				// Try to fetch bookings - if this fails, we'll handle it gracefully
				await fetchBookings();
			} catch (error) {
				console.log('Error initializing dashboard:', error);

				// Only redirect to setup if this is specifically a salon not found error
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
	}, [router]);

	const handleNewAppointment = () => {
		// Открываем модальное окно без предварительно выбранного сервиса
		setSelectedService(undefined);
		setEditingBooking(null);
		setIsBookingModalOpen(true);
	};

	const handleEditBooking = (booking: Booking) => {
		// Открываем модальное окно с данными редактируемого бронирования
		setEditingBooking(booking);
		setSelectedService(undefined);
		setIsBookingModalOpen(true);
	};

	const handleBookingUpdated = () => {
		// Обновляем список бронирований после редактирования
		fetchBookings();
	};

	const handleBookingModalClose = () => {
		setIsBookingModalOpen(false);
		setEditingBooking(null);
		// Обновляем данные после закрытия модального окна
		fetchBookings();
	};

	const handleCancelBooking = async (bookingId: string) => {
		try {
			console.log('🚫 Cancelling booking:', bookingId);
			const result = await apiClient.put(`/bookings/${bookingId}/cancel`);
			console.log('✅ Cancel result:', result);
			toast.success('Booking cancelled successfully');
			fetchBookings(); // Обновляем список
		} catch (error) {
			console.error('❌ Error cancelling booking:', error);
			const errorMessage =
				error instanceof Error ? error.message : 'Failed to cancel booking';
			toast.error(errorMessage);
		}
	};

	// Фильтруем бронирования по статусу и дате
	const getFilteredBookings = () => {
		const now = new Date();

		return bookings.filter((booking) => {
			const bookingDate = new Date(booking.time);
			const isToday = bookingDate.toDateString() === now.toDateString();
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
						dateMatch = isToday;
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
	};

	// Get paginated bookings for list view
	const getPaginatedBookings = () => {
		const filteredBookings = getFilteredBookings();
		const startIndex = (currentPage - 1) * itemsPerPage;
		const endIndex = startIndex + itemsPerPage;
		return filteredBookings.slice(startIndex, endIndex);
	};

	// Get total pages for pagination
	const getTotalPages = () => {
		const filteredBookings = getFilteredBookings();
		return Math.ceil(filteredBookings.length / itemsPerPage);
	};

	// Reset to first page when filters change
	const handleFilterChange = (filterType: 'status' | 'date', value: string) => {
		setCurrentPage(1); // Reset to first page
		if (filterType === 'status') {
			setStatusFilter(value);
		} else if (filterType === 'date') {
			setDateFilter(value);
		}
	};

	const getTodaysAppointments = () => {
		const today = new Date();
		return bookings
			.filter((booking) => {
				const bookingDate = new Date(booking.time);
				return bookingDate.toDateString() === today.toDateString();
			})
			.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
	};

	const goToPreviousMonth = () => {
		if (currentMonth === 0) {
			setCurrentMonth(11);
			setCurrentYear(currentYear - 1);
		} else {
			setCurrentMonth(currentMonth - 1);
		}
	};

	const goToNextMonth = () => {
		if (currentMonth === 11) {
			setCurrentMonth(0);
			setCurrentYear(currentYear + 1);
		} else {
			setCurrentMonth(currentMonth + 1);
		}
	};

	const getMonthName = (month: number, year: number) => {
		return new Date(year, month).toLocaleDateString('en-US', {
			month: 'long',
			year: 'numeric',
		});
	};

	const handleDateClick = (day: number) => {
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
	};

	const getBookingsForDate = (date: Date) => {
		return bookings.filter((booking) => {
			const bookingDate = new Date(booking.time);
			return bookingDate.toDateString() === date.toDateString();
		});
	};

	const getStaffMembers = () => {
		// Get unique staff members from bookings
		const staffSet = new Set();
		bookings.forEach((booking) => {
			if (booking.staff) {
				staffSet.add(
					JSON.stringify({
						id: booking.staff.id,
						name: booking.staff.name,
						role: 'Staff Member', // Default role, could be enhanced
					})
				);
			}
		});

		// Convert Set back to array
		return Array.from(staffSet).map((staff) => JSON.parse(staff as string));
	};

	const getTimeSlots = () => {
		// Generate hourly time slots from 8 AM to 8 PM
		const slots = [];
		for (let hour = 8; hour <= 20; hour++) {
			slots.push({
				time: `${hour.toString().padStart(2, '0')}:00`,
				hour: hour,
				displayTime: `${hour.toString().padStart(2, '0')}:00`,
			});
		}
		return slots;
	};

	const getAppointmentsForStaffAndTime = (
		staffId: string,
		timeSlotHour: number
	) => {
		if (!selectedDate) return null;

		const dayBookings = getBookingsForDate(selectedDate);
		return dayBookings.find((booking) => {
			if (!booking.staff || booking.staff.id !== staffId) return false;

			const bookingTime = new Date(booking.time);
			const bookingHour = bookingTime.getHours();
			const bookingMinute = bookingTime.getMinutes();
			const duration = booking.service?.duration || 60; // Default 60 minutes

			const bookingStartMinutes = bookingHour * 60 + bookingMinute;
			const bookingEndMinutes = bookingStartMinutes + duration;
			const slotStartMinutes = timeSlotHour * 60; // Start of the hour
			const slotEndMinutes = (timeSlotHour + 1) * 60; // End of the hour

			// Check if appointment overlaps with this hour slot
			return (
				bookingStartMinutes < slotEndMinutes &&
				bookingEndMinutes > slotStartMinutes
			);
		});
	};

	const getAppointmentStartingAtTime = (
		staffId: string,
		timeSlotHour: number
	) => {
		if (!selectedDate) return null;

		const dayBookings = getBookingsForDate(selectedDate);
		return dayBookings.find((booking) => {
			if (!booking.staff || booking.staff.id !== staffId) return false;

			const bookingTime = new Date(booking.time);
			const bookingHour = bookingTime.getHours();

			// Check if appointment starts at this hour slot
			return bookingHour === timeSlotHour;
		});
	};

	const getAppointmentPosition = (appointment: any, timeSlotHour: number) => {
		if (!appointment) return null;

		const bookingTime = new Date(appointment.time);
		const bookingHour = bookingTime.getHours();
		const bookingMinute = bookingTime.getMinutes();
		const duration = appointment.service?.duration || 60;

		// Calculate position within the hour block (0-100%)
		const topOffset = (bookingMinute / 60) * 100; // Convert minutes to percentage

		// Calculate height based on duration
		const heightPercentage = (duration / 60) * 100; // Convert minutes to percentage

		return {
			top: `${topOffset}%`,
			height: `${heightPercentage}%`,
			duration: duration,
		};
	};

	const hasAppointmentsOnDate = (date: Date) => {
		return bookings.some((booking) => {
			const bookingDate = new Date(booking.time);
			return bookingDate.toDateString() === date.toDateString();
		});
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
		});
	};

	const formatTime = (dateString: string) => {
		return new Date(dateString).toLocaleTimeString('en-US', {
			hour: '2-digit',
			minute: '2-digit',
			hour12: false,
		});
	};

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

	return (
		<div className="flex gap-6">
			<div className="w-full">
				<div className="mb-8 flex items-center justify-between">
					<h1 className="text-3xl font-bold text-black mb-2">Appointments</h1>

					<div className="flex items-center gap-2">
						{/* View Mode Toggle */}
						<div className="flex border border-gray-300 rounded-lg overflow-hidden">
							<button
								onClick={() => {
									setViewMode('list');
									setShowDaySchedule(false); // Hide day schedule when switching to list
									setCurrentPage(1); // Reset to first page
								}}
								className={`px-3 py-2 text-sm font-medium flex items-center gap-2 ${
									viewMode === 'list'
										? 'bg-[#ea4b4b] text-white'
										: 'bg-white text-gray-700 hover:bg-gray-50'
								}`}
							>
								<svg
									className="w-4 h-4"
									fill="currentColor"
									viewBox="0 0 20 20"
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
									setShowDaySchedule(false); // Hide day schedule when switching to calendar
									setCurrentPage(1); // Reset to first page
								}}
								className={`px-3 py-2 text-sm font-medium flex items-center gap-2 ${
									viewMode === 'calendar'
										? 'bg-[#ea4b4b] text-white'
										: 'bg-white text-gray-700 hover:bg-gray-50'
								}`}
							>
								<svg
									className="w-4 h-4"
									fill="currentColor"
									viewBox="0 0 20 20"
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
							className="inline-flex items-center gap-2 rounded-full bg-[#ea4b4b] text-white px-4 py-2 text-sm shadow-sm hover:opacity-95"
						>
							<span className="text-lg leading-none">＋</span>
							New Appointment
						</button>
					</div>
				</div>

				<div className="flex justify-between gap-6">
					{!showDaySchedule && (
						<>
							{viewMode === 'list' ? (
								<div className="mt-6 w-full">
									<div className="flex items-center justify-between mb-6">
										<div className="flex gap-4">
											{/* Status Filter */}
											<div className="flex items-center gap-2">
												<label className="text-sm font-medium text-gray-700">
													Status:
												</label>
												<select
													value={statusFilter}
													onChange={(e) =>
														handleFilterChange('status', e.target.value)
													}
													className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#ea4b4b] focus:border-[#ea4b4b] text-gray-900"
												>
													<option value="all">All</option>
													<option value="CONFIRMED">Confirmed</option>
													<option value="PASSED">Completed</option>
													<option value="CANCELED">Cancelled</option>
												</select>
											</div>

											{/* Date Filter */}
											<div className="flex items-center gap-2">
												<label className="text-sm font-medium text-gray-700">
													Date:
												</label>
												<select
													value={dateFilter}
													onChange={(e) =>
														handleFilterChange('date', e.target.value)
													}
													className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#ea4b4b] focus:border-[#ea4b4b] text-gray-900"
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

									<section className="rounded-xl overflow-hidden border border-[#f1d9d7] bg-white">
										<div className="grid grid-cols-7 px-6 py-3 text-[13px] text-gray-700 bg-[#fff2f1] font-semibold">
											<div>Client</div>
											<div>Service</div>
											<div>Staff</div>
											<div>Date</div>
											<div>Time</div>
											<div>Status</div>
											<div>Actions</div>
										</div>
										<div className="divide-y divide-[#f1d9d7]">
											{loading ? (
												<div className="px-6 py-8 text-center">
													<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ea4b4b] mx-auto"></div>
													<p className="mt-2 text-gray-600">
														Loading bookings...
													</p>
												</div>
											) : error ? (
												<div className="px-6 py-8 text-center">
													<div className="text-red-500 mb-2">⚠️</div>
													<p className="text-gray-600 mb-4">{error}</p>
													<button
														onClick={fetchBookings}
														className="text-[#ea4b4b] hover:text-[#d43d3d] font-medium"
													>
														Try again
													</button>
												</div>
											) : getFilteredBookings().length === 0 ? (
												<div className="px-6 py-8 text-center">
													<div className="text-gray-400 mb-2">📅</div>
													<p className="text-gray-600">
														No bookings found with current filters
													</p>
												</div>
											) : (
												getPaginatedBookings().map((booking) => (
													<div
														key={booking.id}
														className="grid grid-cols-7 px-6 py-4 text-[15px] text-gray-800"
													>
														<div className="font-semibold">
															{booking.user?.name ||
																`Client ID: ${booking.userId}`}
														</div>
														<div>
															{booking.service?.name || 'Unknown Service'}
														</div>
														<div>{booking.staff?.name || 'Unassigned'}</div>
														<div>{formatDate(booking.time)}</div>
														<div>{formatTime(booking.time)}</div>
														<div>{getStatusBadge(booking.status)}</div>
														<div className="flex gap-2">
															{booking.status === 'CONFIRMED' && (
																<>
																	<button
																		onClick={() => handleEditBooking(booking)}
																		className="p-1 text-[#ff5b5b] hover:text-[#e04a4a] hover:bg-red-50 rounded transition-colors"
																		title="Edit booking"
																	>
																		<svg
																			className="w-4 h-4"
																			fill="none"
																			stroke="currentColor"
																			viewBox="0 0 24 24"
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
																		onClick={() =>
																			handleCancelBooking(booking.id)
																		}
																		className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
																		title="Cancel booking"
																	>
																		<svg
																			className="w-4 h-4"
																			fill="none"
																			stroke="currentColor"
																			viewBox="0 0 24 24"
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

										{/* Pagination */}
										{getTotalPages() > 1 && (
											<div className="flex items-center justify-between mt-6 px-6 py-4 border-t border-gray-200">
												<div className="text-sm text-gray-700">
													Showing{' '}
													{Math.min(
														(currentPage - 1) * itemsPerPage + 1,
														getFilteredBookings().length
													)}{' '}
													to{' '}
													{Math.min(
														currentPage * itemsPerPage,
														getFilteredBookings().length
													)}{' '}
													of {getFilteredBookings().length} results
												</div>

												<div className="flex items-center gap-2">
													<button
														onClick={() => setCurrentPage(currentPage - 1)}
														disabled={currentPage === 1}
														className="px-3 py-1 text-sm text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
													>
														Previous
													</button>

													<div className="flex items-center gap-1">
														{Array.from(
															{ length: getTotalPages() },
															(_, i) => i + 1
														).map((page) => (
															<button
																key={page}
																onClick={() => setCurrentPage(page)}
																className={`px-3 py-1 text-sm border rounded-md ${
																	page === currentPage
																		? 'bg-[#ea4b4b] text-white border-[#ea4b4b]'
																		: 'text-gray-900 border-gray-300 hover:bg-gray-50'
																}`}
															>
																{page}
															</button>
														))}
													</div>

													<button
														onClick={() => setCurrentPage(currentPage + 1)}
														disabled={currentPage === getTotalPages()}
														className="px-3 py-1 text-sm text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
													>
														Next
													</button>
												</div>
											</div>
										)}
									</section>
								</div>
							) : (
								<div className="mt-6 w-full">
									{/* Calendar */}
									<div className="rounded-xl border border-[#f1d9d7] bg-white p-6">
										<div className="flex items-center justify-between mb-6">
											<h3 className="text-lg font-semibold text-gray-900">
												{getMonthName(currentMonth, currentYear)}
											</h3>
											<div className="flex items-center gap-2">
												<button
													onClick={goToPreviousMonth}
													className="p-1 hover:bg-gray-100 rounded transition-colors"
												>
													<svg
														className="w-5 h-5 text-gray-800"
														fill="currentColor"
														viewBox="0 0 20 20"
													>
														<path
															fillRule="evenodd"
															d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
															clipRule="evenodd"
														/>
													</svg>
												</button>
												<button
													onClick={goToNextMonth}
													className="p-1 hover:bg-gray-100 rounded transition-colors"
												>
													<svg
														className="w-5 h-5 text-gray-800"
														fill="currentColor"
														viewBox="0 0 20 20"
													>
														<path
															fillRule="evenodd"
															d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
															clipRule="evenodd"
														/>
													</svg>
												</button>
												<span className="text-sm text-[#ea4b4b] ml-2">
													Today
												</span>
											</div>
										</div>

										{/* Calendar Grid */}
										<div className="grid grid-cols-7 gap-1 mb-2">
											{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(
												(day) => (
													<div
														key={day}
														className="p-2 text-center text-sm font-medium text-gray-500"
													>
														{day}
													</div>
												)
											)}
										</div>

										<div className="grid grid-cols-7 gap-1">
											{/* Calendar days - dynamic based on selected month/year */}
											{(() => {
												const today = new Date();

												// Get first day of selected month and number of days
												const firstDay = new Date(currentYear, currentMonth, 1);
												const lastDay = new Date(
													currentYear,
													currentMonth + 1,
													0
												);
												const daysInMonth = lastDay.getDate();
												const startDay = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.

												// Generate calendar grid (6 weeks = 42 days)
												const calendarDays = [];

												// Previous month days (empty cells)
												for (let i = 0; i < startDay; i++) {
													calendarDays.push(null);
												}

												// Current month days
												for (let day = 1; day <= daysInMonth; day++) {
													calendarDays.push(day);
												}

												// Fill remaining cells to complete 6 weeks
												while (calendarDays.length < 42) {
													calendarDays.push(null);
												}

												return calendarDays.map((day, i) => {
													if (day === null) {
														return <div key={i} className="p-2"></div>;
													}

													const currentDate = new Date(
														currentYear,
														currentMonth,
														day
													);
													const isToday =
														day === today.getDate() &&
														currentMonth === today.getMonth() &&
														currentYear === today.getFullYear();
													const isPast =
														currentDate <
														new Date(
															today.getFullYear(),
															today.getMonth(),
															today.getDate()
														);
													const isFuture =
														currentDate >
														new Date(
															today.getFullYear(),
															today.getMonth(),
															today.getDate()
														);

													// Check if this day has appointments (dynamic based on real bookings)
													const hasAppointment =
														hasAppointmentsOnDate(currentDate);

													return (
														<button
															key={i}
															disabled={isPast}
															onClick={() => handleDateClick(day)}
															className={`p-2 text-center text-sm relative rounded transition-colors ${
																isToday
																	? 'bg-[#ea4b4b] text-white font-semibold'
																	: isPast
																		? 'text-gray-400 cursor-not-allowed'
																		: isFuture
																			? 'text-gray-900 hover:bg-gray-100 cursor-pointer'
																			: 'text-gray-700 hover:bg-gray-100 cursor-pointer'
															}`}
														>
															{day}
															{hasAppointment && !isToday && (
																<div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-[#ea4b4b] rounded-full"></div>
															)}
														</button>
													);
												});
											})()}
										</div>
									</div>
								</div>
							)}
						</>
					)}

					{/* Day Schedule View */}
					{showDaySchedule && selectedDate && (
						<div className="mt-6 w-full">
							<div className="rounded-xl border border-[#f1d9d7] bg-white p-6">
								{/* Header */}
								<div className="flex items-center justify-between mb-6">
									<h3 className="text-lg font-semibold text-gray-900">
										{selectedDate.toLocaleDateString('en-US', {
											weekday: 'long',
											month: 'long',
											day: 'numeric',
										})}
									</h3>
									<div className="flex items-center gap-2">
										<button
											onClick={() => setShowDaySchedule(false)}
											className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
										>
											<svg
												className="w-4 h-4"
												fill="currentColor"
												viewBox="0 0 20 20"
											>
												<path
													fillRule="evenodd"
													d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
													clipRule="evenodd"
												/>
											</svg>
											Back to Month
										</button>
									</div>
								</div>

								{/* Schedule Grid */}
								<div className="overflow-x-auto">
									<div className="min-w-[800px]">
										{/* Staff Headers - Sticky */}
										<div className="sticky top-0 bg-white z-20 border-b border-gray-200 mb-0">
											<div
												className="grid gap-4 py-3 px-1"
												style={{
													gridTemplateColumns: `${DATA_WIDTH} repeat(${getStaffMembers().length}, 1fr)`,
												}}
											>
												<div className="text-sm font-medium text-gray-500">
													Time
												</div>
												{getStaffMembers().map((staff) => (
													<div key={staff.id} className="text-center">
														<div className="text-sm font-semibold text-gray-900">
															{staff.name}
														</div>
													</div>
												))}
											</div>
										</div>

										{/* Time Slots and Appointments */}
										<div className="space-y-0">
											{getTimeSlots().map((timeSlot, index) => (
												<div
													key={timeSlot.time}
													className="grid min-h-[64px] border-b border-gray-200 px-1"
													style={{
														gridTemplateColumns: `${DATA_WIDTH} repeat(${getStaffMembers().length}, 1fr)`,
													}}
												>
													{/* Time Label */}
													<div className="flex items-center text-sm text-gray-600 h-16 border-r border-dotted border-gray-200 font-medium">
														{timeSlot.time}
													</div>

													{/* Staff Columns */}
													{getStaffMembers().map((staff) => {
														const appointment = getAppointmentsForStaffAndTime(
															staff.id,
															timeSlot.hour
														);

														// Check if this is the starting hour of the appointment
														const startingAppointment =
															getAppointmentStartingAtTime(
																staff.id,
																timeSlot.hour
															);

														// Get position data for the appointment
														const position = getAppointmentPosition(
															startingAppointment,
															timeSlot.hour
														);

														return (
															<div
																key={`${staff.id}-${timeSlot.time}`}
																className="relative h-16 border-r border-dotted border-gray-200"
															>
																{startingAppointment && position ? (
																	<div
																		className="absolute inset-x-0 bg-red-50 border border-red-200 rounded-lg p-1 mx-1 z-10"
																		style={{
																			top: position.top,
																			height: position.height,
																			minHeight: '24px', // Minimum height for readability
																		}}
																	>
																		{position.duration < 40 ? (
																			// Short appointment - single line layout
																			<div className="text-xs text-red-800 font-medium leading-tight flex gap-2">
																				<div className="truncate text-red-600">
																					{startingAppointment.user?.name ||
																						`Client ID: ${startingAppointment.userId}`}{' '}
																					- {startingAppointment.service?.name}
																				</div>
																			</div>
																		) : (
																			// Long appointment - multi-line layout
																			<div className="text-xs leading-tight">
																				<div className="font-medium text-red-800 truncate">
																					{startingAppointment.service?.name} -{' '}
																					{startingAppointment.user?.name ||
																						`Client ID: ${startingAppointment.userId}`}
																				</div>
																				<div className="text-red-500 truncate">
																					{formatTime(startingAppointment.time)}{' '}
																					-{' '}
																					{formatTime(
																						new Date(
																							new Date(
																								startingAppointment.time
																							).getTime() +
																								position.duration * 60000
																						).toISOString()
																					)}
																				</div>
																			</div>
																		)}
																	</div>
																) : null}
															</div>
														);
													})}
												</div>
											))}
										</div>
									</div>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>

			<div className="rounded-xl border border-[#f1d9d7] bg-white p-6 h-[fit-content] min-w-[340px]">
				<h3 className="text-lg font-semibold text-gray-900 mb-4">
					Today's Appointments ({getTodaysAppointments().length})
				</h3>

				{loading ? (
					<div className="text-center py-4">
						<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#ea4b4b] mx-auto"></div>
					</div>
				) : getTodaysAppointments().length === 0 ? (
					<div className="text-center py-8">
						<div className="text-gray-400 mb-2">📅</div>
						<p className="text-gray-500 text-sm">No appointments today</p>
					</div>
				) : (
					<div className="space-y-3">
						{getTodaysAppointments().map((booking) => (
							<div
								key={booking.id}
								className="border border-[#f6e7e6] rounded-lg p-3"
							>
								<div className="flex items-start justify-between">
									<div className="flex-1">
										<div className="flex items-center gap-2 mb-1">
											<span className="text-sm font-medium text-[#ea4b4b]">
												{formatTime(booking.time)}
											</span>
											<span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
												{booking.status}
											</span>
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
													className="p-1 hover:bg-gray-100 rounded"
													title="Edit booking"
												>
													<svg
														className="w-4 h-4 text-gray-500"
														fill="currentColor"
														viewBox="0 0 20 20"
													>
														<path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
													</svg>
												</button>
												<button
													onClick={() => handleCancelBooking(booking.id)}
													className="p-1 hover:bg-gray-100 rounded"
													title="Cancel booking"
												>
													<svg
														className="w-4 h-4 text-gray-500"
														fill="currentColor"
														viewBox="0 0 20 20"
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
					</div>
				)}

				<div className="mt-4 pt-4 border-t border-[#f1d9d7] text-center">
					<button
						onClick={() => {
							setViewMode('list');
							setCurrentPage(1); // Reset to first page
						}}
						className="text-[#ea4b4b] hover:text-[#d43d3d] text-sm font-medium"
					>
						View all appointments
					</button>
				</div>
			</div>

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
		</div>
	);
}
