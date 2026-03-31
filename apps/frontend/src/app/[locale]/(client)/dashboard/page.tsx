import React, { Suspense } from 'react';
import { Metadata } from 'next';
import ClientDashboardClient from './ClientDashboardClient';
import { ClientRouteGuard } from '@/components/RouteGuard';
import LoadingSpinner from '@/components/LoadingSpinner';

// Private page - should not be indexed
export const metadata: Metadata = {
	title: 'Dashboard - Henzo',
	description: 'Manage your beauty appointments and bookings',
	robots: {
		index: false,
		follow: false,
		noarchive: true,
		nosnippet: true,
	},
};

// P2: Suspense для постепенной загрузки
export default function ClientDashboard() {
	return (
		<ClientRouteGuard>
			<Suspense
				fallback={
					<div className="flex items-center justify-center min-h-screen bg-[#fff7f6]">
						<LoadingSpinner size="lg" message="Loading dashboard..." />
					</div>
				}
			>
				<ClientDashboardClient />
			</Suspense>
		</ClientRouteGuard>
	);
}
