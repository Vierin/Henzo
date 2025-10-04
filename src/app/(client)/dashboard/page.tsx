import React from 'react';
import { Metadata } from 'next';
import ClientDashboardClient from './ClientDashboardClient';

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
	return <ClientDashboardClient />;
}
