import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface PlatformMetrics {
	database: {
		activeConnections: number;
		maxConnections: number;
		connectionPoolUsage: number;
		databaseSize: string;
		databaseSizeBytes: number;
		databaseSizeLimit: number;
		databaseSizePercent: number;
	};
	backend: {
		memoryUsageMB: number;
		memoryLimitMB: number;
		memoryUsagePercent: number;
		cpuUsagePercent: number | null;
		requestsPerMinute: number;
		averageResponseTime: number;
		errorRate: number;
		uptime: number;
	};
	email: {
		sentToday: number;
		dailyLimit: number;
		usagePercent: number;
		remainingToday: number;
		sentThisMonth: number;
		monthlyLimit: number;
		monthlyUsagePercent: number;
	};
	infrastructure: {
		digitalOcean: {
			estimatedMonthly: number;
			plan: string;
		};
		supabase: {
			estimatedMonthly: number;
			plan: string;
		};
		vercel: {
			estimatedMonthly: number;
			plan: string;
		};
		brevo: {
			estimatedMonthly: number;
			plan: string;
		};
		total: number;
	};
	alerts: Array<{
		type: 'warning' | 'critical';
		message: string;
		metric: string;
	}>;
	timestamp: string;
}

export function useAdminPlatformMetrics() {
	return useQuery({
		queryKey: ['admin-platform-metrics'],
		queryFn: async (): Promise<PlatformMetrics> => {
			try {
				const response = await apiClient.get<PlatformMetrics>(
					'/admin/platform-metrics'
				);
				return response;
			} catch (error) {
				console.error('Error fetching platform metrics:', error);
				throw error;
			}
		},
		staleTime: 30 * 1000, // 30 seconds (metrics should be fresh)
		refetchInterval: 60 * 1000, // Refetch every minute
	});
}

