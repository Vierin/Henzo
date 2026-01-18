'use client';

import { useMemo, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
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
import {
	DollarSign,
	Users,
	CalendarCheck,
	TrendingUp,
	AlertCircle,
	X,
} from 'lucide-react';
import Link from 'next/link';
import { extractLocaleFromPath, withLocale } from '@/i18n/routing';
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
	const [showPhotoWarning, setShowPhotoWarning] = useState(true);
	const t = useTranslation();
	const pathname = usePathname();

	const { salonId, isLoading, hasSalon, salonData } = useOwnerLayout();

	// Check if salon has photos - only show warning if photos array is empty or doesn't exist
	const hasPhotos =
		salonData?.photos &&
		Array.isArray(salonData.photos) &&
		salonData.photos.length > 0;

	const locale = extractLocaleFromPath(pathname) ?? 'en';
	const settingsUrl = withLocale('/salon-info', locale as 'en' | 'ru' | 'vi');
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

	// Upcoming bookings (next 7 days, not past, confirmed or pending, max 12)
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
			})
			.slice(0, 12); // Limit to 12 bookings maximum
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
				toast.success(t('owner.dashboard.bookingCancelled'));
				refetchBookings();
			} catch (err) {
				const errorMessage =
					err instanceof Error
						? err.message
						: t('owner.dashboard.failedToCancel');
				toast.error(errorMessage);
			}
		},
		[refetchBookings, t]
	);

	const handleConfirmBooking = useCallback(
		async (bookingId: string) => {
			try {
				await apiClient.put(`/bookings/${bookingId}`, { status: 'CONFIRMED' });
				toast.success(t('owner.dashboard.bookingConfirmed'));
				refetchBookings();
			} catch (err) {
				const errorMessage =
					err instanceof Error
						? err.message
						: t('owner.dashboard.failedToConfirm');
				toast.error(errorMessage);
			}
		},
		[refetchBookings, t]
	);

	const handleRejectBooking = useCallback(
		async (bookingId: string) => {
			try {
				await apiClient.put(`/bookings/${bookingId}`, { status: 'CANCELED' });
				toast.success(t('owner.dashboard.bookingRejected'));
				refetchBookings();
			} catch (err) {
				const errorMessage =
					err instanceof Error
						? err.message
						: t('owner.dashboard.failedToReject');
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
				<LoadingSpinner
					size="lg"
					message={t('owner.dashboard.loadingDashboard')}
				/>
			</div>
		);
	}

	if (!hasSalon) {
		return (
			<div className="flex items-center justify-center py-12">
				<LoadingSpinner
					size="lg"
					message={t('owner.dashboard.redirectingToSetup')}
				/>
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
					message={t('owner.dashboard.failedToLoadDashboard')}
				/>
			</div>
		);
	}

	return (
		<main className="space-y-6 px-0 md:px-4 max-w-7xl mx-auto">
			{/* Photo Warning Banner */}
			{!hasPhotos && showPhotoWarning && (
				<div className="w-full bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
					<AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
					<div className="flex-1">
						<p className="text-sm text-amber-800">
							{t('owner.dashboard.noPhotosWarning')}{' '}
							<Link
								href={settingsUrl}
								className="text-amber-700 hover:text-amber-900 underline font-medium"
							>
								{t('owner.dashboard.addPhotoLink')}
							</Link>
						</p>
					</div>
					<button
						onClick={() => setShowPhotoWarning(false)}
						className="text-amber-600 hover:text-amber-800 flex-shrink-0"
						aria-label="Close"
					>
						<X className="w-5 h-5" />
					</button>
				</div>
			)}

			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div>
					<h1 className="text-2xl sm:text-3xl font-bold text-black">
						{t('owner.dashboard.dashboard')}
					</h1>
					<p className="text-gray-600 mt-1 text-sm sm:text-base">
						{t('owner.dashboard.welcomeBack')}{' '}
						{t('owner.dashboard.businessOverview')}
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
								{t('owner.dashboard.last7Days')}
							</SelectItem>
							<SelectItem
								value="30d"
								className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
							>
								{t('owner.dashboard.last30Days')}
							</SelectItem>
							<SelectItem
								value="1y"
								className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
							>
								{t('owner.dashboard.last1Year')}
							</SelectItem>
						</SelectContent>
					</Select>
					<button
						onClick={() => {
							// Check if salon has services and staff
							if (!services || services.length === 0) {
								toast.error(
									t('owner.dashboard.cannotCreateBooking.noServices')
								);
								return;
							}
							if (!staffMembers || staffMembers.length === 0) {
								toast.error(t('owner.dashboard.cannotCreateBooking.noStaff'));
								return;
							}

							setSelectedService(undefined);
							setEditingBooking(null);
							setIsBookingModalOpen(true);
						}}
						className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ea4b4b] text-white px-4 py-2 text-sm shadow-sm hover:opacity-95 transition-opacity focus:outline-none focus:ring-2 focus:ring-[#ea4b4b] focus:ring-offset-2 w-full sm:w-auto"
					>
						<span className="text-lg leading-none">＋</span>
						{t('owner.dashboard.newAppointment')}
					</button>
				</div>
			</div>

			{/* Stats Cards */}
			<div className="grid grid-cols-2 xl:grid-cols-4 gap-2 md:gap-6">
				<StatsCard
					title={t('owner.dashboard.totalRevenue')}
					value={formatVND(stats.revenue)}
					icon={<DollarSign className="w-6 h-6" />}
				 
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
					title={t('owner.dashboard.totalClients')}
					value={stats.clients}
					icon={<Users className="w-6 h-6" />}
				 
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
					title={t('owner.dashboard.bookings')}
					value={stats.bookings}
					icon={<CalendarCheck className="w-6 h-6" />}
				 
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
					title={t('owner.dashboard.completionRate')}
					value={`${stats.completionRate}%`}
					icon={<TrendingUp className="w-6 h-6" />}
				 
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
