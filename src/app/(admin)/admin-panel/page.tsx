'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { Line } from 'react-chartjs-2';
import {
	Chart as ChartJS,
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	Title,
	Tooltip,
	Legend,
	Filler,
} from 'chart.js';

interface AnalyticsData {
	salons: {
		total: number;
		new: number;
		active: number;
	};
	bookings: {
		total: number;
		pending: number;
		confirmed: number;
		completed: number;
		canceled: number;
		byDay: Array<{ date: string; count: number }>;
	};
	topServices: Array<{ name: string; count: number; categoryName?: string }>;
	topSalons: Array<{ name: string; bookingsCount: number }>;
}

// Register Chart.js components
ChartJS.register(
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	Title,
	Tooltip,
	Legend,
	Filler
);

export default function AdminDashboard() {
	const [data, setData] = useState<AnalyticsData | null>(null);
	const [loading, setLoading] = useState(true);
	const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');

	useEffect(() => {
		fetchAnalytics();
	}, [period]);

	const fetchAnalytics = async () => {
		try {
			setLoading(true);
			const response = await apiClient.get<AnalyticsData>(
				`/admin/analytics?period=${period}`
			);
			setData(response);
		} catch (error) {
			console.error('Failed to fetch analytics:', error);
			// Mock data for MVP testing
			setData(generateMockData());
		} finally {
			setLoading(false);
		}
	};

	const generateMockData = (): AnalyticsData => {
		const now = new Date();
		const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;

		return {
			salons: {
				total: 12,
				new: period === '7d' ? 2 : period === '30d' ? 5 : 12,
				active: 8,
			},
			bookings: {
				total: period === '7d' ? 45 : period === '30d' ? 180 : 520,
				pending: period === '7d' ? 8 : period === '30d' ? 25 : 60,
				confirmed: period === '7d' ? 15 : period === '30d' ? 60 : 180,
				completed: period === '7d' ? 18 : period === '30d' ? 80 : 250,
				canceled: period === '7d' ? 4 : period === '30d' ? 15 : 30,
				byDay: Array.from({ length: Math.min(days, 30) }, (_, i) => {
					const date = new Date(now);
					date.setDate(date.getDate() - (days - i - 1));
					return {
						date: date.toISOString().split('T')[0],
						count: Math.floor(Math.random() * 15) + 5,
					};
				}),
			},
			topServices: [
				{ name: 'Haircut', count: 45, categoryName: 'Hair' },
				{ name: 'Manicure', count: 38, categoryName: 'Nails' },
				{ name: 'Massage', count: 32, categoryName: 'Spa' },
				{ name: 'Facial', count: 28, categoryName: 'Skincare' },
				{ name: 'Hair Color', count: 22, categoryName: 'Hair' },
			],
			topSalons: [
				{ name: 'Beauty Studio A', bookingsCount: 67 },
				{ name: 'Nail Salon B', bookingsCount: 54 },
				{ name: 'Spa Center C', bookingsCount: 42 },
				{ name: 'Hair Studio D', bookingsCount: 38 },
				{ name: 'Beauty Salon E', bookingsCount: 31 },
			],
		};
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
			</div>
		);
	}

	if (!data) return null;

	const totalBookings = data.bookings.total;
	const conversionRate =
		data.salons.active > 0
			? ((totalBookings / data.salons.active) * 100).toFixed(1)
			: '0';

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
					<p className="text-gray-600 mt-1">
						Track platform growth and demand validation
					</p>
				</div>

				{/* Period Filter */}
				<select
					value={period}
					onChange={(e) => setPeriod(e.target.value as any)}
					className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900"
				>
					<option value="7d">Last 7 days</option>
					<option value="30d">Last 30 days</option>
					<option value="90d">Last 90 days</option>
				</select>
			</div>

			{/* Key Metrics for MVP Validation */}
			<div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-6 border-2 border-orange-200">
				<h2 className="text-lg font-bold text-gray-900 mb-4">
					🎯 MVP Validation Metrics
				</h2>
				<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
					<div className="bg-white rounded-lg p-4 shadow-sm">
						<div className="text-sm text-gray-600 mb-1">Total Salons</div>
						<div className="text-3xl font-bold text-gray-900">
							{data.salons.total}
						</div>
						<div className="text-xs text-green-600 mt-1">
							+{data.salons.new} new
						</div>
					</div>
					<div className="bg-white rounded-lg p-4 shadow-sm">
						<div className="text-sm text-gray-600 mb-1">Active Salons</div>
						<div className="text-3xl font-bold text-gray-900">
							{data.salons.active}
						</div>
						<div className="text-xs text-gray-500 mt-1">
							{((data.salons.active / data.salons.total) * 100).toFixed(0)}% of
							total
						</div>
					</div>
					<div className="bg-white rounded-lg p-4 shadow-sm">
						<div className="text-sm text-gray-600 mb-1">Total Bookings</div>
						<div className="text-3xl font-bold text-gray-900">
							{totalBookings}
						</div>
						<div className="text-xs text-blue-600 mt-1">
							{data.bookings.completed} completed
						</div>
					</div>
					<div className="bg-white rounded-lg p-4 shadow-sm">
						<div className="text-sm text-gray-600 mb-1">Avg per Salon</div>
						<div className="text-3xl font-bold text-gray-900">
							{conversionRate}
						</div>
						<div className="text-xs text-gray-500 mt-1">bookings/salon</div>
					</div>
				</div>
			</div>

			{/* Booking Status Distribution */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
					<h2 className="text-lg font-bold text-gray-900 mb-4">
						Booking Status Breakdown
					</h2>
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
								<span className="text-sm text-gray-700">Pending</span>
							</div>
							<div className="text-right">
								<div className="text-lg font-bold text-gray-900">
									{data.bookings.pending}
								</div>
								<div className="text-xs text-gray-500">
									{((data.bookings.pending / totalBookings) * 100).toFixed(1)}%
								</div>
							</div>
						</div>
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<div className="w-3 h-3 bg-green-500 rounded-full"></div>
								<span className="text-sm text-gray-700">Confirmed</span>
							</div>
							<div className="text-right">
								<div className="text-lg font-bold text-gray-900">
									{data.bookings.confirmed}
								</div>
								<div className="text-xs text-gray-500">
									{((data.bookings.confirmed / totalBookings) * 100).toFixed(1)}
									%
								</div>
							</div>
						</div>
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<div className="w-3 h-3 bg-blue-500 rounded-full"></div>
								<span className="text-sm text-gray-700">Completed</span>
							</div>
							<div className="text-right">
								<div className="text-lg font-bold text-gray-900">
									{data.bookings.completed}
								</div>
								<div className="text-xs text-gray-500">
									{((data.bookings.completed / totalBookings) * 100).toFixed(1)}
									%
								</div>
							</div>
						</div>
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<div className="w-3 h-3 bg-red-500 rounded-full"></div>
								<span className="text-sm text-gray-700">Canceled</span>
							</div>
							<div className="text-right">
								<div className="text-lg font-bold text-gray-900">
									{data.bookings.canceled}
								</div>
								<div className="text-xs text-gray-500">
									{((data.bookings.canceled / totalBookings) * 100).toFixed(1)}%
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Demand Signal */}
				<div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
					<h2 className="text-lg font-bold text-gray-900 mb-4">
						Demand Signals
					</h2>
					<div className="space-y-4">
						<div>
							<div className="flex items-center justify-between mb-2">
								<span className="text-sm text-gray-700">Confirmation Rate</span>
								<span className="text-lg font-bold text-gray-900">
									{totalBookings > 0
										? (
												((data.bookings.confirmed + data.bookings.completed) /
													totalBookings) *
												100
											).toFixed(1)
										: 0}
									%
								</span>
							</div>
							<div className="w-full bg-gray-200 rounded-full h-2">
								<div
									className="bg-green-500 h-2 rounded-full"
									style={{
										width: `${totalBookings > 0 ? ((data.bookings.confirmed + data.bookings.completed) / totalBookings) * 100 : 0}%`,
									}}
								></div>
							</div>
							<p className="text-xs text-gray-500 mt-1">
								Higher is better - salons are accepting bookings
							</p>
						</div>

						<div>
							<div className="flex items-center justify-between mb-2">
								<span className="text-sm text-gray-700">Cancellation Rate</span>
								<span className="text-lg font-bold text-gray-900">
									{totalBookings > 0
										? ((data.bookings.canceled / totalBookings) * 100).toFixed(
												1
											)
										: 0}
									%
								</span>
							</div>
							<div className="w-full bg-gray-200 rounded-full h-2">
								<div
									className="bg-red-500 h-2 rounded-full"
									style={{
										width: `${totalBookings > 0 ? (data.bookings.canceled / totalBookings) * 100 : 0}%`,
									}}
								></div>
							</div>
							<p className="text-xs text-gray-500 mt-1">
								Lower is better - less friction
							</p>
						</div>

						<div className="pt-4 border-t border-gray-200">
							<div className="text-sm text-gray-700 mb-2">Platform Health</div>
							{data.salons.active >= 5 && totalBookings >= 20 ? (
								<div className="flex items-center gap-2 text-green-600">
									<svg
										className="w-5 h-5"
										fill="currentColor"
										viewBox="0 0 20 20"
									>
										<path
											fillRule="evenodd"
											d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
											clipRule="evenodd"
										/>
									</svg>
									<span className="font-medium">
										Healthy - Demand validated ✓
									</span>
								</div>
							) : (
								<div className="flex items-center gap-2 text-yellow-600">
									<svg
										className="w-5 h-5"
										fill="currentColor"
										viewBox="0 0 20 20"
									>
										<path
											fillRule="evenodd"
											d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
											clipRule="evenodd"
										/>
									</svg>
									<span className="font-medium">
										Growing - Need 5+ active salons
									</span>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Bookings Trend Chart */}
			<div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
				<h2 className="text-lg font-bold text-gray-900 mb-6">Bookings Trend</h2>
				<div className="h-80">
					<Line
						data={{
							labels: data.bookings.byDay.map((day) =>
								new Date(day.date).toLocaleDateString('en-US', {
									month: 'short',
									day: 'numeric',
								})
							),
							datasets: [
								{
									label: 'Bookings',
									data: data.bookings.byDay.map((day) => day.count),
									borderColor: '#ff5b5b',
									backgroundColor: 'rgba(255, 91, 91, 0.1)',
									fill: true,
									tension: 0.4,
									pointRadius: 4,
									pointHoverRadius: 6,
									pointBackgroundColor: '#ff5b5b',
									pointBorderColor: '#fff',
									pointBorderWidth: 2,
								},
							],
						}}
						options={{
							responsive: true,
							maintainAspectRatio: false,
							plugins: {
								legend: {
									display: false,
								},
								tooltip: {
									backgroundColor: '#1f2937',
									titleColor: '#fff',
									bodyColor: '#fff',
									padding: 12,
									displayColors: false,
									callbacks: {
										label: (context) => `${context.parsed.y} bookings`,
									},
								},
							},
							scales: {
								y: {
									beginAtZero: true,
									grid: {
										color: '#f3f4f6',
									},
									ticks: {
										color: '#6b7280',
										font: {
											size: 12,
										},
										precision: 0,
									},
								},
								x: {
									grid: {
										display: false,
									},
									ticks: {
										color: '#6b7280',
										font: {
											size: 11,
										},
										maxRotation: 45,
										minRotation: 45,
									},
								},
							},
						}}
					/>
				</div>
			</div>

			{/* Top Services and Salons */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				{/* Top Services */}
				<div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
					<h2 className="text-lg font-bold text-gray-900 mb-4">Top Services</h2>
					<p className="text-sm text-gray-600 mb-4">
						Most popular services by booking count
					</p>
					<div className="space-y-3">
						{data.topServices.map((service, index) => {
							const maxCount = data.topServices[0]?.count || 1;
							const percentage = (service.count / maxCount) * 100;
							return (
								<div key={index}>
									<div className="flex items-center justify-between mb-1">
										<div className="flex items-center gap-2">
											<span className="text-lg font-bold text-orange-500">
												#{index + 1}
											</span>
											<span className="text-sm font-medium text-gray-900">
												{service.name}
											</span>
											{service.categoryName && (
												<span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
													{service.categoryName}
												</span>
											)}
										</div>
										<span className="text-sm font-bold text-gray-900">
											{service.count}
										</span>
									</div>
									<div className="w-full bg-gray-200 rounded-full h-2">
										<div
											className="bg-orange-500 h-2 rounded-full transition-all"
											style={{ width: `${percentage}%` }}
										></div>
									</div>
								</div>
							);
						})}
					</div>
				</div>

				{/* Top Salons */}
				<div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
					<h2 className="text-lg font-bold text-gray-900 mb-4">Top Salons</h2>
					<p className="text-sm text-gray-600 mb-4">
						Most active salons by booking volume
					</p>
					<div className="space-y-3">
						{data.topSalons.map((salon, index) => {
							const maxCount = data.topSalons[0]?.bookingsCount || 1;
							const percentage = (salon.bookingsCount / maxCount) * 100;
							return (
								<div key={index}>
									<div className="flex items-center justify-between mb-1">
										<div className="flex items-center gap-2">
											<span className="text-lg font-bold text-orange-500">
												#{index + 1}
											</span>
											<span className="text-sm font-medium text-gray-900">
												{salon.name}
											</span>
										</div>
										<span className="text-sm font-bold text-gray-900">
											{salon.bookingsCount}
										</span>
									</div>
									<div className="w-full bg-gray-200 rounded-full h-2">
										<div
											className="bg-orange-500 h-2 rounded-full transition-all"
											style={{ width: `${percentage}%` }}
										></div>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			</div>

			{/* Success Criteria */}
			<div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
				<h2 className="text-lg font-bold text-gray-900 mb-4">
					✅ MVP Success Criteria (30 days)
				</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
					<div className="p-4 border-2 border-dashed rounded-lg">
						<div className="text-sm text-gray-600 mb-2">Target: 10+ Salons</div>
						<div className="flex items-center gap-2">
							<div className="text-2xl font-bold text-gray-900">
								{data.salons.total}
							</div>
							{data.salons.total >= 10 ? (
								<span className="text-green-600">✓</span>
							) : (
								<span className="text-gray-400">
									({10 - data.salons.total} more)
								</span>
							)}
						</div>
					</div>
					<div className="p-4 border-2 border-dashed rounded-lg">
						<div className="text-sm text-gray-600 mb-2">Target: 5+ Active</div>
						<div className="flex items-center gap-2">
							<div className="text-2xl font-bold text-gray-900">
								{data.salons.active}
							</div>
							{data.salons.active >= 5 ? (
								<span className="text-green-600">✓</span>
							) : (
								<span className="text-gray-400">
									({5 - data.salons.active} more)
								</span>
							)}
						</div>
					</div>
					<div className="p-4 border-2 border-dashed rounded-lg">
						<div className="text-sm text-gray-600 mb-2">
							Target: 50+ Bookings
						</div>
						<div className="flex items-center gap-2">
							<div className="text-2xl font-bold text-gray-900">
								{totalBookings}
							</div>
							{totalBookings >= 50 ? (
								<span className="text-green-600">✓</span>
							) : (
								<span className="text-gray-400">
									({50 - totalBookings} more)
								</span>
							)}
						</div>
					</div>
					<div className="p-4 border-2 border-dashed rounded-lg">
						<div className="text-sm text-gray-600 mb-2">
							Target: 30+ Completed
						</div>
						<div className="flex items-center gap-2">
							<div className="text-2xl font-bold text-gray-900">
								{data.bookings.completed}
							</div>
							{data.bookings.completed >= 30 ? (
								<span className="text-green-600">✓</span>
							) : (
								<span className="text-gray-400">
									({30 - data.bookings.completed} more)
								</span>
							)}
						</div>
					</div>
				</div>
				<div className="mt-4 p-4 bg-blue-50 rounded-lg">
					<p className="text-sm text-blue-900">
						<strong>💡 Tip:</strong> If you hit all 4 targets in 30 days,
						there's clear demand for the platform. Time to scale!
					</p>
				</div>
			</div>

			{/* Action Items */}
			<div className="bg-orange-50 rounded-xl p-6 border border-orange-200">
				<h2 className="text-lg font-bold text-gray-900 mb-3">
					🎯 Next Steps to Validate Demand
				</h2>
				<ul className="space-y-2">
					<li className="flex items-start gap-2 text-sm text-gray-700">
						<span className="text-orange-500 font-bold">1.</span>
						<span>Contact salons with 0 bookings - understand barriers</span>
					</li>
					<li className="flex items-start gap-2 text-sm text-gray-700">
						<span className="text-orange-500 font-bold">2.</span>
						<span>Interview salons with 10+ bookings - find what works</span>
					</li>
					<li className="flex items-start gap-2 text-sm text-gray-700">
						<span className="text-orange-500 font-bold">3.</span>
						<span>Check cancellation reasons (high cancel rate = bad fit)</span>
					</li>
					<li className="flex items-start gap-2 text-sm text-gray-700">
						<span className="text-orange-500 font-bold">4.</span>
						<span>Double down on top service categories for marketing</span>
					</li>
				</ul>
			</div>
		</div>
	);
}
