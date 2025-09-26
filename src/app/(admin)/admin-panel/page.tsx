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

	useEffect(() => {
		const fetchDashboardData = async () => {
			try {
				// Пытаемся получить данные с бэкенда
				const data = await apiClient.get<DashboardData>('/admin/dashboard');
				setDashboardData(data);
			} catch (err) {
				// Если бэкенд недоступен, используем моковые данные
				console.warn('Backend not available, using mock data:', err);
				const mockData: DashboardData = {
					overview: {
						newSalons: 2,
						totalSalons: 12,
					},
					bookingStats: {
						totalBookings: 120,
						changePercent: 10,
						trends: [
							{ date: '2024-07-01', count: 80 },
							{ date: '2024-08-01', count: 95 },
							{ date: '2024-09-01', count: 110 },
							{ date: '2024-10-01', count: 85 },
							{ date: '2024-11-01', count: 130 },
							{ date: '2024-12-01', count: 120 },
						],
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
						sent: 500,
						balance: 1000,
					},
					customers: [
						{ salon: 'Salon A', totalCustomers: 150 },
						{ salon: 'Salon B', totalCustomers: 80 },
						{ salon: 'Salon C', totalCustomers: 200 },
					],
				};
				setDashboardData(mockData);
			} finally {
				setLoading(false);
			}
		};

		fetchDashboardData();
	}, []);

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
			<h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>

			{/* Overview Cards */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<OverviewCard
					title="Overview"
					newSalons={dashboardData.overview.newSalons}
					totalSalons={dashboardData.overview.totalSalons}
				/>

				<BookingStatsCard
					title="Salon Statistics"
					totalBookings={dashboardData.bookingStats.totalBookings}
					changePercent={dashboardData.bookingStats.changePercent}
					trends={dashboardData.bookingStats.trends}
				/>
			</div>

			{/* Subscription Management */}
			<SubscriptionTable
				title="Subscription Management"
				subscriptions={dashboardData.subscriptions}
			/>

			{/* SMS Usage and Customer Data */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<SmsUsageCard
					title="SMS Usage"
					sent={dashboardData.smsUsage.sent}
					balance={dashboardData.smsUsage.balance}
				/>

				<CustomerDataCard
					title="Customer Data"
					customers={dashboardData.customers}
				/>
			</div>
		</div>
	);
}
