'use client';

import { useMemo } from 'react';
import { Booking, Service } from '@/types';
import { useTranslation, useLanguage } from '@/contexts/LanguageContext';
import { formatVND } from '@/utils/currency';
import { getLocalizedServiceName } from '@/utils/serviceLocalization';

interface TopServicesCardProps {
	bookings: Booking[];
}

export default function TopServicesCard({ bookings }: TopServicesCardProps) {
	const t = useTranslation();
	const { language } = useLanguage();

	// Calculate top services with memoization
	const topServices = useMemo(() => {
		const serviceStats = bookings
			.filter((b) => b.status === 'COMPLETED' && b.service)
			.reduce(
				(acc, booking) => {
					const serviceId = booking.service!.id;
					const servicePrice = booking.service!.price || 0;

					if (!acc[serviceId]) {
						acc[serviceId] = {
							service: booking.service!,
							count: 0,
							revenue: 0,
						};
					}

					acc[serviceId].count += 1;
					acc[serviceId].revenue += servicePrice;

					return acc;
				},
				{} as Record<
					string,
					{
						service: Service;
						count: number;
						revenue: number;
					}
				>,
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
				<div className="col-span-2 text-center" role="columnheader">
					{t('owner.dashboard.bookings')}
				</div>
				<div className="col-span-4 text-right" role="columnheader">
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
					topServices.map((serviceItem, index) => (
						<div
							key={serviceItem.service.id}
							className="grid grid-cols-12 px-3 md:px-6 py-3 text-[15px] text-gray-800 hover:bg-gray-50 transition-colors"
							role="listitem"
						>
							<div className="col-span-1 flex items-center">
								<div className="flex items-center justify-center w-5 h-5 rounded-full bg-[#ff5b5b] text-white font-bold text-xs">
									{index + 1}
								</div>
							</div>
							<div className="col-span-5 text-xs font-medium flex items-center justify-center">
								{getLocalizedServiceName(
									serviceItem.service,
									language as 'vi' | 'en' | 'ru',
								)}
							</div>
							<div className="col-span-2 flex justify-center items-center text-gray-600 text-xs md:text-base">
								{serviceItem.count}
							</div>
							<div className="col-span-4 text-right font-semibold flex items-center justify-end">
								{formatVND(serviceItem.revenue)}
							</div>
						</div>
					))
				)}
			</div>
		</div>
	);
}
