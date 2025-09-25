'use client';

import { useUpcomingBookings, useCancelBooking } from '@/hooks/useClient';
import VisitHistoryCard from '@/components/VisitHistoryCard';
import ReBookModal from '@/components/ReBookModal';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

export default function ClientDashboard() {
	const router = useRouter();
	const { user, isClient, isInitialized } = useAuthStore();
	const { data: upcomingBookings, isLoading, error } = useUpcomingBookings();
	const cancelBookingMutation = useCancelBooking();

	const [isReBookModalOpen, setIsReBookModalOpen] = useState(false);
	const [selectedBooking, setSelectedBooking] = useState<any>(null);

	// Redirect if not authenticated (only after initialization)
	useEffect(() => {
		if (isInitialized && !isClient) {
			router.push('/client/login');
		}
	}, [isInitialized, isClient, router]);

	const handleBookAgain = (booking: any) => {
		setSelectedBooking(booking);
		setIsReBookModalOpen(true);
	};

	const handleCancel = async (booking: any) => {
		if (confirm('Are you sure you want to cancel this appointment?')) {
			try {
				await cancelBookingMutation.mutateAsync(booking.id);
				toast.success('Appointment canceled successfully');
			} catch (error) {
				toast.error('Failed to cancel appointment');
			}
		}
	};

	const handleReBookSuccess = () => {
		setIsReBookModalOpen(false);
		setSelectedBooking(null);
		toast.success('New appointment booked successfully!');
	};

	if (!isInitialized) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff5b5b]"></div>
			</div>
		);
	}

	if (!isClient) {
		return null; // Will redirect to login
	}

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
		<div className="max-w-4xl mx-auto p-6">
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
								date: new Date(booking.time).toLocaleDateString('en-US', {
									weekday: 'long',
									year: 'numeric',
									month: 'long',
									day: 'numeric',
									hour: '2-digit',
									minute: '2-digit',
								}),
								image: booking.salon.logo || '',
								time: booking.time,
								status: booking.status,
								salonId: booking.salon.id,
								serviceId: booking.service.id,
							}}
							onBookAgain={handleBookAgain}
							onCancel={handleCancel}
							isUpcoming={true}
						/>
					))}
				</div>
			)}

			{/* ReBook Modal */}
			{selectedBooking && (
				<ReBookModal
					isOpen={isReBookModalOpen}
					onClose={() => {
						setIsReBookModalOpen(false);
						setSelectedBooking(null);
					}}
					salon={selectedBooking.salon}
					service={selectedBooking.service}
					onSuccess={handleReBookSuccess}
				/>
			)}
		</div>
	);
}
