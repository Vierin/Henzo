import React from 'react';
import { Metadata } from 'next';
import OwnerDashboardClient from './OwnerDashboardClient';

// Private page - should not be indexed
export const metadata: Metadata = {
	title: 'Owner Dashboard - Henzo',
	description: 'Manage your salon appointments and bookings',
	robots: {
		index: false,
		follow: false,
		noarchive: true,
		nosnippet: true,
	},
};

export default function OwnerDashboard() {
	return <OwnerDashboardClient />;
}
