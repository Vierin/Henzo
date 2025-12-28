'use client';

import { useState, useEffect, useMemo } from 'react';
import { apiClient } from '@/lib/api-client';
import { formatTimeSafe, safeParseDate } from '@/utils/date';
import { formatVND } from '@/utils/currency';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';

interface Booking {
	id: string;
	time: string;
	status: string;
	notes?: string;
	createdAt: string;
	salon?: {
		id: string;
		name: string;
	};
	user?: {
		id: string;
		name?: string;
		email: string;
	};
	service?: {
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

	// Filter and search states
	const [searchTerm, setSearchTerm] = useState('');
	const [statusFilter, setStatusFilter] = useState<string>('all');
	const [sortBy, setSortBy] = useState<'date' | 'salon' | 'client' | 'service'>(
		'date'
	);
	const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

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

	// Filter and sort bookings
	const filteredAndSortedBookings = useMemo(() => {
		let filtered = [...bookings];

		// Search filter
		if (searchTerm) {
			const searchLower = searchTerm.toLowerCase();
			filtered = filtered.filter(
				(booking) =>
					booking.user?.name?.toLowerCase().includes(searchLower) ||
					booking.user?.email?.toLowerCase().includes(searchLower) ||
					booking.salon?.name?.toLowerCase().includes(searchLower) ||
					booking.service?.name?.toLowerCase().includes(searchLower)
			);
		}

		// Status filter
		if (statusFilter !== 'all') {
			filtered = filtered.filter((booking) => booking.status === statusFilter);
		}

		// Sort
		filtered.sort((a, b) => {
			let aValue: any;
			let bValue: any;

			switch (sortBy) {
				case 'date':
					aValue = new Date(a.time).getTime();
					bValue = new Date(b.time).getTime();
					break;
				case 'salon':
					aValue = a.salon?.name?.toLowerCase() || '';
					bValue = b.salon?.name?.toLowerCase() || '';
					break;
				case 'client':
					aValue = (a.user?.name || a.user?.email || '').toLowerCase();
					bValue = (b.user?.name || b.user?.email || '').toLowerCase();
					break;
				case 'service':
					aValue = a.service?.name?.toLowerCase() || '';
					bValue = b.service?.name?.toLowerCase() || '';
					break;
				default:
					aValue = new Date(a.time).getTime();
					bValue = new Date(b.time).getTime();
			}

			if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
			if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
			return 0;
		});

		return filtered;
	}, [bookings, searchTerm, statusFilter, sortBy, sortOrder]);

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'CONFIRMED':
				return 'bg-green-100 text-green-800';
			case 'COMPLETED':
				return 'bg-blue-100 text-blue-800';
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
					Showing: {filteredAndSortedBookings.length} of {bookings.length}{' '}
					bookings
				</div>
			</div>

			{/* Filters and Sorting */}
			<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
				<div className="grid grid-cols-1 md:grid-cols-5 gap-4">
					{/* Search */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Search
						</label>
						<input
							type="text"
							placeholder="Search by client name, salon name..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-gray-900"
						/>
					</div>

					{/* Status Filter */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Status
						</label>
						<Select
							value={statusFilter}
							onValueChange={(value) => setStatusFilter(value)}
						>
							<SelectTrigger className="w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-gray-900">
								<SelectValue />
							</SelectTrigger>
							<SelectContent className="bg-white border border-gray-300 shadow-lg rounded-md">
								<SelectItem
									value="all"
									className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
								>
									All Statuses
								</SelectItem>
								<SelectItem
									value="PENDING"
									className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
								>
									Pending
								</SelectItem>
								<SelectItem
									value="CONFIRMED"
									className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
								>
									Confirmed
								</SelectItem>
								<SelectItem
									value="CANCELED"
									className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
								>
									Canceled
								</SelectItem>
								<SelectItem
									value="COMPLETED"
									className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
								>
									Completed
								</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{/* Sort By */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Sort By
						</label>
						<Select
							value={sortBy}
							onValueChange={(value: 'date' | 'salon' | 'client' | 'service') =>
								setSortBy(value)
							}
						>
							<SelectTrigger className="w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-gray-900">
								<SelectValue />
							</SelectTrigger>
							<SelectContent className="bg-white border border-gray-300 shadow-lg rounded-md">
								<SelectItem
									value="date"
									className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
								>
									Date & Time
								</SelectItem>
								<SelectItem
									value="salon"
									className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
								>
									Salon Name
								</SelectItem>
								<SelectItem
									value="client"
									className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
								>
									Client Name
								</SelectItem>
								<SelectItem
									value="service"
									className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
								>
									Service Name
								</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{/* Sort Order */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Order
						</label>
						<Select
							value={sortOrder}
							onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}
						>
							<SelectTrigger className="w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-gray-900">
								<SelectValue />
							</SelectTrigger>
							<SelectContent className="bg-white border border-gray-300 shadow-lg rounded-md">
								<SelectItem
									value="desc"
									className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
								>
									Descending
								</SelectItem>
								<SelectItem
									value="asc"
									className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
								>
									Ascending
								</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{/* Clear Filters */}
					<div className="flex items-end">
						{(searchTerm ||
							statusFilter !== 'all' ||
							sortBy !== 'date' ||
							sortOrder !== 'desc') && (
							<button
								onClick={() => {
									setSearchTerm('');
									setStatusFilter('all');
									setSortBy('date');
									setSortOrder('desc');
								}}
								className="w-full px-4 py-2 text-sm text-[#ff5b5b] hover:text-white hover:bg-[#ff5b5b] font-medium border border-[#ff5b5b] rounded-lg transition-colors"
							>
								Clear Filters
							</button>
						)}
					</div>
				</div>
			</div>

			<div className="bg-white shadow overflow-hidden sm:rounded-md">
				{filteredAndSortedBookings.length === 0 ? (
					<div className="text-center py-12">
						<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
							<span className="text-2xl">🔍</span>
						</div>
						<h3 className="text-lg font-medium text-gray-900 mb-2">
							No bookings found
						</h3>
						<p className="text-gray-500">
							{searchTerm || statusFilter !== 'all'
								? 'Try adjusting your search criteria or filters.'
								: 'No bookings are available.'}
						</p>
					</div>
				) : (
					<div className="px-4 py-5 sm:p-0">
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
									{filteredAndSortedBookings.map((booking) => (
										<tr key={booking.id} className="hover:bg-gray-50">
											<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
												{booking.salon?.name || 'Unknown Salon'}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
												<div>
													<div className="font-medium text-gray-900">
														{booking.user?.name || 'Anonymous Client'}
													</div>
													{booking.user?.email &&
														!booking.user.email.includes('@anonymous.local') &&
														!booking.user.email.startsWith('anonymous-') && (
															<div className="text-gray-500">
																{booking.user.email}
															</div>
														)}
												</div>
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
												{booking.service?.name || 'Unknown Service'}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
												{booking.staff?.name || 'Any'}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
												<div>
													<div>
														{safeParseDate(booking.time)
															? safeParseDate(booking.time)!.toLocaleDateString(
																	'ru-RU',
																	{
																		day: '2-digit',
																		month: '2-digit',
																		year: 'numeric',
																	}
																)
															: 'Date not available'}
													</div>
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
												{booking.service?.price
													? formatVND(booking.service.price)
													: 'N/A'}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
