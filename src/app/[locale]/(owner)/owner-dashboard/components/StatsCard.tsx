'use client';

import { ReactNode } from 'react';
import { useTranslation } from '@/contexts/LanguageContext';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

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
	const t = useTranslation();
	return (
		<div className="bg-white rounded-xl border border-[#f1d9d7] p-4 sm:p-6 hover:shadow-md transition-shadow">
			<div className="flex items-start flex-wrap justify-between">
				<div className="flex-1 min-w-0">
					<p className="text-xs sm:text-sm font-medium text-gray-600 mb-1 truncate">
						{title}
					</p>
					<p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-1 truncate">
						{value}
					</p>
					{subtitle && (
						<p className="hidden sm:block text-xs sm:text-sm text-gray-500 truncate">
							{subtitle}
						</p>
					)}
				</div>
				<div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-[#fff7f6] flex-shrink-0 ml-2">
					<div className="text-[#ff5b5b] scale-75 sm:scale-100">{icon}</div>
				</div>

				{trend && (
					<div className="flex w-full items-center mt-2">
						<div
							className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
								trend.isPositive
									? 'bg-green-50 text-green-700'
									: 'bg-red-50 text-red-700'
							}`}
						>
							<span className="w-4 h-4">
								{trend.isPositive ? (
									<ArrowUpRight className="w-4 h-4 text-green-500" />
								) : (
									<ArrowDownRight className="w-4 h-4 text-red-500" />
								)}
							</span>
							<span className="text-xs sm:text-sm font-medium">
								{trend.value}
							</span>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
