import React from 'react';
import { Metadata } from 'next';
import ClientDashboardClient from './ClientDashboardClient';
import { ClientRouteGuard } from '@/components/RouteGuard';

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

export default function ClientDashboard() {
	return (
		<ClientRouteGuard>
			<ClientDashboardClient />
		</ClientRouteGuard>
	);
}
