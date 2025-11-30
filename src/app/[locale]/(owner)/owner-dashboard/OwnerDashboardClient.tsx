'use client';

import { useMemo, useState, useCallback } from 'react';
import { useBookings } from '@/hooks/useBookings';
import { useOwnerLayout } from '@/contexts/OwnerLayoutContext';
import { useServices } from '@/hooks/useServices';
import { useStaffBySalon } from '@/hooks/useStaff';
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
import { DollarSign, Users, CalendarCheck, TrendingUp } from 'lucide-react';
import { safeParseDate } from '@/utils/date';
import { formatVND } from '@/utils/currency';
import { convertBookingDtoArray } from '@/utils/bookingTransformers';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '@/contexts/LanguageContext';

export default function OwnerDashboardClient() {
	const [period, setPeriod] = useState<'7d' | '30d' | '1y'>('30d');
	const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
	const [selectedService, setSelectedService] = useState<Service | undefined>();
	const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
	const t = useTranslation();

	const { salonId, isLoading, hasSalon, salonData } = useOwnerLayout();
	const {
		data: bookingsData = [],
		isLoading: bookingsLoading,
		error: bookingsError,
		refetch: refetchBookings,
	} = useBookings();

	const { data: services = [] } = useServices(salonId || '', {});
	const { data: staffMembers = [] } = useStaffBySalon(salonId || '');

	const bookings = convertBookingDtoArray(bookingsData);

	// Calculate stats using optimized hook
	const stats = useDashboardStats(bookings, period);

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
				toast.success(t.owner.bookingCancelled);
				refetchBookings();
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : t.owner.failedToCancel;
				toast.error(errorMessage);
			}
		},
		[refetchBookings, t]
	);

	const handleConfirmBooking = useCallback(
		async (bookingId: string) => {
			try {
				await apiClient.put(`/bookings/${bookingId}`, { status: 'CONFIRMED' });
				toast.success(t.owner.bookingConfirmed);
				refetchBookings();
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : t.owner.failedToConfirm;
				toast.error(errorMessage);
			}
		},
		[refetchBookings, t]
	);

	const handleRejectBooking = useCallback(
		async (bookingId: string) => {
			try {
				await apiClient.put(`/bookings/${bookingId}`, { status: 'CANCELED' });
				toast.success(t.owner.bookingRejected);
				refetchBookings();
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : t.owner.failedToReject;
				toast.error(errorMessage);
			}
		},
		[refetchBookings, t]
	);

	const handleBookingModalClose = useCallback(() => {
		setIsBookingModalOpen(false);
		setEditingBooking(null);
		refetchBookings();
	}, [refetchBookings]);

	const handleBookingUpdated = useCallback(() => {
		refetchBookings();
	}, [refetchBookings]);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<LoadingSpinner size="lg" />
				<span className="sr-only">{t.owner.loadingDashboard}</span>
			</div>
		);
	}

	if (!hasSalon) {
		return (
			<div className="flex items-center justify-center py-12">
				<LoadingSpinner size="lg" />
				<span className="sr-only">{t.owner.redirectingToSetup}</span>
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
					message={t.owner.failedToLoadDashboard}
				/>
			</div>
		);
	}

	return (
		<main className="space-y-6 px-4 max-w-7xl mx-auto">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div>
					<h1 className="text-2xl sm:text-3xl font-bold text-black">
						{t.owner.dashboard}
					</h1>
					<p className="text-gray-600 mt-1 text-sm sm:text-base">
						{t.owner.welcomeBack} {t.owner.businessOverview}
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
								{t.owner.last7Days}
							</SelectItem>
							<SelectItem
								value="30d"
								className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
							>
								{t.owner.last30Days}
							</SelectItem>
							<SelectItem
								value="1y"
								className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
							>
								{t.owner.last1Year}
							</SelectItem>
						</SelectContent>
					</Select>
					<button
						onClick={() => {
							// Check if salon has services and staff
							if (!services || services.length === 0) {
								toast.error(t('owner.cannotCreateBooking.noServices'));
								return;
							}
							if (!staffMembers || staffMembers.length === 0) {
								toast.error(t('owner.cannotCreateBooking.noStaff'));
								return;
							}

							setSelectedService(undefined);
							setEditingBooking(null);
							setIsBookingModalOpen(true);
						}}
						className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ea4b4b] text-white px-4 py-2 text-sm shadow-sm hover:opacity-95 transition-opacity focus:outline-none focus:ring-2 focus:ring-[#ea4b4b] focus:ring-offset-2 w-full sm:w-auto"
					>
						<span className="text-lg leading-none">＋</span>
						{t.owner.newAppointment}
					</button>
				</div>
			</div>

			{/* Stats Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 md:gap-6">
				<StatsCard
					title={t.owner.totalRevenue}
					value={formatVND(stats.revenue)}
					icon={<DollarSign className="w-6 h-6" />}
					subtitle={
						period === '7d'
							? t.owner.last7Days
							: period === '30d'
								? t.owner.last30Days
								: t.owner.last1Year
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
					title={t.owner.totalClients}
					value={stats.clients}
					icon={<Users className="w-6 h-6" />}
					subtitle={
						period === '7d'
							? t.owner.last7Days
							: period === '30d'
								? t.owner.last30Days
								: t.owner.last1Year
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
					title={t.owner.bookings}
					value={stats.bookings}
					icon={<CalendarCheck className="w-6 h-6" />}
					subtitle={
						period === '7d'
							? t.owner.last7Days
							: period === '30d'
								? t.owner.last30Days
								: t.owner.last1Year
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
					title={t.owner.completionRate}
					value={`${stats.completionRate}%`}
					icon={<TrendingUp className="w-6 h-6" />}
					subtitle={
						period === '7d'
							? t.owner.last7Days
							: period === '30d'
								? t.owner.last30Days
								: t.owner.last1Year
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

			{/* Upcoming Bookings List */}
			<UpcomingBookingsList
				bookings={upcomingBookings}
				loading={bookingsLoading}
				onEditBooking={handleEditBooking}
				onCancelBooking={handleCancelBooking}
				onConfirmBooking={handleConfirmBooking}
				onRejectBooking={handleRejectBooking}
			/>

			{/* Two Column Grid for Top Services and Additional Metrics */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<TopServicesCard bookings={bookings} />
				<AdditionalMetrics bookings={bookings} />
			</div>

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
