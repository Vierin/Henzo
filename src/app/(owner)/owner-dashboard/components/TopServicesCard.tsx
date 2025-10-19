'use client';

import { Booking } from '@/types';

interface TopServicesCardProps {
	bookings: Booking[];
}

// Helper function to format currency with k/m notation
const formatCurrency = (amount: number): string => {
	if (amount >= 1000000) {
		return `${(amount / 1000000).toFixed(1)}M₫`;
	} else if (amount >= 1000) {
		return `${(amount / 1000).toFixed(1)}k₫`;
	}
	return `${amount}₫`;
};

export default function TopServicesCard({ bookings }: TopServicesCardProps) {
	// Calculate top services
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

	const topServices = Object.values(serviceStats)
		.sort((a, b) => b.revenue - a.revenue)
		.slice(0, 5);

	return (
		<div className="bg-white rounded-xl border border-[#f1d9d7] overflow-hidden">
			<div className="p-6 border-b border-[#f1d9d7]">
				<h2 className="text-xl font-semibold text-gray-900">
					Top Selling Services
				</h2>
			</div>

			{/* Table Header */}
			<div
				className="grid grid-cols-12 px-3 md:px-6 py-3 text-[13px] text-gray-700 bg-[#fff2f1] font-semibold"
				role="rowgroup"
			>
				<div className="col-span-1" role="columnheader">
					#
				</div>
				<div className="col-span-5" role="columnheader">
					Service Name
				</div>
				<div className="col-span-3" role="columnheader">
					Bookings
				</div>
				<div className="col-span-3 text-right" role="columnheader">
					Total Revenue
				</div>
			</div>

			{/* Table Body */}
			<div className="divide-y divide-[#f1d9d7]" role="list">
				{topServices.length === 0 ? (
					<div className="px-6 py-8 text-center" role="status">
						<div className="text-gray-400 mb-2" aria-hidden="true">
							📊
						</div>
						<p className="text-gray-600">No completed services yet</p>
					</div>
				) : (
					topServices.map((service, index) => (
						<div
							key={service.name}
							className="grid grid-cols-12 px-3 md:px-6 py-3 text-[15px] text-gray-800 hover:bg-[#fffbfa] transition-colors"
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
								{formatCurrency(service.revenue)}
							</div>
						</div>
					))
				)}
			</div>
		</div>
	);
}
