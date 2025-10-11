'use client';

import {
	useUpcomingBookings,
	useCompletedBookings,
	useCancelBooking,
} from '@/hooks/useClient';
import VisitHistoryCard from '@/components/VisitHistoryCard';
import { useCallback, useMemo, useState } from 'react';

export default function ClientDashboardClient() {
	const {
		data: upcomingBookings,
		isLoading: upcomingLoading,
		error: upcomingError,
	} = useUpcomingBookings();
	const {
		data: completedBookings,
		isLoading: completedLoading,
		error: completedError,
	} = useCompletedBookings();
	const cancelBookingMutation = useCancelBooking();

	const [showSuccessMessage, setShowSuccessMessage] = useState<string | null>(
		null
	);

	const handleBookAgain = useCallback((booking: any) => {
		// Navigate to booking page with pre-filled data
		const params = new URLSearchParams({
			salonId: booking.salonId || booking.salon.id,
			serviceId: booking.serviceId || booking.service.id,
			...(booking.staffId && { staffId: booking.staffId }),
		});
		window.location.href = `/salons/${booking.salonId || booking.salon.id}/book?${params.toString()}`;
	}, []);

	const handleCancel = useCallback(
		async (booking: any) => {
			try {
				await cancelBookingMutation.mutateAsync(booking.id);
				setShowSuccessMessage('Reservation canceled successfully');
				setTimeout(() => setShowSuccessMessage(null), 3000);
			} catch (error) {
				console.error('Failed to cancel booking:', error);
			}
		},
		[cancelBookingMutation]
	);

	const handleLeaveReview = useCallback((booking: any) => {
		// Navigate to review page
		window.location.href = `/reviews/create?bookingId=${booking.id}&salonId=${booking.salonId || booking.salon.id}`;
	}, []);

	const upcomingBookingsList = useMemo(
		() =>
			(upcomingBookings || []).sort(
				(a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
			),
		[upcomingBookings]
	);

	const completedBookingsList = useMemo(
		() =>
			(completedBookings || []).sort(
				(a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
			),
		[completedBookings]
	);

	const isLoading = upcomingLoading || completedLoading;
	const hasError = upcomingError || completedError;

	// Loading skeleton component
	const LoadingSkeleton = () => (
		<div className="space-y-6">
			<div className="space-y-4">
				<div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
				{[1, 2].map((i) => (
					<div
						key={i}
						className="bg-white rounded-xl p-6 shadow-sm animate-pulse"
						aria-hidden="true"
					>
						<div className="flex items-center space-x-4">
							<div className="w-20 h-20 bg-gray-200 rounded-lg"></div>
							<div className="flex-1 space-y-2">
								<div className="h-4 bg-gray-200 rounded w-3/4"></div>
								<div className="h-3 bg-gray-200 rounded w-1/2"></div>
								<div className="h-3 bg-gray-200 rounded w-1/4"></div>
							</div>
						</div>
					</div>
				))}
			</div>
			<div className="space-y-4">
				<div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
				{[1, 2, 3].map((i) => (
					<div
						key={i}
						className="bg-white rounded-xl p-6 shadow-sm animate-pulse"
						aria-hidden="true"
					>
						<div className="flex items-center space-x-4">
							<div className="w-20 h-20 bg-gray-200 rounded-lg"></div>
							<div className="flex-1 space-y-2">
								<div className="h-4 bg-gray-200 rounded w-3/4"></div>
								<div className="h-3 bg-gray-200 rounded w-1/2"></div>
								<div className="h-3 bg-gray-200 rounded w-1/4"></div>
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);

	// Error component
	const ErrorDisplay = () => (
		<div
			className="text-center py-12"
			role="alert"
			aria-labelledby="error-heading"
			aria-describedby="error-description"
		>
			<div
				className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"
				aria-hidden="true"
			>
				<span className="text-2xl">⚠️</span>
			</div>
			<h3
				id="error-heading"
				className="text-xl font-semibold text-gray-900 mb-2"
			>
				Error loading appointments
			</h3>
			<p id="error-description" className="text-gray-600 mb-4">
				There was an error loading your appointments. Please try again later.
			</p>
			<button
				onClick={() => window.location.reload()}
				className="bg-[#ff5b5b] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#e04a4a] transition-colors focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:ring-offset-2"
				aria-label="Retry loading appointments"
			>
				Try Again
			</button>
		</div>
	);

	// Empty state for upcoming appointments
	const UpcomingEmptyState = () => (
		<div
			className="text-center py-12"
			role="status"
			aria-labelledby="empty-upcoming-heading"
			aria-describedby="empty-upcoming-description"
		>
			<div
				className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4"
				aria-hidden="true"
			>
				<span className="text-2xl">📅</span>
			</div>
			<h3
				id="empty-upcoming-heading"
				className="text-xl font-semibold text-gray-900 mb-2"
			>
				No upcoming reservations
			</h3>
			<p id="empty-upcoming-description" className="text-gray-600 mb-6">
				Your upcoming reservations will appear here once you start booking
				services.
			</p>
			<a
				href="/salons"
				className="inline-block bg-[#ff5b5b] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#e04a4a] transition-colors focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:ring-offset-2"
				aria-label="Browse and book beauty services"
			>
				Book Your First Appointment
			</a>
		</div>
	);

	// Empty state for past appointments
	const PastEmptyState = () => (
		<div
			className="text-center py-8"
			role="status"
			aria-labelledby="empty-past-heading"
			aria-describedby="empty-past-description"
		>
			<div
				className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3"
				aria-hidden="true"
			>
				<span className="text-xl">📋</span>
			</div>
			<h4
				id="empty-past-heading"
				className="text-lg font-semibold text-gray-900 mb-2"
			>
				No past reservations
			</h4>
			<p id="empty-past-description" className="text-gray-600 text-sm">
				Your completed appointments will appear here.
			</p>
		</div>
	);

	// Success message
	const SuccessMessage = () => {
		if (!showSuccessMessage) return null;

		return (
			<div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
				{showSuccessMessage}
			</div>
		);
	};

	if (isLoading) {
		return (
			<main role="main" aria-labelledby="dashboard-heading">
				<header className="mb-8">
					<h1
						id="dashboard-heading"
						className="text-3xl font-bold text-gray-900"
					>
						Your Reservations
					</h1>
					<p className="text-gray-600 mt-2">
						Manage your beauty appointments and bookings
					</p>
				</header>
				<LoadingSkeleton />
			</main>
		);
	}

	if (hasError) {
		return (
			<main role="main" aria-labelledby="dashboard-heading">
				<header className="mb-8">
					<h1
						id="dashboard-heading"
						className="text-3xl font-bold text-gray-900"
					>
						Your Reservations
					</h1>
					<p className="text-gray-600 mt-2">
						Manage your beauty appointments and bookings
					</p>
				</header>
				<ErrorDisplay />
			</main>
		);
	}

	return (
		<main role="main" aria-labelledby="dashboard-heading">
			<SuccessMessage />

			<header className="mb-8">
				<h1 id="dashboard-heading" className="text-3xl font-bold text-gray-900">
					Your Reservations
				</h1>
				<p className="text-gray-600 mt-2">
					Manage your beauty appointments and bookings
				</p>
			</header>

			<div className="space-y-12">
				{/* Upcoming Reservations Section */}
				<section aria-labelledby="upcoming-section-heading">
					{upcomingBookingsList.length === 0 ? (
						<UpcomingEmptyState />
					) : (
						<div
							className="space-y-4"
							role="list"
							aria-label="Upcoming reservations list"
							aria-live="polite"
						>
							{upcomingBookingsList.map((booking, index) => (
								<div
									key={booking.id}
									role="listitem"
									aria-posinset={index + 1}
									aria-setsize={upcomingBookingsList.length}
								>
									<VisitHistoryCard
										visit={{
											id: booking.id,
											salonName: booking.salon.name,
											serviceName: booking.service.name,
											date: booking.time, // Pass raw time for proper formatting
											image:
												booking.salon.logo || booking.salon.photos[0] || '',
											time: booking.time,
											status: booking.status,
											salonId: booking.salon.id,
											serviceId: booking.service.id,
											staffName: booking.staff?.name,
										}}
										onCancel={handleCancel}
										isUpcoming={true}
									/>
								</div>
							))}
						</div>
					)}
				</section>

				{/* Past Reservations Section */}
				<section aria-labelledby="past-section-heading">
					<h2
						id="past-section-heading"
						className="text-2xl font-semibold text-gray-900 mb-6"
					>
						Your Past Reservations
					</h2>

					{completedBookingsList.length === 0 ? (
						<PastEmptyState />
					) : (
						<div
							className="space-y-4"
							role="list"
							aria-label="Past reservations list"
							aria-live="polite"
						>
							{completedBookingsList.map((booking, index) => (
								<div
									key={booking.id}
									role="listitem"
									aria-posinset={index + 1}
									aria-setsize={completedBookingsList.length}
								>
									<VisitHistoryCard
										visit={{
											id: booking.id,
											salonName: booking.salon.name,
											serviceName: booking.service.name,
											date: booking.time, // Pass raw time for proper formatting
											image:
												booking.salon.logo || booking.salon.photos[0] || '',
											time: booking.time,
											status: 'COMPLETED',
											salonId: booking.salon.id,
											serviceId: booking.service.id,
											staffName: booking.staff?.name,
										}}
										onBookAgain={handleBookAgain}
										onLeaveReview={handleLeaveReview}
										isUpcoming={false}
									/>
								</div>
							))}
						</div>
					)}
				</section>
			</div>
		</main>
	);
}
