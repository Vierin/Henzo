'use client';

import { ReactNode } from 'react';

interface StatsCardProps {
	title: string;
	value: string | number;
	icon: ReactNode;
	trend?: {
		value: string;
		isPositive: boolean;
	};
	subtitle?: string;
}

export default function StatsCard({
	title,
	value,
	icon,
	trend,
	subtitle,
}: StatsCardProps) {
	return (
		<div className="bg-white rounded-xl border border-[#f1d9d7] p-4 sm:p-6 hover:shadow-md transition-shadow">
			<div className="flex items-start justify-between">
				<div className="flex-1 min-w-0">
					<p className="text-xs sm:text-sm font-medium text-gray-600 mb-1 truncate">{title}</p>
					<p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-1 truncate">{value}</p>
					{subtitle && <p className="text-xs sm:text-sm text-gray-500 truncate">{subtitle}</p>}
					{trend && (
						<div className="flex items-center gap-1 mt-2">
							<span
								className={`text-xs sm:text-sm font-medium ${
									trend.isPositive ? 'text-green-600' : 'text-red-600'
								}`}
							>
								{trend.isPositive ? '↑' : '↓'} {trend.value}
							</span>
							<span className="text-xs text-gray-500 hidden sm:inline">vs last month</span>
						</div>
					)}
				</div>
				<div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-[#fff7f6] flex-shrink-0 ml-2">
					<div className="text-[#ff5b5b] scale-75 sm:scale-100">{icon}</div>
				</div>
			</div>
		</div>
	);
}
