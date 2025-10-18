'use client';

import { useMemo, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useBookings } from '@/hooks/useBookings';
import { useSalonId } from '@/hooks/useSalon';
import { useCurrentUserSalon } from '@/hooks/useSalons';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorDisplay from '@/components/ErrorDisplay';
import StatsCard from './components/StatsCard';
import UpcomingBookingsList from './components/UpcomingBookingsList';
import TopServicesCard from './components/TopServicesCard';
import AdditionalMetrics from './components/AdditionalMetrics';
import BookingModal from '@/components/BookingModal';
import { Service, Booking } from '@/types';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';
import {
	DollarSign,
	Users,
	CalendarCheck,
	TrendingUp,
	Calendar,
} from 'lucide-react';
import { safeParseDate } from '@/utils/date';
import Link from 'next/link';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';

const convertBookingDtoToBooking = (dto: any) => {
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
					role: 'CLIENT' as const,
					createdAt: '',
				}
			: undefined,
	};
};

export default function OwnerDashboardClient() {
	const router = useRouter();
	const [period, setPeriod] = useState<'7d' | '30d' | '1y'>('30d');
	const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
	const [selectedService, setSelectedService] = useState<Service | undefined>();
	const [editingBooking, setEditingBooking] = useState<Booking | null>(null);

	const { salonId, isLoading: salonLoading, hasSalon } = useSalonId();
	const { data: salonData } = useCurrentUserSalon();
	const {
		data: bookingsData = [],
		isLoading: bookingsLoading,
		error: bookingsError,
		refetch: refetchBookings,
	} = useBookings();

	const bookings = bookingsData.map(convertBookingDtoToBooking);

	useEffect(() => {
		if (!salonLoading && !hasSalon) {
			router.push('/business/complete-setup');
		}
	}, [hasSalon, salonLoading, router]);

	// Calculate stats
	const stats = useMemo(() => {
		const now = new Date();

		// Определяем период
		let periodDays: number;
		switch (period) {
			case '7d':
				periodDays = 7;
				break;
			case '30d':
				periodDays = 30;
				break;
			case '1y':
				periodDays = 365;
				break;
			default:
				periodDays = 30;
		}

		const periodStart = new Date(
			now.getTime() - periodDays * 24 * 60 * 60 * 1000
		);
		const previousPeriodStart = new Date(
			periodStart.getTime() - periodDays * 24 * 60 * 60 * 1000
		);

		// Current period bookings
		const currentPeriodBookings = bookings.filter((booking) => {
			const bookingDate = safeParseDate(booking.time);
			if (!bookingDate) return false;
			return bookingDate >= periodStart && bookingDate <= now;
		});

		// Previous period bookings (for comparison)
		const previousPeriodBookings = bookings.filter((booking) => {
			const bookingDate = safeParseDate(booking.time);
			if (!bookingDate) return false;
			return bookingDate >= previousPeriodStart && bookingDate < periodStart;
		});

		// Revenue for current period
		const currentRevenue = currentPeriodBookings
			.filter((b) => b.status === 'COMPLETED')
			.reduce((sum, b) => sum + (b.service?.price || 0), 0);

		const previousRevenue = previousPeriodBookings
			.filter((b) => b.status === 'COMPLETED')
			.reduce((sum, b) => sum + (b.service?.price || 0), 0);

		// Unique clients for current period
		const currentClients = new Set(currentPeriodBookings.map((b) => b.userId))
			.size;
		const previousClients = new Set(previousPeriodBookings.map((b) => b.userId))
			.size;

		// Total bookings for current period
		const currentTotal = currentPeriodBookings.length;
		const previousTotal = previousPeriodBookings.length;

		// Completion rate
		const completedCurrent = currentPeriodBookings.filter(
			(b) => b.status === 'COMPLETED'
		).length;
		const completionRate =
			currentTotal > 0
				? Math.round((completedCurrent / currentTotal) * 100)
				: 0;

		const completedPrevious = previousPeriodBookings.filter(
			(b) => b.status === 'COMPLETED'
		).length;
		const previousCompletionRate =
			previousTotal > 0
				? Math.round((completedPrevious / previousTotal) * 100)
				: 0;

		// Calculate trends
		const revenueTrend =
			previousRevenue > 0
				? Math.round(
						((currentRevenue - previousRevenue) / previousRevenue) * 100
					)
				: 0;
		const clientsTrend =
			previousClients > 0
				? Math.round(
						((currentClients - previousClients) / previousClients) * 100
					)
				: 0;
		const bookingsTrend =
			previousTotal > 0
				? Math.round(((currentTotal - previousTotal) / previousTotal) * 100)
				: 0;
		const completionTrend = completionRate - previousCompletionRate;

		return {
			revenue: currentRevenue,
			revenueTrend,
			clients: currentClients,
			clientsTrend,
			bookings: currentTotal,
			bookingsTrend,
			completionRate,
			completionTrend,
		};
	}, [bookings, period]);

	// Upcoming bookings (next 7 days, not past, confirmed or pending)
	const upcomingBookings = useMemo(() => {
		const now = new Date();
		const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

		return bookings
			.filter((booking) => {
				const bookingDate = safeParseDate(booking.time);
				if (!bookingDate) return false;

				return (
					bookingDate >= now &&
					bookingDate <= sevenDaysFromNow &&
					(booking.status === 'CONFIRMED' || booking.status === 'PENDING')
				);
			})
			.sort((a, b) => {
				const dateA = safeParseDate(a.time);
				const dateB = safeParseDate(b.time);
				if (!dateA || !dateB) return 0;
				return dateA.getTime() - dateB.getTime();
			});
	}, [bookings]);

	// Handlers for bookings
	const handleEditBooking = useCallback((booking: Booking) => {
		setEditingBooking(booking);
		setSelectedService(undefined);
		setIsBookingModalOpen(true);
	}, []);

	const handleCancelBooking = useCallback(
		async (bookingId: string) => {
			try {
				await apiClient.put(`/bookings/${bookingId}/cancel`);
				toast.success('Booking cancelled successfully');
				refetchBookings();
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : 'Failed to cancel booking';
				toast.error(errorMessage);
			}
		},
		[refetchBookings]
	);

	const handleConfirmBooking = useCallback(
		async (bookingId: string) => {
			try {
				await apiClient.put(`/bookings/${bookingId}`, { status: 'CONFIRMED' });
				toast.success('Booking confirmed successfully');
				refetchBookings();
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : 'Failed to confirm booking';
				toast.error(errorMessage);
			}
		},
		[refetchBookings]
	);

	const handleRejectBooking = useCallback(
		async (bookingId: string) => {
			try {
				await apiClient.put(`/bookings/${bookingId}`, { status: 'CANCELED' });
				toast.success('Booking rejected successfully');
				refetchBookings();
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : 'Failed to reject booking';
				toast.error(errorMessage);
			}
		},
		[refetchBookings]
	);

	const handleBookingModalClose = useCallback(() => {
		setIsBookingModalOpen(false);
		setEditingBooking(null);
		refetchBookings();
	}, [refetchBookings]);

	const handleBookingUpdated = useCallback(() => {
		refetchBookings();
	}, [refetchBookings]);

	if (salonLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<LoadingSpinner size="lg" />
				<span className="sr-only">Loading dashboard...</span>
			</div>
		);
	}

	if (!hasSalon) {
		return (
			<div className="flex items-center justify-center py-12">
				<LoadingSpinner size="lg" />
				<span className="sr-only">Redirecting to salon setup...</span>
			</div>
		);
	}

	if (bookingsError) {
		return (
			<div className="flex items-center justify-center py-12">
				<ErrorDisplay
					error={
						bookingsError instanceof Error
							? bookingsError
							: new Error('Failed to load bookings')
					}
					onRetry={refetchBookings}
					message="Failed to load dashboard data."
				/>
			</div>
		);
	}

	return (
		<main className="space-y-6">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div>
					<h1 className="text-2xl sm:text-3xl font-bold text-black">
						Dashboard
					</h1>
					<p className="text-gray-600 mt-1 text-sm sm:text-base">
						Welcome back! Here's your business overview
					</p>
				</div>
				<div className="flex flex-row items-stretch sm:items-center gap-3">
					<Select
						value={period}
						onValueChange={(value: '7d' | '30d' | '1y') => setPeriod(value)}
					>
						<SelectTrigger className="w-full sm:w-[180px] border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] text-gray-900 bg-white">
							<SelectValue />
						</SelectTrigger>
						<SelectContent className="bg-white border border-gray-300 shadow-lg rounded-md">
							<SelectItem
								value="7d"
								className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
							>
								Last 7 days
							</SelectItem>
							<SelectItem
								value="30d"
								className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
							>
								Last 30 days
							</SelectItem>
							<SelectItem
								value="1y"
								className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
							>
								Last 1 year
							</SelectItem>
						</SelectContent>
					</Select>
					<button
						onClick={() => {
							setSelectedService(undefined);
							setEditingBooking(null);
							setIsBookingModalOpen(true);
						}}
						className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ea4b4b] text-white px-4 py-2 text-sm shadow-sm hover:opacity-95 transition-opacity focus:outline-none focus:ring-2 focus:ring-[#ea4b4b] focus:ring-offset-2 w-full sm:w-auto"
					>
						<span className="text-lg leading-none">＋</span>
						New Appointment
					</button>
				</div>
			</div>

			{/* Stats Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 md:gap-6">
				<StatsCard
					title="Total Revenue"
					value={`${stats.revenue.toLocaleString()}₫`}
					icon={<DollarSign className="w-6 h-6" />}
					subtitle={
						period === '7d'
							? 'Last 7 days'
							: period === '30d'
								? 'Last 30 days'
								: 'Last year'
					}
					trend={
						stats.revenueTrend !== 0
							? {
									value: `${Math.abs(stats.revenueTrend)}%`,
									isPositive: stats.revenueTrend > 0,
								}
							: undefined
					}
				/>
				<StatsCard
					title="Total Clients"
					value={stats.clients}
					icon={<Users className="w-6 h-6" />}
					subtitle={
						period === '7d'
							? 'Last 7 days'
							: period === '30d'
								? 'Last 30 days'
								: 'Last year'
					}
					trend={
						stats.clientsTrend !== 0
							? {
									value: `${Math.abs(stats.clientsTrend)}%`,
									isPositive: stats.clientsTrend > 0,
								}
							: undefined
					}
				/>
				<StatsCard
					title="Bookings"
					value={stats.bookings}
					icon={<CalendarCheck className="w-6 h-6" />}
					subtitle={
						period === '7d'
							? 'Last 7 days'
							: period === '30d'
								? 'Last 30 days'
								: 'Last year'
					}
					trend={
						stats.bookingsTrend !== 0
							? {
									value: `${Math.abs(stats.bookingsTrend)}%`,
									isPositive: stats.bookingsTrend > 0,
								}
							: undefined
					}
				/>
				<StatsCard
					title="Completion Rate"
					value={`${stats.completionRate}%`}
					icon={<TrendingUp className="w-6 h-6" />}
					subtitle={
						period === '7d'
							? 'Last 7 days'
							: period === '30d'
								? 'Last 30 days'
								: 'Last year'
					}
					trend={
						stats.completionTrend !== 0
							? {
									value: `${Math.abs(stats.completionTrend)}%`,
									isPositive: stats.completionTrend > 0,
								}
							: undefined
					}
				/>
			</div>

			{/* Two Column Grid for Top Services and Additional Metrics */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<TopServicesCard bookings={bookings} />
				<AdditionalMetrics bookings={bookings} />
			</div>

			{/* Upcoming Bookings List */}
			<UpcomingBookingsList
				bookings={upcomingBookings}
				loading={bookingsLoading}
				onEditBooking={handleEditBooking}
				onCancelBooking={handleCancelBooking}
				onConfirmBooking={handleConfirmBooking}
				onRejectBooking={handleRejectBooking}
			/>

			{/* Booking Modal */}
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
		</main>
	);
}
