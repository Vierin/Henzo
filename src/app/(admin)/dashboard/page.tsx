'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

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
				const data = await apiClient.get('/admin/dashboard');
				setDashboardData(data);
			} catch (err) {
				setError(
					err instanceof Error ? err.message : 'Failed to load dashboard data'
				);
			} finally {
				setLoading(false);
			}
		};

		fetchDashboardData();
	}, []);

	if (loading) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff5b5b]"></div>
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
				<div className="bg-white rounded-lg shadow p-6">
					<h3 className="text-lg font-medium text-gray-900 mb-4">Overview</h3>
					<div className="space-y-4">
						<div className="flex justify-between items-center">
							<span className="text-sm text-gray-600">New Salons</span>
							<span className="text-2xl font-bold text-gray-900">
								{dashboardData.overview.newSalons}
							</span>
						</div>
						<div className="flex justify-between items-center">
							<span className="text-sm text-gray-600">Total Salons</span>
							<span className="text-2xl font-bold text-gray-900">
								{dashboardData.overview.totalSalons}
							</span>
						</div>
					</div>
				</div>

				<div className="bg-white rounded-lg shadow p-6">
					<h3 className="text-lg font-medium text-gray-900 mb-4">
						Salon Statistics
					</h3>
					<div className="space-y-4">
						<div className="flex justify-between items-center">
							<span className="text-sm text-gray-600">Total Bookings</span>
							<span className="text-2xl font-bold text-gray-900">
								{dashboardData.bookingStats.totalBookings}
							</span>
						</div>
						<div className="text-sm text-gray-600">
							Last 30 Days
							<span
								className={`ml-2 ${dashboardData.bookingStats.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}
							>
								{dashboardData.bookingStats.changePercent >= 0 ? '+' : ''}
								{dashboardData.bookingStats.changePercent}%
							</span>
						</div>
					</div>

					{/* Simple Chart Placeholder */}
					<div className="mt-4 h-32 bg-gray-50 rounded flex items-center justify-center">
						<span className="text-gray-500">Booking Trends Chart</span>
					</div>
				</div>
			</div>

			{/* Subscription Management */}
			<div className="bg-white rounded-lg shadow">
				<div className="px-6 py-4 border-b border-gray-200">
					<h3 className="text-lg font-medium text-gray-900">
						Subscription Management
					</h3>
				</div>
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Salon
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Subscription Type
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Status
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Next Payment Date
								</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{dashboardData.subscriptions.map((subscription, index) => (
								<tr key={index}>
									<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
										{subscription.salon}
									</td>
									<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
										{subscription.subscriptionType}
									</td>
									<td className="px-6 py-4 whitespace-nowrap">
										<span
											className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
												subscription.status === 'Active'
													? 'bg-orange-100 text-orange-800'
													: 'bg-gray-100 text-gray-800'
											}`}
										>
											{subscription.status}
										</span>
									</td>
									<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
										{subscription.nextPaymentDate}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>

			{/* SMS Usage and Customer Data */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div className="bg-white rounded-lg shadow p-6">
					<h3 className="text-lg font-medium text-gray-900 mb-4">SMS Usage</h3>
					<div className="space-y-4">
						<div className="flex justify-between items-center">
							<span className="text-sm text-gray-600">SMS Sent</span>
							<span className="text-2xl font-bold text-gray-900">
								{dashboardData.smsUsage.sent}
							</span>
						</div>
						<div className="flex justify-between items-center">
							<span className="text-sm text-gray-600">SMS Balance</span>
							<span className="text-2xl font-bold text-gray-900">
								{dashboardData.smsUsage.balance}
							</span>
						</div>
					</div>
				</div>

				<div className="bg-white rounded-lg shadow p-6">
					<h3 className="text-lg font-medium text-gray-900 mb-4">
						Customer Data
					</h3>
					<div className="space-y-3">
						{dashboardData.customers.slice(0, 3).map((customer, index) => (
							<div key={index} className="flex justify-between items-center">
								<span className="text-sm text-gray-600">{customer.salon}</span>
								<span className="text-sm font-medium text-gray-900">
									{customer.totalCustomers}
								</span>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
