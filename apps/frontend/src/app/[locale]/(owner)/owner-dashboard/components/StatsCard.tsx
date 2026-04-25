'use client';

import { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

interface StatsCardProps {
	title: string;
	value: string | number;
	icon: ReactNode;
	trend?: {
		value: string;
		isPositive: boolean;
	};
}

export default function StatsCard({
	title,
	value,
	icon,
	trend,
}: StatsCardProps) {
	return (
		<div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 sm:px-6 sm:py-4 hover:shadow-sm transition-shadow">
			<div className="flex items-start flex-wrap justify-between relative">
				<div className="flex-1 min-w-0">
					<p className="text-xs sm:text-sm font-medium text-gray-600 mb-6 md:mb-4 truncate">
						{title}
					</p>
					<p className="text-xl sm:text-3xl lg:text-4xl font-bold text-gray-900 truncate">
						{value}
					</p>
				</div>
				<div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg shadow-md bg-gray-50 flex-shrink-0 ml-2">
					<div className="text-[#ff5b5b] scale-65 sm:scale-80">{icon}</div>
				</div>

				{trend && (
					<div className="absolute bottom-0 right-0 items-center mt-2">
						<div
							className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
								trend.isPositive
									? 'bg-green-50 border border-green-200 text-green-700'
									: 'bg-red-50 border border-red-200 text-red-700'
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
