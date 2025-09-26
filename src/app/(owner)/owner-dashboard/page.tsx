'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BookingModal from '@/components/BookingModal';
import { Service, Booking } from '@/types';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';

export default function OwnerDashboardPage() {
	const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
	const [selectedService, setSelectedService] = useState<Service | undefined>();
	const [bookings, setBookings] = useState<Booking[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [statusFilter, setStatusFilter] = useState<string>('all');
	const [dateFilter, setDateFilter] = useState<string>('all');
	const router = useRouter();

	const fetchBookings = async () => {
		try {
			setLoading(true);
			setError(null);

			// Загружаем бронирования для текущего салона владельца
			const data = await apiClient.get<Booking[]>('/bookings/owner');
			setBookings(data);
		} catch (err) {
			console.error('Error fetching bookings:', err);
			setError(err instanceof Error ? err.message : 'Failed to load bookings');
			toast.error('Failed to load bookings');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchBookings();
	}, []);

	const handleNewAppointment = () => {
		// Открываем модальное окно без предварительно выбранного сервиса
		setSelectedService(undefined);
		setIsBookingModalOpen(true);
	};

	const handleBookingModalClose = () => {
		setIsBookingModalOpen(false);
		// Обновляем данные после закрытия модального окна
		fetchBookings();
	};

	const handleCancelBooking = async (bookingId: string) => {
		try {
			console.log('🚫 Cancelling booking:', bookingId);
			const result = await apiClient.put(`/bookings/${bookingId}/cancel`);
			console.log('✅ Cancel result:', result);
			toast.success('Booking cancelled successfully');
			fetchBookings(); // Обновляем список
		} catch (error) {
			console.error('❌ Error cancelling booking:', error);
			const errorMessage =
				error instanceof Error ? error.message : 'Failed to cancel booking';
			toast.error(errorMessage);
		}
	};

	// Фильтруем бронирования по статусу и дате
	const getFilteredBookings = () => {
		const now = new Date();

		return bookings.filter((booking) => {
			const bookingDate = new Date(booking.time);
			const isToday = bookingDate.toDateString() === now.toDateString();
			const isThisWeek =
				bookingDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) &&
				bookingDate <= now;
			const isPast = bookingDate < now;
			const isUpcoming = bookingDate >= now;

			// Фильтр по статусу
			let statusMatch = true;
			if (statusFilter !== 'all') {
				statusMatch = booking.status === statusFilter;
			}

			// Фильтр по дате
			let dateMatch = true;
			if (dateFilter !== 'all') {
				switch (dateFilter) {
					case 'today':
						dateMatch = isToday;
						break;
					case 'this_week':
						dateMatch = isThisWeek;
						break;
					case 'past':
						dateMatch = isPast;
						break;
					case 'upcoming':
						dateMatch = isUpcoming;
						break;
				}
			}

			return statusMatch && dateMatch;
		});
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
		});
	};

	const formatTime = (dateString: string) => {
		return new Date(dateString).toLocaleTimeString('en-US', {
			hour: '2-digit',
			minute: '2-digit',
			hour12: false,
		});
	};

	const getStatusBadge = (status: string) => {
		switch (status) {
			case 'CONFIRMED':
				return (
					<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
						Confirmed
					</span>
				);
			case 'PASSED':
				return (
					<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
						Passed
					</span>
				);
			case 'CANCELED':
				return (
					<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
						Cancelled
					</span>
				);
			default:
				return (
					<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
						{status}
					</span>
				);
		}
	};

	return (
		<div>
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-black mb-2">Appointments</h1>
				<p className="text-gray-800">
					Manage your salon appointments and bookings
				</p>
			</div>

			<div className="flex items-center justify-between mb-6">
				<div className="flex gap-4">
					{/* Status Filter */}
					<div className="flex items-center gap-2">
						<label className="text-sm font-medium text-gray-700">Status:</label>
						<select
							value={statusFilter}
							onChange={(e) => setStatusFilter(e.target.value)}
							className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#ea4b4b] focus:border-[#ea4b4b] text-gray-900"
						>
							<option value="all">All</option>
							<option value="CONFIRMED">Confirmed</option>
							<option value="PASSED">Passed</option>
							<option value="CANCELED">Cancelled</option>
						</select>
					</div>

					{/* Date Filter */}
					<div className="flex items-center gap-2">
						<label className="text-sm font-medium text-gray-700">Date:</label>
						<select
							value={dateFilter}
							onChange={(e) => setDateFilter(e.target.value)}
							className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#ea4b4b] focus:border-[#ea4b4b] text-gray-900"
						>
							<option value="all">All</option>
							<option value="today">Today</option>
							<option value="this_week">This Week</option>
							<option value="upcoming">Upcoming</option>
							<option value="past">Past</option>
						</select>
					</div>
				</div>
				<button
					onClick={handleNewAppointment}
					className="inline-flex items-center gap-2 rounded-full bg-[#ea4b4b] text-white px-4 py-2 text-sm shadow-sm hover:opacity-95"
				>
					<span className="text-lg leading-none">＋</span>
					New Appointment
				</button>
			</div>

			<div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
				<section className="rounded-xl overflow-hidden border border-[#f1d9d7] bg-white">
					<div className="grid grid-cols-7 px-6 py-3 text-[13px] text-gray-700 bg-[#fff2f1] font-semibold">
						<div>Client</div>
						<div>Service</div>
						<div>Staff</div>
						<div>Date</div>
						<div>Time</div>
						<div>Status</div>
						<div>Actions</div>
					</div>
					<div className="divide-y divide-[#f1d9d7]">
						{loading ? (
							<div className="px-6 py-8 text-center">
								<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ea4b4b] mx-auto"></div>
								<p className="mt-2 text-gray-600">Loading bookings...</p>
							</div>
						) : error ? (
							<div className="px-6 py-8 text-center">
								<div className="text-red-500 mb-2">⚠️</div>
								<p className="text-gray-600 mb-4">{error}</p>
								<button
									onClick={fetchBookings}
									className="text-[#ea4b4b] hover:text-[#d43d3d] font-medium"
								>
									Try again
								</button>
							</div>
						) : getFilteredBookings().length === 0 ? (
							<div className="px-6 py-8 text-center">
								<div className="text-gray-400 mb-2">📅</div>
								<p className="text-gray-600">
									No bookings found with current filters
								</p>
							</div>
						) : (
							getFilteredBookings().map((booking) => (
								<div
									key={booking.id}
									className="grid grid-cols-7 px-6 py-4 text-[15px] text-gray-800"
								>
									<div className="font-semibold">
										{booking.user?.name || 'Unknown Client'}
									</div>
									<div>{booking.service?.name || 'Unknown Service'}</div>
									<div>{booking.staff?.name || 'Unassigned'}</div>
									<div>{formatDate(booking.time)}</div>
									<div>{formatTime(booking.time)}</div>
									<div>{getStatusBadge(booking.status)}</div>
									<div>
										{booking.status === 'CONFIRMED' && (
											<button
												onClick={() => handleCancelBooking(booking.id)}
												className="text-red-600 hover:text-red-800 text-sm font-medium"
											>
												Cancel
											</button>
										)}
									</div>
								</div>
							))
						)}
					</div>
				</section>

				<aside className="rounded-xl border border-[#f1d9d7] bg-white p-6">
					<h3 className="text-[18px] font-semibold text-black">
						Quick Actions
					</h3>
					<ul className="mt-4 space-y-3 text-[15px]">
						<li>
							<button
								onClick={() => router.push('/services/new')}
								className="w-full flex items-center justify-between rounded-lg border border-[#f6e7e6] px-4 py-3 hover:bg-[#fff7f6] transition-colors text-gray-800"
							>
								<span className="font-medium">Add New Services</span>
								<span className="text-xl">＋</span>
							</button>
						</li>
						<li>
							<button
								onClick={() => router.push('/staff/new')}
								className="w-full flex items-center justify-between rounded-lg border border-[#f6e7e6] px-4 py-3 hover:bg-[#fff7f6] transition-colors text-gray-800"
							>
								<span className="font-medium">Add New Staff</span>
								<span className="text-xl">＋</span>
							</button>
						</li>
						<li>
							<button
								onClick={() => router.push('/salon-info')}
								className="w-full flex items-center justify-between rounded-lg border border-[#f6e7e6] px-4 py-3 hover:bg-[#fff7f6] transition-colors text-gray-800"
							>
								<span className="font-medium">Salon Information</span>
								<span>⚙️</span>
							</button>
						</li>
					</ul>
				</aside>
			</div>

			{/* Booking Modal */}
			<BookingModal
				isOpen={isBookingModalOpen}
				onClose={handleBookingModalClose}
				service={selectedService}
				showServiceSelector={true}
			/>
		</div>
	);
}
