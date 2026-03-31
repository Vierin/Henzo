'use client';

import { useAdminPlatformMetrics } from '@/hooks/useAdminPlatformMetrics';
import LoadingSpinner from '@/components/LoadingSpinner';
import {
	Database,
	Server,
	Mail,
	DollarSign,
	AlertTriangle,
	CheckCircle,
	Activity,
	HardDrive,
	Zap,
	Clock,
	TrendingUp,
} from 'lucide-react';

function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 B';
	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function formatUptime(seconds: number): string {
	const days = Math.floor(seconds / 86400);
	const hours = Math.floor((seconds % 86400) / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);

	if (days > 0) {
		return `${days}d ${hours}h ${minutes}m`;
	}
	if (hours > 0) {
		return `${hours}h ${minutes}m`;
	}
	return `${minutes}m`;
}

function getStatusColor(percent: number): string {
	if (percent >= 95) return 'text-red-600 bg-red-50 border-red-200';
	if (percent >= 80) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
	return 'text-green-600 bg-green-50 border-green-200';
}

function getStatusIcon(percent: number) {
	if (percent >= 95) return '🔴';
	if (percent >= 80) return '🟡';
	return '🟢';
}

export default function PlatformMetricsPage() {
	const { data, isLoading, error } = useAdminPlatformMetrics();

	if (isLoading) {
		return <LoadingSpinner size="lg" message="Loading platform metrics..." />;
	}

	if (error) {
		return (
			<div className="text-center py-12">
				<div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
					<span className="text-2xl">⚠️</span>
				</div>
				<h3 className="text-xl font-semibold text-gray-900 mb-2">
					Error loading platform metrics
				</h3>
				<p className="text-gray-600">
					{error instanceof Error ? error.message : 'Failed to load metrics'}
				</p>
			</div>
		);
	}

	if (!data) return null;

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">
						Platform Metrics
					</h1>
					<p className="text-gray-600 mt-1">
						Monitor infrastructure health and resource usage
					</p>
				</div>
				<div className="text-sm text-gray-500">
					Last updated:{' '}
					{new Date(data.timestamp).toLocaleTimeString('en-US', {
						hour: '2-digit',
						minute: '2-digit',
					})}
				</div>
			</div>

			{/* Alerts */}
			{data.alerts.length > 0 && (
				<div className="space-y-2">
					{data.alerts.map((alert, index) => (
						<div
							key={index}
							className={`p-4 rounded-lg border ${
								alert.type === 'critical'
									? 'bg-red-50 border-red-200 text-red-800'
									: 'bg-yellow-50 border-yellow-200 text-yellow-800'
							}`}
						>
							<div className="flex items-center gap-2">
								<AlertTriangle className="w-5 h-5" />
								<span className="font-semibold">
									{alert.type === 'critical' ? 'Critical' : 'Warning'}:
								</span>
								<span>{alert.message}</span>
							</div>
						</div>
					))}
				</div>
			)}

			{/* Quick Status Cards */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<div
					className={`bg-white rounded-xl p-4 shadow-sm border-2 ${getStatusColor(
						data.database.connectionPoolUsage
					)}`}
				>
					<div className="flex items-center justify-between mb-2">
						<div className="flex items-center gap-2">
							<Database className="w-5 h-5" />
							<span className="text-sm font-medium">Database</span>
						</div>
						<span className="text-2xl">{getStatusIcon(data.database.connectionPoolUsage)}</span>
					</div>
					<div className="text-2xl font-bold">
						{data.database.activeConnections}/{data.database.maxConnections}
					</div>
					<div className="text-xs mt-1">connections</div>
				</div>

				<div
					className={`bg-white rounded-xl p-4 shadow-sm border-2 ${getStatusColor(
						data.backend.memoryUsagePercent
					)}`}
				>
					<div className="flex items-center justify-between mb-2">
						<div className="flex items-center gap-2">
							<Server className="w-5 h-5" />
							<span className="text-sm font-medium">Backend</span>
						</div>
						<span className="text-2xl">{getStatusIcon(data.backend.memoryUsagePercent)}</span>
					</div>
					<div className="text-2xl font-bold">
						{data.backend.memoryUsageMB}MB
					</div>
					<div className="text-xs mt-1">of {data.backend.memoryLimitMB}MB</div>
				</div>

				<div
					className={`bg-white rounded-xl p-4 shadow-sm border-2 ${getStatusColor(
						data.email.usagePercent
					)}`}
				>
					<div className="flex items-center justify-between mb-2">
						<div className="flex items-center gap-2">
							<Mail className="w-5 h-5" />
							<span className="text-sm font-medium">Email</span>
						</div>
						<span className="text-2xl">{getStatusIcon(data.email.usagePercent)}</span>
					</div>
					<div className="text-2xl font-bold">
						{data.email.sentToday}/{data.email.dailyLimit}
					</div>
					<div className="text-xs mt-1">emails today</div>
				</div>

				<div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
					<div className="flex items-center gap-2 mb-2">
						<DollarSign className="w-5 h-5 text-green-600" />
						<span className="text-sm font-medium text-gray-700">
							Monthly Costs
						</span>
					</div>
					<div className="text-2xl font-bold text-gray-900">
						${data.infrastructure.total.toFixed(2)}
					</div>
					<div className="text-xs text-gray-500 mt-1">estimated</div>
				</div>
			</div>

			{/* Database Metrics */}
			<div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
				<div className="flex items-center gap-3 mb-6">
					<Database className="w-6 h-6 text-blue-600" />
					<h2 className="text-xl font-bold text-gray-900">Database (Supabase)</h2>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					<div>
						<div className="text-sm text-gray-600 mb-2">Connection Pool</div>
						<div className="text-2xl font-bold text-gray-900">
							{data.database.activeConnections} / {data.database.maxConnections}
						</div>
						<div className="mt-2">
							<div className="w-full bg-gray-200 rounded-full h-2">
								<div
									className={`h-2 rounded-full ${
										data.database.connectionPoolUsage >= 95
											? 'bg-red-500'
											: data.database.connectionPoolUsage >= 80
												? 'bg-yellow-500'
												: 'bg-green-500'
									}`}
									style={{
										width: `${Math.min(data.database.connectionPoolUsage, 100)}%`,
									}}
								></div>
							</div>
							<div className="text-xs text-gray-500 mt-1">
								{data.database.connectionPoolUsage.toFixed(1)}% used
							</div>
						</div>
					</div>
					<div>
						<div className="text-sm text-gray-600 mb-2">Database Size</div>
						<div className="text-2xl font-bold text-gray-900">
							{data.database.databaseSize}
						</div>
						<div className="mt-2">
							<div className="w-full bg-gray-200 rounded-full h-2">
								<div
									className={`h-2 rounded-full ${
										data.database.databaseSizePercent >= 95
											? 'bg-red-500'
											: data.database.databaseSizePercent >= 80
												? 'bg-yellow-500'
												: 'bg-green-500'
									}`}
									style={{
										width: `${Math.min(data.database.databaseSizePercent, 100)}%`,
									}}
								></div>
							</div>
							<div className="text-xs text-gray-500 mt-1">
								{data.database.databaseSizePercent.toFixed(1)}% of{' '}
								{formatBytes(data.database.databaseSizeLimit)}
							</div>
						</div>
					</div>
					<div>
						<div className="text-sm text-gray-600 mb-2">Status</div>
						<div
							className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
								data.database.connectionPoolUsage >= 95 ||
								data.database.databaseSizePercent >= 95
									? 'bg-red-100 text-red-800'
									: data.database.connectionPoolUsage >= 80 ||
											data.database.databaseSizePercent >= 80
										? 'bg-yellow-100 text-yellow-800'
										: 'bg-green-100 text-green-800'
							}`}
						>
							<CheckCircle className="w-4 h-4" />
							{data.database.connectionPoolUsage >= 95 ||
							data.database.databaseSizePercent >= 95
								? 'Critical'
								: data.database.connectionPoolUsage >= 80 ||
										data.database.databaseSizePercent >= 80
									? 'Warning'
									: 'Healthy'}
						</div>
					</div>
				</div>
			</div>

			{/* Backend Metrics */}
			<div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
				<div className="flex items-center gap-3 mb-6">
					<Server className="w-6 h-6 text-purple-600" />
					<h2 className="text-xl font-bold text-gray-900">Backend (DigitalOcean)</h2>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
					<div>
						<div className="flex items-center gap-2 mb-2">
							<HardDrive className="w-4 h-4 text-gray-500" />
							<div className="text-sm text-gray-600">Memory Usage</div>
						</div>
						<div className="text-2xl font-bold text-gray-900">
							{data.backend.memoryUsageMB} MB
						</div>
						<div className="text-xs text-gray-500 mt-1">
							of {data.backend.memoryLimitMB} MB (
							{data.backend.memoryUsagePercent.toFixed(1)}%)
						</div>
						<div className="mt-2">
							<div className="w-full bg-gray-200 rounded-full h-2">
								<div
									className={`h-2 rounded-full ${
										data.backend.memoryUsagePercent >= 95
											? 'bg-red-500'
											: data.backend.memoryUsagePercent >= 80
												? 'bg-yellow-500'
												: 'bg-blue-500'
									}`}
									style={{
										width: `${Math.min(data.backend.memoryUsagePercent, 100)}%`,
									}}
								></div>
							</div>
						</div>
					</div>
					<div>
						<div className="flex items-center gap-2 mb-2">
							<Activity className="w-4 h-4 text-gray-500" />
							<div className="text-sm text-gray-600">CPU Usage</div>
						</div>
						<div className="text-2xl font-bold text-gray-900">
							{data.backend.cpuUsagePercent !== null
								? `${data.backend.cpuUsagePercent.toFixed(1)}%`
								: 'N/A'}
						</div>
						<div className="text-xs text-gray-500 mt-1">real-time</div>
					</div>
					<div>
						<div className="flex items-center gap-2 mb-2">
							<TrendingUp className="w-4 h-4 text-gray-500" />
							<div className="text-sm text-gray-600">Requests/min</div>
						</div>
						<div className="text-2xl font-bold text-gray-900">
							{data.backend.requestsPerMinute}
						</div>
						<div className="text-xs text-gray-500 mt-1">
							Avg: {data.backend.averageResponseTime}ms
						</div>
					</div>
					<div>
						<div className="flex items-center gap-2 mb-2">
							<Clock className="w-4 h-4 text-gray-500" />
							<div className="text-sm text-gray-600">Uptime</div>
						</div>
						<div className="text-2xl font-bold text-gray-900">
							{formatUptime(data.backend.uptime)}
						</div>
						<div className="text-xs text-gray-500 mt-1">
							Error rate: {data.backend.errorRate.toFixed(2)}%
						</div>
					</div>
				</div>
			</div>

			{/* Email Metrics */}
			<div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
				<div className="flex items-center gap-3 mb-6">
					<Mail className="w-6 h-6 text-orange-600" />
					<h2 className="text-xl font-bold text-gray-900">Email (Brevo)</h2>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					<div>
						<div className="text-sm text-gray-600 mb-2">Daily Quota</div>
						<div className="text-2xl font-bold text-gray-900">
							{data.email.sentToday} / {data.email.dailyLimit}
						</div>
						<div className="text-xs text-gray-500 mt-1">
							{data.email.remainingToday} remaining today
						</div>
						<div className="mt-2">
							<div className="w-full bg-gray-200 rounded-full h-2">
								<div
									className={`h-2 rounded-full ${
										data.email.usagePercent >= 95
											? 'bg-red-500'
											: data.email.usagePercent >= 80
												? 'bg-yellow-500'
												: 'bg-green-500'
									}`}
									style={{ width: `${Math.min(data.email.usagePercent, 100)}%` }}
								></div>
							</div>
							<div className="text-xs text-gray-500 mt-1">
								{data.email.usagePercent.toFixed(1)}% used
							</div>
						</div>
					</div>
					<div>
						<div className="text-sm text-gray-600 mb-2">Monthly Usage</div>
						<div className="text-2xl font-bold text-gray-900">
							{data.email.sentThisMonth} / {data.email.monthlyLimit}
						</div>
						<div className="text-xs text-gray-500 mt-1">
							{data.email.monthlyUsagePercent.toFixed(1)}% of monthly limit
						</div>
					</div>
					<div>
						<div className="text-sm text-gray-600 mb-2">Plan</div>
						<div className="text-2xl font-bold text-gray-900">Free</div>
						<div className="text-xs text-gray-500 mt-1">
							300 emails/day limit
						</div>
					</div>
				</div>
			</div>

			{/* Infrastructure Costs */}
			<div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
				<div className="flex items-center gap-3 mb-6">
					<DollarSign className="w-6 h-6 text-green-600" />
					<h2 className="text-xl font-bold text-gray-900">Infrastructure Costs</h2>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
					<div className="p-4 bg-gray-50 rounded-lg">
						<div className="text-sm text-gray-600 mb-1">DigitalOcean</div>
						<div className="text-2xl font-bold text-gray-900">
							${data.infrastructure.digitalOcean.estimatedMonthly.toFixed(2)}
						</div>
						<div className="text-xs text-gray-500 mt-1">
							{data.infrastructure.digitalOcean.plan}
						</div>
					</div>
					<div className="p-4 bg-gray-50 rounded-lg">
						<div className="text-sm text-gray-600 mb-1">Supabase</div>
						<div className="text-2xl font-bold text-gray-900">
							${data.infrastructure.supabase.estimatedMonthly.toFixed(2)}
						</div>
						<div className="text-xs text-gray-500 mt-1">
							{data.infrastructure.supabase.plan}
						</div>
					</div>
					<div className="p-4 bg-gray-50 rounded-lg">
						<div className="text-sm text-gray-600 mb-1">Vercel</div>
						<div className="text-2xl font-bold text-gray-900">
							${data.infrastructure.vercel.estimatedMonthly.toFixed(2)}
						</div>
						<div className="text-xs text-gray-500 mt-1">
							{data.infrastructure.vercel.plan}
						</div>
					</div>
					<div className="p-4 bg-gray-50 rounded-lg">
						<div className="text-sm text-gray-600 mb-1">Brevo</div>
						<div className="text-2xl font-bold text-gray-900">
							${data.infrastructure.brevo.estimatedMonthly.toFixed(2)}
						</div>
						<div className="text-xs text-gray-500 mt-1">
							{data.infrastructure.brevo.plan}
						</div>
					</div>
				</div>
				<div className="mt-6 pt-6 border-t border-gray-200">
					<div className="flex items-center justify-between">
						<div className="text-lg font-semibold text-gray-900">
							Total Estimated Monthly Cost
						</div>
						<div className="text-3xl font-bold text-green-600">
							${data.infrastructure.total.toFixed(2)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

