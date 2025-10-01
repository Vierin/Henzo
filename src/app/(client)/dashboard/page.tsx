'use client';

import { useUpcomingBookings } from '@/hooks/useClient';
import VisitHistoryCard from '@/components/VisitHistoryCard';
import SalonImage from '@/components/SalonImage';
import { formatDateTimeSafe } from '@/utils/date';

export default function ClientDashboard() {
	const { data: upcomingBookings, isLoading, error } = useUpcomingBookings();

	const handleBookAgain = (booking: any) => {
		// Navigate to booking page or open booking modal
		console.log('Book again:', booking);
	};

	if (isLoading) {
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
				<p className="text-gray-600">
					There was an error loading your upcoming bookings. Please try again
					later.
				</p>
			</div>
		);
	}

	const upcomingBookingsList = upcomingBookings || [];

	return (
		<div>
			<h1 className="text-3xl font-bold text-gray-900 mb-8">
				Upcoming Appointments
			</h1>

			{upcomingBookingsList.length === 0 ? (
				<div className="text-center py-12">
					<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
						<span className="text-2xl">📅</span>
					</div>
					<h3 className="text-xl font-semibold text-gray-900 mb-2">
						No upcoming appointments
					</h3>
					<p className="text-gray-600">
						Your upcoming appointments will appear here once you start booking
						services.
					</p>
				</div>
			) : (
				<div className="space-y-4">
					{upcomingBookingsList.map((booking) => (
						<VisitHistoryCard
							key={booking.id}
							visit={{
								id: booking.id,
								salonName: booking.salon.name,
								serviceName: booking.service.name,
								date: formatDateTimeSafe(booking.time),
								image: booking.salon.logo || '',
							}}
							onBookAgain={handleBookAgain}
						/>
					))}
				</div>
			)}
		</div>
	);
}
