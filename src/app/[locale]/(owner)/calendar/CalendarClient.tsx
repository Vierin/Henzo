'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import BookingModal from '@/components/BookingModal';
import { Service, Booking } from '@/types';
import { apiClient } from '@/lib/api-client';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
	safeParseDate,
	formatDateSafe,
	formatTimeSafe,
	isToday,
	getDatePart,
} from '@/utils/date';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorDisplay from '@/components/ErrorDisplay';
import { useOwnerLayout } from '@/contexts/OwnerLayoutContext';
import { useBookings } from '@/hooks/useBookings';
import { useTimeBlocks } from '@/hooks/useTimeBlocks';
import { useStaffBySalon } from '@/hooks/useStaff';
import { useServices } from '@/hooks/useServices';
import { BookingWithDetailsDto } from '@/types/dto/booking.dto';
import { convertBookingDtoArray } from '@/utils/bookingTransformers';

// Import calendar components
import BookingList from './components/BookingList';
import CalendarView from './components/CalendarView';
import BookingDetailsModal from './components/BookingDetailsModal';
import DaySchedule from './components/DaySchedule';
import BlockTimeModal from '@/components/BlockTimeModal';
import { CalendarDays, List, Ban } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';

export default function CalendarClient() {
	const t = useTranslation();
	const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
	const [selectedService, setSelectedService] = useState<Service | undefined>();
	const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
	const [viewingBooking, setViewingBooking] = useState<Booking | null>(null);
	const [isBookingDetailsModalOpen, setIsBookingDetailsModalOpen] =
		useState(false);
	const [isBlockTimeModalOpen, setIsBlockTimeModalOpen] = useState(false);
	const [statusFilter, setStatusFilter] = useState<string>('all');
	const [dateFilter, setDateFilter] = useState<string>('all');
	const [searchQuery, setSearchQuery] = useState<string>('');
	const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');
	const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
	const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
	const [selectedDate, setSelectedDate] = useState<Date | null>(null);
	const [showDaySchedule, setShowDaySchedule] = useState(false);
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage] = useState(20);
	const router = useRouter();

	const {
		salonId,
		isLoading: salonLoading,
		hasSalon,
		salonData,
	} = useOwnerLayout();

	// P1: Параллельно загружаем независимые данные
	// Bookings и TimeBlocks не зависят от salonId, загружаем сразу
	const {
		data: bookingsData = [],
		isLoading: bookingsLoading,
		error: bookingsError,
		refetch: refetchBookings,
	} = useBookings();

	const {
		data: timeBlocks = [],
		isLoading: timeBlocksLoading,
		error: timeBlocksError,
	} = useTimeBlocks();

	// Staff и Services зависят от salonId, но загружаются параллельно друг с другом
	const { data: staffMembers = [], isLoading: staffLoading } = useStaffBySalon(
		salonId || ''
	);

	const { data: services = [], isLoading: servicesLoading } = useServices(
		salonId || '',
		{}
	);

	const bookings = convertBookingDtoArray(bookingsData);
	const loading = bookingsLoading;
	const error = bookingsError
		? bookingsError instanceof Error
			? bookingsError.message
			: 'Failed to load bookings'
		: null;

	const fetchBookings = useCallback(async () => {
		try {
			const {
				data: { session },
			} = await supabase.auth.getSession();
			await refetchBookings();
		} catch (err) {
			console.error('Error refetching bookings:', err);
			toast.error(t('owner.dashboard.failedToRefresh'));
		}
	}, [refetchBookings]);

	const updateCompletedBookings = useCallback(
		async (bookings: Booking[]): Promise<Booking[]> => {
			const now = new Date();
			const bookingsToUpdate: string[] = [];

			bookings.forEach((booking) => {
				// Only auto-complete CONFIRMED bookings that have passed
				// Don't change NOSHOW or already COMPLETED bookings
				if (booking.status === 'CONFIRMED') {
					const bookingTime = safeParseDate(booking.time);
					if (!bookingTime) return;

					const serviceDuration = booking.service?.duration || 60;
					const endTime = new Date(
						bookingTime.getTime() + serviceDuration * 60000
					);

					if (endTime < now) {
						bookingsToUpdate.push(booking.id);
					}
				}
			});

			if (bookingsToUpdate.length > 0) {
				try {
					await apiClient.put('/bookings/update-completed', {
						bookingIds: bookingsToUpdate,
					});
				} catch (error) {
					console.error('Error updating completed bookings:', error);
				}
			}

			return bookings.map((booking) => {
				if (bookingsToUpdate.includes(booking.id)) {
					return { ...booking, status: 'COMPLETED' as const };
				}
				return booking;
			});
		},
		[]
	);

	useEffect(() => {
		if (!salonLoading && !hasSalon) {
			router.push('/business/complete-setup');
		}
	}, [
		router,
		salonLoading,
		hasSalon,
		salonId,
		bookingsLoading,
		bookings.length,
	]);

	// Open booking modal if there's a pending booking after OAuth
	useEffect(() => {
		const checkPendingBooking = () => {
			const pendingBooking = localStorage.getItem('pendingBooking');
			if (pendingBooking && !isBookingModalOpen) {
				try {
					const bookingData = JSON.parse(pendingBooking);
					// Only open if this is from OAuth (has returnUrl)
					if (bookingData.returnUrl) {
						console.log(
							'Opening booking modal for pending booking after OAuth'
						);
						setIsBookingModalOpen(true);
					}
				} catch (error) {
					console.error('Error parsing pending booking:', error);
				}
			}
		};

		// Check immediately
		checkPendingBooking();

		// Also check after a short delay to catch OAuth redirects
		const timeout = setTimeout(checkPendingBooking, 500);
		return () => clearTimeout(timeout);
	}, [isBookingModalOpen]);

	const handleNewAppointment = useCallback(() => {
		// Check if salon has services and staff
		if (!services || services.length === 0) {
			toast.error(t('owner.calendar.cannotCreateBooking.noServices'));
			return;
		}
		if (!staffMembers || staffMembers.length === 0) {
			toast.error(t('owner.calendar.cannotCreateBooking.noStaff'));
			return;
		}

		setSelectedService(undefined);
		setEditingBooking(null);
		setIsBookingModalOpen(true);
	}, [services, staffMembers, t]);

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
				await apiClient.put(`/bookings/${bookingId}/cancel`);
				toast.success(t('owner.dashboard.bookingCancelled'));
				fetchBookings();
			} catch (err) {
				const errorMessage =
					err instanceof Error
						? err.message
						: t('owner.dashboard.failedToCancel');
				toast.error(errorMessage);
			}
		},
		[fetchBookings]
	);

	const handleConfirmBooking = useCallback(
		async (bookingId: string) => {
			try {
				await apiClient.put(`/bookings/${bookingId}`, { status: 'CONFIRMED' });
				toast.success(t('owner.dashboard.bookingConfirmed'));
				fetchBookings();
			} catch (err) {
				const errorMessage =
					err instanceof Error
						? err.message
						: t('owner.dashboard.failedToConfirm');
				toast.error(errorMessage);
			}
		},
		[fetchBookings]
	);

	const handleRejectBooking = useCallback(
		async (bookingId: string) => {
			try {
				await apiClient.put(`/bookings/${bookingId}`, { status: 'CANCELED' });
				toast.success(t('owner.dashboard.bookingRejected'));
				fetchBookings();
			} catch (err) {
				const errorMessage =
					err instanceof Error
						? err.message
						: t('owner.dashboard.failedToReject');
				toast.error(errorMessage);
			}
		},
		[fetchBookings]
	);

	const handleMarkAsNoShow = useCallback(
		async (bookingId: string) => {
			try {
				await apiClient.put(`/bookings/${bookingId}`, { status: 'NOSHOW' });
				toast.success(t('owner.calendar.bookingMarkedNoShow'));
				fetchBookings();
			} catch (err) {
				const errorMessage =
					err instanceof Error
						? err.message
						: t('owner.calendar.failedToMarkNoShow');
				toast.error(errorMessage);
			}
		},
		[fetchBookings]
	);

	const getFilteredBookings = useMemo(() => {
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

			let statusMatch = true;
			if (statusFilter !== 'all') {
				statusMatch = booking.status === statusFilter;
			}

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

			// Search filter by client name or phone
			let searchMatch = true;
			if (searchQuery.trim()) {
				const query = searchQuery.toLowerCase();
				const clientName = booking.user?.name?.toLowerCase() || '';
				const clientPhone = booking.user?.phone?.toLowerCase() || '';
				searchMatch = clientName.includes(query) || clientPhone.includes(query);
			}

			return statusMatch && dateMatch && searchMatch;
		});
	}, [bookings, statusFilter, dateFilter, searchQuery]);

	const getTotalPages = useMemo(() => {
		return Math.ceil(getFilteredBookings.length / itemsPerPage);
	}, [getFilteredBookings.length, itemsPerPage]);

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

	const handleSearchChange = useCallback((query: string) => {
		setSearchQuery(query);
		setCurrentPage(1);
	}, []);

	const handlePageChange = useCallback((page: number) => {
		setCurrentPage(page);
	}, []);

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

	const handleBackToMonth = useCallback(() => {
		setShowDaySchedule(false);
		setSelectedDate(null);
	}, []);

	const handlePrevDay = useCallback(() => {
		if (selectedDate) {
			const prevDay = new Date(selectedDate);
			prevDay.setDate(prevDay.getDate() - 1);
			setSelectedDate(prevDay);
			// Update current month if needed
			if (
				prevDay.getMonth() !== currentMonth ||
				prevDay.getFullYear() !== currentYear
			) {
				setCurrentMonth(prevDay.getMonth());
				setCurrentYear(prevDay.getFullYear());
			}
		}
	}, [selectedDate, currentMonth, currentYear]);

	const handleNextDay = useCallback(() => {
		if (selectedDate) {
			const nextDay = new Date(selectedDate);
			nextDay.setDate(nextDay.getDate() + 1);
			setSelectedDate(nextDay);
			// Update current month if needed
			if (
				nextDay.getMonth() !== currentMonth ||
				nextDay.getFullYear() !== currentYear
			) {
				setCurrentMonth(nextDay.getMonth());
				setCurrentYear(nextDay.getFullYear());
			}
		}
	}, [selectedDate, currentMonth, currentYear]);

	useEffect(() => {
		if (!salonLoading && !hasSalon) {
			router.push('/business/complete-setup');
		}
	}, [hasSalon, salonLoading, router]);

	if (salonLoading) {
		return (
			<div
				className="flex items-center justify-center py-12"
				role="status"
				aria-live="polite"
			>
				<LoadingSpinner
					size="lg"
					message={t('owner.calendar.loadingCalendarData')}
				/>
			</div>
		);
	}

	if (!hasSalon) {
		return (
			<div
				className="flex items-center justify-center py-12"
				role="status"
				aria-live="polite"
			>
				<LoadingSpinner
					size="lg"
					message={t('owner.calendar.redirectingToSetup')}
				/>
			</div>
		);
	}

	if (bookingsLoading) {
		return (
			<div
				className="flex items-center justify-center py-12"
				role="status"
				aria-live="polite"
			>
				<LoadingSpinner
					size="lg"
					message={t('owner.calendar.loadingBookings')}
				/>
			</div>
		);
	}

	if (error && hasSalon) {
		return (
			<div className="flex items-center justify-center py-12" role="alert">
				<ErrorDisplay
					error={new Error(error)}
					onRetry={fetchBookings}
					message={t('owner.calendar.failedToLoad')}
				/>
			</div>
		);
	}

	return (
		<main
			className="flex gap-4 md:gap-6"
			role="main"
			aria-labelledby="calendar-heading"
		>
			<div className="w-full max-w-7xl mx-auto px-0 md:px-4">
				<div className="mb-6 md:mb-8">
					{/* Header */}
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
						<h1
							id="calendar-heading"
							className="text-2xl md:text-3xl font-bold text-black"
						>
							{t('owner.calendar.title')}
						</h1>

						<div
							className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
							role="group"
							aria-label="View mode and new appointment"
						>
							{/* View Mode Toggle */}
							<div className="flex border border-gray-300 rounded-lg overflow-hidden">
								<button
									onClick={() => {
										setViewMode('list');
										setShowDaySchedule(false);
										setCurrentPage(1);
									}}
									className={`flex-1 sm:flex-none px-3 py-2 text-sm font-medium flex items-center justify-center gap-2 ${
										viewMode === 'list'
											? 'bg-[#ea4b4b] text-white'
											: 'bg-white text-gray-700 hover:bg-gray-50'
									}`}
									aria-pressed={viewMode === 'list'}
									aria-label={t('owner.calendar.switchToListView')}
								>
									<List className="w-4 h-4" />
									<span className="hidden sm:inline">
										{t('owner.calendar.list')}
									</span>
								</button>
								<button
									onClick={() => {
										setViewMode('calendar');
										setShowDaySchedule(false);
										setCurrentPage(1);
									}}
									className={`flex-1 sm:flex-none px-3 py-2 text-sm font-medium flex items-center justify-center gap-2 ${
										viewMode === 'calendar'
											? 'bg-[#ea4b4b] text-white'
											: 'bg-white text-gray-700 hover:bg-gray-50'
									}`}
									aria-pressed={viewMode === 'calendar'}
									aria-label={t('owner.calendar.switchToCalendarView')}
								>
									<CalendarDays className="w-4 h-4" />
									<span className="hidden sm:inline">
										{t('owner.calendar.title')}
									</span>
								</button>
							</div>

							{/* Action Buttons */}
							<div className="flex gap-3">
								<button
									onClick={() => setIsBlockTimeModalOpen(true)}
									className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-lg border-2 border-gray-300 bg-white text-gray-700 px-3 md:px-4 py-2 text-sm shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-colors"
									aria-label={t('owner.calendar.blockTime')}
								>
									<Ban className="w-4 h-4" />
									<span className="hidden sm:inline">
										{t('owner.calendar.blockTime')}
									</span>
								</button>

								<button
									onClick={handleNewAppointment}
									className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-full bg-[#ea4b4b] text-white px-3 md:px-4 py-2 text-sm shadow-sm hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[#ea4b4b] focus:ring-offset-2 whitespace-nowrap"
									aria-label={t('owner.calendar.addNewAppointment')}
								>
									<span className="text-lg leading-none" aria-hidden="true">
										＋
									</span>
									<span className="hidden sm:inline">
										{t('owner.calendar.newAppointment')}
									</span>
									<span className="sm:hidden">{t('owner.calendar.new')}</span>
								</button>
							</div>
						</div>
					</div>
				</div>

				<div className="flex justify-between gap-6">
					{!showDaySchedule ? (
						<>
							{viewMode === 'list' ? (
								<BookingList
									bookings={getFilteredBookings}
									loading={loading}
									error={error}
									statusFilter={statusFilter}
									dateFilter={dateFilter}
									searchQuery={searchQuery}
									currentPage={currentPage}
									itemsPerPage={itemsPerPage}
									totalPages={getTotalPages}
									onFilterChange={handleFilterChange}
									onSearchChange={handleSearchChange}
									onEditBooking={handleEditBooking}
									onCancelBooking={handleCancelBooking}
									onConfirmBooking={handleConfirmBooking}
									onRejectBooking={handleRejectBooking}
									onViewBookingDetails={handleViewBookingDetails}
									onRetry={fetchBookings}
									onPageChange={handlePageChange}
								/>
							) : (
								<CalendarView
									currentMonth={currentMonth}
									currentYear={currentYear}
									bookings={bookings}
									timeBlocks={timeBlocks}
									workingHours={salonData?.workingHours}
									onPreviousMonth={goToPreviousMonth}
									onNextMonth={goToNextMonth}
									onDateClick={handleDateClick}
								/>
							)}
						</>
					) : selectedDate ? (
						<DaySchedule
							selectedDate={selectedDate}
							bookings={bookings}
							timeBlocks={timeBlocks}
							staffMembers={staffMembers}
							workingHours={salonData?.workingHours}
							onBack={handleBackToMonth}
							onViewBookingDetails={handleViewBookingDetails}
							onPrevDay={handlePrevDay}
							onNextDay={handleNextDay}
						/>
					) : null}
				</div>
			</div>

			<BookingModal
				isOpen={isBookingModalOpen}
				onClose={handleBookingModalClose}
				service={selectedService}
				showServiceSelector={true}
				salonId={salonId || undefined}
				workingHours={salonData?.workingHours}
				editingBooking={editingBooking}
				onBookingUpdated={handleBookingUpdated}
			/>

			<BookingDetailsModal
				isOpen={isBookingDetailsModalOpen}
				booking={viewingBooking}
				onClose={handleBookingDetailsModalClose}
				onMarkAsNoShow={handleMarkAsNoShow}
				onEdit={handleEditFromDetails}
				onCancel={handleCancelBooking}
			/>

			<BlockTimeModal
				isOpen={isBlockTimeModalOpen}
				onClose={() => setIsBlockTimeModalOpen(false)}
			/>
		</main>
	);
}
