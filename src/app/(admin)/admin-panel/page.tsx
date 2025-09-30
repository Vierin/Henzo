'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import OverviewCard from '@/components/admin/OverviewCard';
import BookingStatsCard from '@/components/admin/BookingStatsCard';
import SubscriptionTable from '@/components/admin/SubscriptionTable';
import SmsUsageCard from '@/components/admin/SmsUsageCard';
import CustomerDataCard from '@/components/admin/CustomerDataCard';

interface DashboardData {
	overview: {
		newSalons: number;
		totalSalons: number;
		deletedSalons: number;
	};
	bookingStats: {
		totalBookings: number;
		changePercent: number;
		trends: Array<{
			date: string;
			count: number;
		}>;
	};
	subscriptions: Array<{
		salon: string;
		subscriptionType: string;
		status: string;
		nextPaymentDate: string;
	}>;
	smsUsage: {
		sent: number;
		balance: number;
	};
	customers: Array<{
		salon: string;
		totalCustomers: number;
	}>;
}

export default function AdminDashboard() {
	const [dashboardData, setDashboardData] = useState<DashboardData | null>(
		null
	);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [timePeriod, setTimePeriod] = useState<'7d' | '30d' | '3m' | '1y'>(
		'30d'
	);

	useEffect(() => {
		const fetchDashboardData = async () => {
			try {
				setLoading(true);
				// Пытаемся получить данные с бэкенда с параметром периода времени
				const data = await apiClient.get<DashboardData>(
					`/admin/dashboard?period=${timePeriod}`
				);
				setDashboardData(data);
			} catch (err) {
				// Если бэкенд недоступен, используем моковые данные
				console.warn('Backend not available, using mock data:', err);

				// Генерируем моковые данные в зависимости от периода
				const mockData = generateMockDataForPeriod(timePeriod);
				setDashboardData(mockData);
			} finally {
				setLoading(false);
			}
		};

		fetchDashboardData();
	}, [timePeriod]);

	// Функция для генерации моковых данных в зависимости от периода
	const generateMockDataForPeriod = (period: string): DashboardData => {
		const baseData = {
			overview: {
				newSalons:
					period === '7d' ? 0 : period === '30d' ? 2 : period === '3m' ? 8 : 15,
				deletedSalons:
					period === '7d' ? 0 : period === '30d' ? 1 : period === '3m' ? 2 : 3,
				totalSalons: 12,
			},
			bookingStats: {
				totalBookings:
					period === '7d'
						? 25
						: period === '30d'
							? 120
							: period === '3m'
								? 380
								: 1200,
				changePercent:
					period === '7d'
						? 5
						: period === '30d'
							? 10
							: period === '3m'
								? 15
								: 25,
				trends: generateTrendsForPeriod(period),
			},
			subscriptions: [
				{
					salon: 'Salon A',
					subscriptionType: 'Premium',
					status: 'Active',
					nextPaymentDate: '2024-02-15',
				},
				{
					salon: 'Salon B',
					subscriptionType: 'Basic',
					status: 'Active',
					nextPaymentDate: '2024-03-01',
				},
				{
					salon: 'Salon C',
					subscriptionType: 'Premium',
					status: 'Inactive',
					nextPaymentDate: '2024-01-20',
				},
			],
			smsUsage: {
				sent:
					period === '7d'
						? 50
						: period === '30d'
							? 500
							: period === '3m'
								? 1500
								: 5000,
				balance: 1000,
			},
			customers: [
				{ salon: 'Salon A', totalCustomers: 150 },
				{ salon: 'Salon B', totalCustomers: 80 },
				{ salon: 'Salon C', totalCustomers: 200 },
			],
		};
		return baseData;
	};

	// Функция для генерации трендов в зависимости от периода
	const generateTrendsForPeriod = (period: string) => {
		const now = new Date();
		const trends = [];

		if (period === '7d') {
			// Данные за последние 7 дней
			for (let i = 6; i >= 0; i--) {
				const date = new Date(now);
				date.setDate(date.getDate() - i);
				trends.push({
					date: date.toISOString().split('T')[0],
					count: Math.floor(Math.random() * 20) + 10,
				});
			}
		} else if (period === '30d') {
			// Данные за последние 6 месяцев (как было)
			trends.push(
				{ date: '2024-07-01', count: 80 },
				{ date: '2024-08-01', count: 95 },
				{ date: '2024-09-01', count: 110 },
				{ date: '2024-10-01', count: 85 },
				{ date: '2024-11-01', count: 130 },
				{ date: '2024-12-01', count: 120 }
			);
		} else if (period === '3m') {
			// Данные за последние 3 месяца
			for (let i = 2; i >= 0; i--) {
				const date = new Date(now);
				date.setMonth(date.getMonth() - i);
				trends.push({
					date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`,
					count: Math.floor(Math.random() * 100) + 100,
				});
			}
		} else if (period === '1y') {
			// Данные за последний год (по кварталам)
			for (let i = 3; i >= 0; i--) {
				const date = new Date(now);
				date.setMonth(date.getMonth() - i * 3);
				trends.push({
					date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`,
					count: Math.floor(Math.random() * 200) + 200,
				});
			}
		}

		return trends;
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="text-center py-12">
				<div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
					<span className="text-2xl">⚠️</span>
				</div>
				<h3 className="text-xl font-semibold text-gray-900 mb-2">
					Error loading dashboard
				</h3>
				<p className="text-gray-600">{error}</p>
			</div>
		);
	}

	if (!dashboardData) return null;

	return (
		<div className="space-y-8">
			<div className="flex justify-between items-center">
				<h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>

				{/* Time Period Filter */}
				<div className="flex items-center space-x-2">
					<span className="text-sm font-medium text-gray-700">Period:</span>
					<select
						value={timePeriod}
						onChange={(e) =>
							setTimePeriod(e.target.value as '7d' | '30d' | '3m' | '1y')
						}
						className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm text-gray-900"
					>
						<option value="7d">Last 7 days</option>
						<option value="30d">Last 30 days</option>
						<option value="3m">Last 3 months</option>
						<option value="1y">Last year</option>
					</select>
				</div>
			</div>

			{/* Overview Cards */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<OverviewCard
					title="Overview"
					newSalons={dashboardData.overview.newSalons}
					totalSalons={dashboardData.overview.totalSalons}
					deletedSalons={dashboardData.overview.deletedSalons}
				/>

				<BookingStatsCard
					title="Salon Statistics"
					totalBookings={dashboardData.bookingStats.totalBookings}
					changePercent={dashboardData.bookingStats.changePercent}
					trends={dashboardData.bookingStats.trends}
					period={timePeriod}
				/>
			</div>

			{/* SMS Usage and Customer Data */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<CustomerDataCard
					title="Customer Data"
					customers={dashboardData.customers}
				/>
			</div>

			{/* Subscription Management */}
			<SubscriptionTable
				title="Subscription Management"
				subscriptions={dashboardData.subscriptions}
			/>
		</div>
	);
}
