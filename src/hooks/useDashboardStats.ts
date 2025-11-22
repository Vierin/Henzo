import { useMemo } from 'react';
import { Booking } from '@/types';
import { safeParseDate } from '@/utils/date';

export interface DashboardStats {
	revenue: number;
	revenueTrend: number;
	clients: number;
	clientsTrend: number;
	bookings: number;
	bookingsTrend: number;
	completionRate: number;
	completionTrend: number;
}

export const useDashboardStats = (
	bookings: Booking[],
	period: '7d' | '30d' | '1y'
): DashboardStats => {
	return useMemo(() => {
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
};









