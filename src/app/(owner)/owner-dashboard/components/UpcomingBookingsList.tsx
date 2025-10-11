'use client';

import { Booking } from '@/types';
import { formatDateShort, formatTimeSafe } from '@/utils/date';
import { Calendar, Clock, User } from 'lucide-react';
import Link from 'next/link';

interface UpcomingBookingsListProps {
	bookings: Booking[];
	loading: boolean;
}

export default function UpcomingBookingsList({
	bookings,
	loading,
}: UpcomingBookingsListProps) {
	const getStatusColor = (status: string) => {
		switch (status) {
			case 'PENDING':
				return 'bg-yellow-100 text-yellow-800 border-yellow-200';
			case 'CONFIRMED':
				return 'bg-green-100 text-green-800 border-green-200';
			case 'COMPLETED':
				return 'bg-blue-100 text-blue-800 border-blue-200';
			case 'CANCELED':
				return 'bg-red-100 text-red-800 border-red-200';
			default:
				return 'bg-gray-100 text-gray-800 border-gray-200';
		}
	};

	if (loading) {
		return (
			<div className="bg-white rounded-xl border border-[#f1d9d7] p-6">
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ea4b4b]"></div>
				</div>
			</div>
		);
	}

	if (bookings.length === 0) {
		return (
			<div className="bg-white rounded-xl border border-[#f1d9d7] p-6">
				<div className="text-center py-12">
					<Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
					<p className="text-gray-600">No upcoming bookings</p>
				</div>
			</div>
		);
	}

	return (
		<div className="bg-white rounded-xl border border-[#f1d9d7] overflow-hidden">
			<div className="p-6 border-b border-[#f1d9d7]">
				<div className="flex items-center justify-between">
					<h2 className="text-xl font-semibold text-gray-900">
						Upcoming Bookings
					</h2>
					<Link
						href="/calendar"
						className="text-sm text-[#ff5b5b] hover:text-[#e04a4a] font-medium"
					>
						View Calendar →
					</Link>
				</div>
			</div>

			<div className="divide-y divide-[#f1d9d7]">
				{bookings.slice(0, 7).map((booking) => (
					<div
						key={booking.id}
						className="p-6 hover:bg-[#fffbfa] transition-colors"
					>
						<div className="flex items-start justify-between">
							<div className="flex-1">
								<div className="flex items-center gap-3 mb-2">
									<h3 className="font-semibold text-gray-900">
										{booking.user?.name ||
											`Client ${booking.userId.slice(0, 8)}`}
									</h3>
									<span
										className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusColor(
											booking.status
										)}`}
									>
										{booking.status}
									</span>
								</div>

								<div className="space-y-1 text-sm text-gray-600">
									<div className="flex items-center gap-2">
										<Calendar className="w-4 h-4 text-gray-400" />
										<span>{formatDateShort(booking.time)}</span>
										<Clock className="w-4 h-4 text-gray-400 ml-2" />
										<span>{formatTimeSafe(booking.time)}</span>
									</div>
									<div className="flex items-center gap-2">
										<span className="font-medium text-gray-700">
											{booking.service?.name || 'Unknown Service'}
										</span>
										<span className="text-gray-400">•</span>
										<span>{booking.service?.duration || 0} min</span>
										{booking.staff && (
											<>
												<span className="text-gray-400">•</span>
												<span>{booking.staff.name}</span>
											</>
										)}
									</div>
								</div>
							</div>

							<div className="text-right">
								<p className="text-lg font-bold text-gray-900">
									{(booking.service?.price || 0).toLocaleString()}₫
								</p>
							</div>
						</div>
					</div>
				))}
			</div>

			{bookings.length > 7 && (
				<div className="p-4 bg-[#fff7f6] border-t border-[#f1d9d7]">
					<Link
						href="/calendar"
						className="block text-center text-sm text-[#ff5b5b] hover:text-[#e04a4a] font-medium"
					>
						Show all {bookings.length} bookings →
					</Link>
				</div>
			)}
		</div>
	);
}
