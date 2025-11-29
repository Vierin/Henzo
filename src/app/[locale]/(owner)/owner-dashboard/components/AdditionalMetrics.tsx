'use client';

import { Booking } from '@/types';
import { AlertCircle, Users, TrendingUp } from 'lucide-react';
import { formatVND } from '@/utils/currency';
import { useTranslation } from '@/contexts/LanguageContext';

interface AdditionalMetricsProps {
	bookings: Booking[];
}

export default function AdditionalMetrics({
	bookings,
}: AdditionalMetricsProps) {
	const t = useTranslation();
	
	// Calculate No-Show Rate - only for past bookings
	const now = new Date();
	const pastBookings = bookings.filter((b) => {
		const bookingTime = new Date(b.time);
		return bookingTime < now;
	});

	// Count bookings that could result in no-show (CONFIRMED, COMPLETED, or NOSHOW)
	const totalPastBookings = pastBookings.filter(
		(b) =>
			b.status === 'CONFIRMED' ||
			b.status === 'COMPLETED' ||
			b.status === 'NOSHOW'
	).length;
	// Count actual no-shows (status = NOSHOW)
	const noShowCount = pastBookings.filter(
		(b) => b.status === 'NOSHOW'
	).length;
	const noShowRate =
		totalPastBookings > 0
			? Math.round((noShowCount / totalPastBookings) * 100)
			: 0;

	// Calculate Repeat Clients
	const clientBookingCount = bookings
		.filter((b) => b.status === 'COMPLETED')
		.reduce(
			(acc, booking) => {
				acc[booking.userId] = (acc[booking.userId] || 0) + 1;
				return acc;
			},
			{} as Record<string, number>
		);

	const repeatClients = Object.values(clientBookingCount).filter(
		(count) => count > 1
	).length;
	const totalClients = Object.keys(clientBookingCount).length;
	const repeatClientRate =
		totalClients > 0 ? Math.round((repeatClients / totalClients) * 100) : 0;

	// Calculate Average Revenue per Client
	const totalRevenue = bookings
		.filter((b) => b.status === 'COMPLETED')
		.reduce((sum, b) => sum + (b.service?.price || 0), 0);
	const avgRevenuePerClient =
		totalClients > 0 ? Math.round(totalRevenue / totalClients) : 0;

	const metrics = [
		{
			title: t('owner.noShowRate'),
			value: `${noShowRate}%`,
			subtitle: `${noShowCount} ${t('owner.missed')}`,
			icon: <AlertCircle className="w-6 h-6" />,
			color: noShowRate > 20 ? 'text-red-600' : 'text-yellow-600',
			bgColor: noShowRate > 20 ? 'bg-red-50' : 'bg-yellow-50',
		},
		{
			title: t('owner.repeatClients'),
			value: `${repeatClientRate}%`,
			subtitle: `${repeatClients} ${t('owner.of')} ${totalClients}`,
			icon: <Users className="w-6 h-6" />,
			color: 'text-blue-600',
			bgColor: 'bg-blue-50',
		},
		{
			title: t('owner.avgRevenuePerClient'),
			value: formatVND(avgRevenuePerClient),
			subtitle: t('owner.perClient'),
			icon: <TrendingUp className="w-6 h-6" />,
			color: 'text-green-600',
			bgColor: 'bg-green-50',
		},
	];

	return (
		<div className="bg-white rounded-xl border border-[#f1d9d7] p-4 md:p-6">
			<h2 className="text-xl font-semibold text-gray-900 mb-3 md:mb-6">
				{t('owner.additionalMetrics')}
			</h2>

			<div className="space-y-2 md:space-y-4">
				{metrics.map((metric) => (
					<div
						key={metric.title}
						className="flex items-center justify-between p-2 md:p-4 bg-[#fff7f6] rounded-lg"
					>
						<div className="flex items-center gap-4">
							<div
								className={`flex items-center justify-center w-12 h-12 rounded-lg ${metric.bgColor}`}
							>
								<div className={metric.color}>{metric.icon}</div>
							</div>
							<div>
								<p className="text-sm font-medium text-gray-600">
									{metric.title}
								</p>
								<p className="text-2xl font-bold text-gray-900">
									{metric.value}
								</p>
							</div>
						</div>
						<div className="text-right">
							<p className="text-sm text-gray-500">{metric.subtitle}</p>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
