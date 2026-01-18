'use client';

import { useMemo } from 'react';
import { Booking } from '@/types';
import { useTranslation } from '@/contexts/LanguageContext';
import { formatVND } from '@/utils/currency';

interface TopServicesCardProps {
	bookings: Booking[];
}

export default function TopServicesCard({ bookings }: TopServicesCardProps) {
	const t = useTranslation();

	// Calculate top services with memoization
	const topServices = useMemo(() => {
		const serviceStats = bookings
			.filter((b) => b.status === 'COMPLETED' && b.service)
			.reduce(
				(acc, booking) => {
					const serviceName = booking.service!.name;
					const servicePrice = booking.service!.price || 0;

					if (!acc[serviceName]) {
						acc[serviceName] = {
							name: serviceName,
							count: 0,
							revenue: 0,
						};
					}

					acc[serviceName].count += 1;
					acc[serviceName].revenue += servicePrice;

					return acc;
				},
				{} as Record<
					string,
					{
						name: string;
						count: number;
						revenue: number;
					}
				>
			);

		return Object.values(serviceStats)
			.sort((a, b) => b.revenue - a.revenue)
			.slice(0, 5);
	}, [bookings]);

	return (
		<div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
			<div className="p-6 border-b border-gray-200">
				<h2 className="text-xl font-semibold text-gray-900">
					{t('owner.dashboard.topSellingServices')}
				</h2>
			</div>

			{/* Table Header */}
			<div
				className="grid grid-cols-12 px-3 md:px-6 py-3 text-[13px] text-gray-700 bg-gray-50 font-semibold"
				role="rowgroup"
			>
				<div className="col-span-1" role="columnheader">
					#
				</div>
				<div className="col-span-5 text-center" role="columnheader">
					{t('owner.dashboard.serviceName')}
				</div>
				<div className="col-span-3 text-center" role="columnheader">
					{t('owner.dashboard.bookings')}
				</div>
				<div className="col-span-3 text-right" role="columnheader">
					{t('owner.dashboard.totalRevenue')}
				</div>
			</div>

			{/* Table Body */}
			<div className="divide-y divide-gray-200" role="list">
				{topServices.length === 0 ? (
					<div className="px-6 py-8 text-center" role="status">
						<div className="text-gray-400 mb-2" aria-hidden="true">
							📊
						</div>
						<p className="text-gray-600">
							{t('owner.dashboard.noCompletedServices')}
						</p>
					</div>
				) : (
					topServices.map((service, index) => (
						<div
							key={service.name}
							className="grid grid-cols-12 px-3 md:px-6 py-3 text-[15px] text-gray-800 hover:bg-gray-50 transition-colors"
							role="listitem"
						>
							<div className="col-span-1 flex items-center">
								<div className="flex items-center justify-center w-5 h-5 rounded-full bg-[#ff5b5b] text-white font-bold text-xs">
									{index + 1}
								</div>
							</div>
							<div className="col-span-5 text-xs font-medium flex items-center justify-center">
								{service.name}
							</div>
							<div className="col-span-3 flex justify-center items-center text-gray-600 text-xs md:text-base">
								{service.count}
							</div>
							<div className="col-span-3 text-right font-semibold flex items-center justify-end">
								{formatVND(service.revenue)}
							</div>
						</div>
					))
				)}
			</div>
		</div>
	);
}
