'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { formatDateSafe, formatTimeSafe } from '@/utils/date';
import { formatVND } from '@/utils/currency';

interface Booking {
	id: string;
	time: string;
	status: string;
	notes?: string;
	createdAt: string;
	salon: {
		id: string;
		name: string;
	};
	user: {
		id: string;
		name?: string;
		email: string;
	};
	service: {
		id: string;
		name: string;
		price: number;
	};
	staff?: {
		id: string;
		name: string;
	};
}

export default function AdminBookings() {
	const [bookings, setBookings] = useState<Booking[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchBookings = async () => {
			try {
				const data = await apiClient.get<Booking[]>('/admin/bookings');
				setBookings(data);
			} catch (err) {
				setError(
					err instanceof Error ? err.message : 'Failed to load bookings'
				);
			} finally {
				setLoading(false);
			}
		};

		fetchBookings();
	}, []);

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'CONFIRMED':
				return 'bg-green-100 text-green-800';
			case 'PENDING':
				return 'bg-yellow-100 text-yellow-800';
			case 'CANCELED':
				return 'bg-red-100 text-red-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff5b5b]"></div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="text-center py-12">
				<div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
					<span className="text-2xl">⚠️</span>
				</div>
				<h3 className="text-xl font-semibold text-gray-900 mb-2">
					Error loading bookings
				</h3>
				<p className="text-gray-600">{error}</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<h1 className="text-3xl font-bold text-gray-900">All Bookings</h1>
				<div className="text-sm text-gray-500">
					Total: {bookings.length} bookings
				</div>
			</div>

			<div className="bg-white shadow overflow-hidden sm:rounded-md">
				<div className="px-4 py-5 sm:p-6">
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Salon
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Client
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Service
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Staff
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Date & Time
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Status
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Price
									</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{bookings.map((booking) => (
									<tr key={booking.id} className="hover:bg-gray-50">
										<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
											{booking.salon.name}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											<div>
												<div className="font-medium text-gray-900">
													{booking.user.name || 'Unknown'}
												</div>
												<div className="text-gray-500">
													{booking.user.email}
												</div>
											</div>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											{booking.service.name}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											{booking.staff?.name || 'Any'}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											<div>
												<div>{formatDateSafe(booking.time)}</div>
												<div>{formatTimeSafe(booking.time)}</div>
											</div>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<span
												className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(booking.status)}`}
											>
												{booking.status}
											</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											{formatVND(booking.service.price)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</div>
	);
}
