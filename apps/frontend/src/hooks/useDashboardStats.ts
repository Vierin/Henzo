import { useMemo } from 'react';
import { Booking } from '@/types';
import { safeParseDate } from '@/utils/date';

export function dashboardPeriodDays(period: '7d' | '30d' | '1y'): number {
	switch (period) {
		case '7d':
			return 7;
		case '30d':
			return 30;
		case '1y':
			return 365;
		default:
			return 30;
	}
}

/** Bookings whose scheduled time falls in [now - period, now] — same rules as dashboard KPIs. */
export function filterBookingsByDashboardPeriod(
	bookings: Booking[],
	period: '7d' | '30d' | '1y'
): Booking[] {
	const now = new Date();
	const periodDays = dashboardPeriodDays(period);
	const periodStart = new Date(
		now.getTime() - periodDays * 24 * 60 * 60 * 1000
	);
	return bookings.filter((booking) => {
		const bookingDate = safeParseDate(booking.time);
		if (!bookingDate) return false;
		return bookingDate >= periodStart && bookingDate <= now;
	});
}

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

/** Pure stats for tests and explicit useMemo deps in UI. */
export function computeDashboardStats(
	bookings: Booking[],
	period: '7d' | '30d' | '1y'
): DashboardStats {
	const now = new Date();
	const periodDays = dashboardPeriodDays(period);

	const periodStart = new Date(
		now.getTime() - periodDays * 24 * 60 * 60 * 1000
	);
	const previousPeriodStart = new Date(
		periodStart.getTime() - periodDays * 24 * 60 * 60 * 1000
	);

	const currentPeriodBookings = bookings.filter((booking) => {
		const bookingDate = safeParseDate(booking.time);
		if (!bookingDate) return false;
		return bookingDate >= periodStart && bookingDate <= now;
	});

	const previousPeriodBookings = bookings.filter((booking) => {
		const bookingDate = safeParseDate(booking.time);
		if (!bookingDate) return false;
		return bookingDate >= previousPeriodStart && bookingDate < periodStart;
	});

	const currentRevenue = currentPeriodBookings
		.filter((b) => b.status === 'COMPLETED')
		.reduce((sum, b) => sum + (b.service?.price || 0), 0);

	const previousRevenue = previousPeriodBookings
		.filter((b) => b.status === 'COMPLETED')
		.reduce((sum, b) => sum + (b.service?.price || 0), 0);

	const currentClients = new Set(
		currentPeriodBookings.map((b) => b.userId).filter(Boolean)
	).size;
	const previousClients = new Set(
		previousPeriodBookings.map((b) => b.userId).filter(Boolean)
	).size;

	const currentTotal = currentPeriodBookings.length;
	const previousTotal = previousPeriodBookings.length;

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
}

export const useDashboardStats = (
	bookings: Booking[],
	period: '7d' | '30d' | '1y'
): DashboardStats => {
	return useMemo(
		() => computeDashboardStats(bookings, period),
		[bookings, period]
	);
};










