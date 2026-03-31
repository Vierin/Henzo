'use client';

import { Booking } from '@/types';
import { safeParseDate } from '@/utils/date';
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
		const bookingTime = safeParseDate(b.time);
		return bookingTime != null && bookingTime < now;
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

	// Calculate Repeat Clients (Loyalty Metrics)
	// Исключаем анонимных пользователей и считаем только завершенные бронирования
	const isAnonymousUser = (user: Booking['user']) => {
		if (!user) return true;
		const email = user.email || '';
		return (
			email.includes('@anonymous.local') ||
			email.startsWith('anonymous-') ||
			user.isGuest === true
		);
	};

	const completedBookings = bookings.filter((b) => b.status === 'COMPLETED');
	
	// Подсчитываем количество бронирований для каждого клиента (исключая анонимов)
	const clientBookingCount = completedBookings
		.filter((b) => !isAnonymousUser(b.user))
		.reduce(
			(acc, booking) => {
				acc[booking.userId] = (acc[booking.userId] || 0) + 1;
				return acc;
			},
			{} as Record<string, number>
		);

	// Постоянные клиенты: >= 3 бронирований
	const loyalClients = Object.values(clientBookingCount).filter(
		(count) => count >= 3
	).length;
	
	// Клиенты с 2 бронированиями (потенциально постоянные)
	const potentialLoyalClients = Object.values(clientBookingCount).filter(
		(count) => count === 2
	).length;
	
	// Всего уникальных клиентов (исключая анонимов)
	const totalClients = Object.keys(clientBookingCount).length;
	
	// Процент постоянных клиентов
	const loyalClientRate =
		totalClients > 0 ? Math.round((loyalClients / totalClients) * 100) : 0;
	
	// Среднее количество визитов на клиента
	const totalVisits = Object.values(clientBookingCount).reduce(
		(sum, count) => sum + count,
		0
	);
	const avgVisitsPerClient =
		totalClients > 0 ? (totalVisits / totalClients).toFixed(1) : '0.0';

	// Calculate Average Revenue per Client (только для не-анонимных клиентов)
	const totalRevenue = completedBookings
		.filter((b) => !isAnonymousUser(b.user))
		.reduce((sum, b) => sum + (b.service?.price || 0), 0);
	const avgRevenuePerClient =
		totalClients > 0 ? Math.round(totalRevenue / totalClients) : 0;

	const metrics = [
		{
			title: t('owner.dashboard.noShowRate'),
			value: `${noShowRate}%`,
			subtitle: `${noShowCount} ${t('owner.dashboard.missed')}`,
			icon: <AlertCircle className="w-6 h-6" />,
			color: noShowRate > 20 ? 'text-red-600' : 'text-yellow-600',
			bgColor: noShowRate > 20 ? 'bg-red-50' : 'bg-yellow-50',
		},
		{
			title: t('owner.dashboard.repeatClients'),
			value: `${loyalClientRate}%`,
			subtitle: `${loyalClients} ${t('owner.dashboard.of')} ${totalClients} (≥3 visits)`,
			icon: <Users className="w-6 h-6" />,
			color: 'text-blue-600',
			bgColor: 'bg-blue-50',
		},
		{
			title: t('owner.dashboard.avgRevenuePerClient'),
			value: formatVND(avgRevenuePerClient),
			subtitle: t('owner.dashboard.perClient'),
			icon: <TrendingUp className="w-6 h-6" />,
			color: 'text-green-600',
			bgColor: 'bg-green-50',
		},
	];

	// Дополнительная информация для постоянных клиентов
	const loyaltyDetails = {
		loyalClients,
		potentialLoyalClients,
		totalClients,
		avgVisitsPerClient,
	};

	return (
		<div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 shadow-sm">
			<h2 className="text-xl font-semibold text-gray-900 mb-3 md:mb-6">
				{t('owner.dashboard.additionalMetrics')}
			</h2>

			<div className="space-y-2 md:space-y-4">
				{metrics.map((metric) => (
					<div
						key={metric.title}
						className="flex items-center justify-between p-2 md:p-4 bg-gray-50 rounded-lg"
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
							{/* Дополнительная информация для метрики постоянных клиентов */}
							{metric.title === t('owner.dashboard.repeatClients') &&
								loyaltyDetails.totalClients > 0 && (
									<div className="mt-1 text-xs text-gray-400">
										{t('owner.dashboard.averageVisits').replace('{avg}', loyaltyDetails.avgVisitsPerClient)}
										{loyaltyDetails.potentialLoyalClients > 0 && (
											<span className="ml-2">
												• {t('owner.dashboard.clientsWith2Visits').replace('{count}', loyaltyDetails.potentialLoyalClients.toString())}
											</span>
										)}
									</div>
								)}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
