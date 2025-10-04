'use client';

import { useUpcomingBookings } from '@/hooks/useClient';
import VisitHistoryCard from '@/components/VisitHistoryCard';
import { formatDateTimeSafe } from '@/utils/date';
import { useCallback, useMemo } from 'react';

export default function ClientDashboardClient() {
	const { data: upcomingBookings, isLoading, error } = useUpcomingBookings();

	const handleBookAgain = useCallback((booking: any) => {
		// Navigate to booking page or open booking modal
		console.log('Book again:', booking);
	}, []);

	const upcomingBookingsList = useMemo(
		() => upcomingBookings || [],
		[upcomingBookings]
	);

	// Loading skeleton component
	const LoadingSkeleton = () => (
		<div className="space-y-4" role="status" aria-label="Loading appointments">
			{[1, 2, 3].map((i) => (
				<div
					key={i}
					className="bg-white rounded-xl p-6 shadow-sm animate-pulse"
					aria-hidden="true"
				>
					<div className="flex items-center space-x-4">
						<div className="w-16 h-16 bg-gray-200 rounded-lg"></div>
						<div className="flex-1 space-y-2">
							<div className="h-4 bg-gray-200 rounded w-3/4"></div>
							<div className="h-3 bg-gray-200 rounded w-1/2"></div>
							<div className="h-3 bg-gray-200 rounded w-1/4"></div>
						</div>
					</div>
				</div>
			))}
			<span className="sr-only">Loading your appointments...</span>
		</div>
	);

	// Error component with better accessibility
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
				There was an error loading your upcoming appointments. Please try again
				later.
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

	// Empty state component
	const EmptyState = () => (
		<div
			className="text-center py-12"
			role="status"
			aria-labelledby="empty-heading"
			aria-describedby="empty-description"
		>
			<div
				className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4"
				aria-hidden="true"
			>
				<span className="text-2xl">📅</span>
			</div>
			<h3
				id="empty-heading"
				className="text-xl font-semibold text-gray-900 mb-2"
			>
				No upcoming appointments
			</h3>
			<p id="empty-description" className="text-gray-600 mb-6">
				Your upcoming appointments will appear here once you start booking
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

	if (isLoading) {
		return (
			<main role="main" aria-labelledby="dashboard-heading">
				<header className="mb-8">
					<h1
						id="dashboard-heading"
						className="text-3xl font-bold text-gray-900"
					>
						Upcoming Appointments
					</h1>
					<p className="text-gray-600 mt-2">
						Manage your beauty appointments and bookings
					</p>
				</header>
				<LoadingSkeleton />
			</main>
		);
	}

	if (error) {
		return (
			<main role="main" aria-labelledby="dashboard-heading">
				<header className="mb-8">
					<h1
						id="dashboard-heading"
						className="text-3xl font-bold text-gray-900"
					>
						Upcoming Appointments
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
			<header className="mb-8">
				<h1 id="dashboard-heading" className="text-3xl font-bold text-gray-900">
					Upcoming Appointments
				</h1>
				<p className="text-gray-600 mt-2">
					Manage your beauty appointments and bookings
				</p>
			</header>

			<section aria-labelledby="appointments-section-heading">
				{upcomingBookingsList.length === 0 ? (
					<EmptyState />
				) : (
					<div
						className="space-y-4"
						role="list"
						aria-label="Upcoming appointments list"
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
										date: formatDateTimeSafe(booking.time),
										image: booking.salon.logo || '',
									}}
									onBookAgain={handleBookAgain}
								/>
							</div>
						))}
					</div>
				)}
			</section>
		</main>
	);
}
