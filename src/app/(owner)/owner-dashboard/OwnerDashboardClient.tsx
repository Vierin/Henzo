'use client';

import { useMemo, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBookings } from '@/hooks/useBookings';
import { useSalonId } from '@/hooks/useSalon';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorDisplay from '@/components/ErrorDisplay';
import StatsCard from './components/StatsCard';
import UpcomingBookingsList from './components/UpcomingBookingsList';
import {
	DollarSign,
	Users,
	CalendarCheck,
	TrendingUp,
	Calendar,
} from 'lucide-react';
import { safeParseDate } from '@/utils/date';
import Link from 'next/link';

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
	const { salonId, isLoading: salonLoading, hasSalon } = useSalonId();
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
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-black">Dashboard</h1>
					<p className="text-gray-600 mt-1">
						Welcome back! Here's your business overview
					</p>
				</div>
				<div className="flex items-center gap-3">
					<select
						value={period}
						onChange={(e) => setPeriod(e.target.value as '7d' | '30d' | '1y')}
						className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] text-gray-900 bg-white"
					>
						<option value="7d">Last 7 days</option>
						<option value="30d">Last 30 days</option>
						<option value="1y">Last 1 year</option>
					</select>
					<Link
						href="/calendar"
						className="inline-flex items-center gap-2 rounded-lg bg-[#ea4b4b] text-white px-4 py-2 text-sm shadow-sm hover:opacity-95 transition-opacity"
					>
						<Calendar className="w-4 h-4" />
						Calendar
					</Link>
				</div>
			</div>

			{/* Stats Cards */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

			{/* Period Info */}
			<div className="text-sm text-gray-500">
				Comparing with previous{' '}
				{period === '7d' ? '7 days' : period === '30d' ? '30 days' : 'year'}
			</div>

			{/* Upcoming Bookings List */}
			<UpcomingBookingsList
				bookings={upcomingBookings}
				loading={bookingsLoading}
			/>
		</main>
	);
}
