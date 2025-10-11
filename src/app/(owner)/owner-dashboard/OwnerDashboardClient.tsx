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

// Import our new components
import BookingList from './components/BookingList';
import CalendarView from './components/CalendarView';
import TodaysAppointments from './components/TodaysAppointments';
import BookingDetailsModal from './components/BookingDetailsModal';
import DaySchedule from './components/DaySchedule';
import { CalendarDays, List } from 'lucide-react';

// Функция для преобразования BookingWithDetailsDto в Booking
const convertBookingDtoToBooking = (dto: any): Booking => {
	return {
		id: dto.id,
		salonId: dto.salonId,
		userId: dto.userId,
		clientId: dto.clientId || dto.userId, // fallback to userId if clientId is missing
		serviceId: dto.serviceId,
		staffId: dto.staffId,
		time: dto.time || dto.dateTime, // fallback to dateTime if time is missing
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
					ownerId: '', // DTO не содержит ownerId
					createdAt: '', // DTO не содержит createdAt
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
					role: 'CLIENT', // DTO не содержит role, используем дефолтное значение
					createdAt: '', // DTO не содержит createdAt
				}
			: undefined,
	};
};

export default function OwnerDashboardClient() {
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

	// Получаем salonId через хук
	const { salonId, isLoading: salonLoading, hasSalon, salon } = useSalonId();

	// Получаем данные о салоне для рабочих часов
	const { data: salonData, isLoading: salonDataLoading } =
		useCurrentUserSalon();

	// Используем хук для загрузки бронирований
	const {
		data: bookingsData = [],
		isLoading: bookingsLoading,
		error: bookingsError,
		refetch: refetchBookings,
	} = useBookings();

	// Используем данные из хука вместо локального состояния
	console.log(
		'OwnerDashboard: Raw bookings data from API:',
		bookingsData.slice(0, 2)
	);
	const bookings = bookingsData.map(convertBookingDtoToBooking);
	console.log('OwnerDashboard: Converted bookings data:', bookings.slice(0, 2));
	const loading = bookingsLoading;
	const error = bookingsError
		? bookingsError instanceof Error
			? bookingsError.message
			: 'Failed to load bookings'
		: null;

	// Memoized functions for better performance
	const fetchBookings = useCallback(async () => {
		try {
			console.log('OwnerDashboard: Refetching bookings...');

			// Проверяем сессию перед запросом
			const {
				data: { session },
			} = await supabase.auth.getSession();
			console.log('OwnerDashboard: Current session:', {
				hasSession: !!session,
				userEmail: session?.user?.email,
				userRole: session?.user?.user_metadata?.role,
			});

			// Используем refetch из хука
			await refetchBookings();
			console.log('OwnerDashboard: Bookings refetched successfully');
		} catch (err) {
			console.error('OwnerDashboard: Error refetching bookings:', err);
			toast.error('Failed to refresh bookings');
		}
	}, [refetchBookings]);

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
					return { ...booking, status: 'COMPLETED' as const };
				}
				return booking;
			});
		},
		[]
	);

	useEffect(() => {
		console.log('OwnerDashboard useEffect triggered:', {
			salonLoading,
			hasSalon,
			salonId,
			bookingsLoading,
			bookingsCount: bookings.length,
		});

		// Redirect to setup if no salon found
		if (!salonLoading && !hasSalon) {
			console.log('OwnerDashboard: No salon found, redirecting to setup');
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

	// Memoized event handlers
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

	// Memoized computed values
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
			setCurrentPage(1); // Reset to first page
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

	const handleViewAllAppointments = useCallback(() => {
		setViewMode('list');
		setCurrentPage(1);
	}, []);

	const handleBackToMonth = useCallback(() => {
		setShowDaySchedule(false);
		setSelectedDate(null);
	}, []);

	// Redirect to complete-setup if no salon found
	useEffect(() => {
		if (!salonLoading && !hasSalon) {
			router.push('/business/complete-setup');
		}
	}, [hasSalon, salonLoading, router]);

	// Loading and error states
	if (salonLoading || salonDataLoading) {
		return (
			<div
				className="flex items-center justify-center py-12"
				role="status"
				aria-live="polite"
			>
				<LoadingSpinner size="lg" />
				<span className="sr-only">Loading dashboard data...</span>
			</div>
		);
	}

	// If no salon, показываем loading пока происходит редирект
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

	// Показываем loading для bookings после того как салон загружен
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

	// Показываем ошибку только если есть салон, но не загружаются bookings
	if (error && hasSalon) {
		return (
			<div className="flex items-center justify-center py-12" role="alert">
				<ErrorDisplay
					error={new Error(error)}
					onRetry={fetchBookings}
					message="Failed to load dashboard data."
				/>
			</div>
		);
	}

	return (
		<main
			className="flex gap-6"
			role="main"
			aria-labelledby="dashboard-heading"
		>
			<div className="w-full">
				<div className="mb-8 flex items-center justify-between">
					<h1
						id="dashboard-heading"
						className="text-3xl font-bold text-black mb-2"
					>
						Appointments
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
						/>
					) : null}
				</div>
			</div>

			<TodaysAppointments
				bookings={bookings}
				onEditBooking={handleEditBooking}
				onCancelBooking={handleCancelBooking}
				onViewAllAppointments={handleViewAllAppointments}
			/>

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
