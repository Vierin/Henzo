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
import { useSalonId } from '@/hooks/useSalon';
import { useCurrentUserSalon } from '@/hooks/useSalons';
import { useBookings } from '@/hooks/useBookings';
import { BookingWithDetailsDto } from '@/types/dto/booking.dto';

// Import calendar components
import BookingList from './components/BookingList';
import CalendarView from './components/CalendarView';
import BookingDetailsModal from './components/BookingDetailsModal';
import DaySchedule from './components/DaySchedule';
import { CalendarDays, List } from 'lucide-react';

// Функция для преобразования BookingWithDetailsDto в Booking
const convertBookingDtoToBooking = (dto: any): Booking => {
	return {
		id: dto.id,
		salonId: dto.salonId,
		userId: dto.userId,
		clientId: dto.clientId || dto.userId,
		serviceId: dto.serviceId,
		staffId: dto.staffId,
		time: dto.time || dto.dateTime,
		status: dto.status,
		notes: dto.notes,
		createdAt: dto.createdAt,
		service: dto.service
			? {
					id: dto.service.id,
					name: dto.service.name || '',
					description: dto.service.description,
					duration: dto.service.duration,
					price: dto.service.price,
					salonId: dto.salonId,
				}
			: undefined,
		salon: dto.salon
			? {
					id: dto.salon.id,
					name: dto.salon.name,
					address: dto.salon.address,
					ownerId: '',
					createdAt: '',
				}
			: undefined,
		staff: dto.staff
			? {
					id: dto.staff.id,
					name: dto.staff.name,
					role: dto.staff.accessLevel,
					accessLevel: dto.staff.accessLevel as 'ADMIN' | 'EMPLOYEE',
					salonId: dto.salonId,
				}
			: undefined,
		user: dto.user
			? {
					id: dto.user.id,
					email: dto.user.email,
					name: dto.user.name,
					phone: dto.user.phone,
					role: 'CLIENT',
					createdAt: '',
				}
			: undefined,
	};
};

export default function CalendarClient() {
	const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
	const [selectedService, setSelectedService] = useState<Service | undefined>();
	const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
	const [viewingBooking, setViewingBooking] = useState<Booking | null>(null);
	const [isBookingDetailsModalOpen, setIsBookingDetailsModalOpen] =
		useState(false);
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

	const { salonId, isLoading: salonLoading, hasSalon, salon } = useSalonId();
	const { data: salonData, isLoading: salonDataLoading } =
		useCurrentUserSalon();

	const {
		data: bookingsData = [],
		isLoading: bookingsLoading,
		error: bookingsError,
		refetch: refetchBookings,
	} = useBookings();

	const bookings = bookingsData.map(convertBookingDtoToBooking);
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
			toast.error('Failed to refresh bookings');
		}
	}, [refetchBookings]);

	const updateCompletedBookings = useCallback(
		async (bookings: Booking[]): Promise<Booking[]> => {
			const now = new Date();
			const bookingsToUpdate: string[] = [];

			bookings.forEach((booking) => {
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
				await apiClient.put(`/bookings/${bookingId}/cancel`);
				toast.success('Booking cancelled successfully');
				fetchBookings();
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : 'Failed to cancel booking';
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
			return statusMatch && dateMatch;
		});
	}, [bookings, statusFilter, dateFilter]);

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

	if (salonLoading || salonDataLoading) {
		return (
			<div
				className="flex items-center justify-center py-12"
				role="status"
				aria-live="polite"
			>
				<LoadingSpinner size="lg" />
				<span className="sr-only">Loading calendar data...</span>
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
				<LoadingSpinner size="lg" />
				<span className="sr-only">Redirecting to salon setup...</span>
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
				<LoadingSpinner size="lg" />
				<span className="sr-only">Loading bookings...</span>
			</div>
		);
	}

	if (error && hasSalon) {
		return (
			<div className="flex items-center justify-center py-12" role="alert">
				<ErrorDisplay
					error={new Error(error)}
					onRetry={fetchBookings}
					message="Failed to load calendar data."
				/>
			</div>
		);
	}

	return (
		<main className="flex gap-6" role="main" aria-labelledby="calendar-heading">
			<div className="w-full">
				<div className="mb-8 flex items-center justify-between">
					<h1
						id="calendar-heading"
						className="text-3xl font-bold text-black mb-2"
					>
						Calendar
					</h1>

					<div
						className="flex items-center gap-2"
						role="group"
						aria-label="View mode and new appointment"
					>
						<div className="flex border border-gray-300 rounded-lg overflow-hidden">
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
								aria-pressed={viewMode === 'list'}
								aria-label="Switch to list view"
							>
								<List className="w-4 h-4" />
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
								aria-pressed={viewMode === 'calendar'}
								aria-label="Switch to calendar view"
							>
								<CalendarDays className="w-4 h-4" />
								Calendar
							</button>
						</div>

						<button
							onClick={handleNewAppointment}
							className="inline-flex items-center gap-2 rounded-full bg-[#ea4b4b] text-white px-4 py-2 text-sm shadow-sm hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[#ea4b4b] focus:ring-offset-2"
							aria-label="Add new appointment"
						>
							<span className="text-lg leading-none" aria-hidden="true">
								＋
							</span>
							New Appointment
						</button>
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
									currentPage={currentPage}
									itemsPerPage={itemsPerPage}
									totalPages={getTotalPages}
									onFilterChange={handleFilterChange}
									onEditBooking={handleEditBooking}
									onCancelBooking={handleCancelBooking}
									onViewBookingDetails={handleViewBookingDetails}
									onRetry={fetchBookings}
									onPageChange={handlePageChange}
								/>
							) : (
								<CalendarView
									currentMonth={currentMonth}
									currentYear={currentYear}
									bookings={bookings}
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
				onEdit={handleEditFromDetails}
				onCancel={handleCancelBooking}
			/>
		</main>
	);
}
