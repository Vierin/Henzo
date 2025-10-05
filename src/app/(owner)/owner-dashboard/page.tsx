import React from 'react';
import { Metadata } from 'next';
import OwnerDashboardClient from './OwnerDashboardClient';
import { OwnerRouteGuard } from '@/components/RouteGuard';

// Private page - should not be indexed
export const metadata: Metadata = {
	title: 'Owner Dashboard - Henzo',
	description: 'Manage your salon appointments and business operations',
	robots: {
		index: false,
		follow: false,
		noarchive: true,
		nosnippet: true,
	},
};

export default function OwnerDashboardPage() {
	return (
		<OwnerRouteGuard>
			<OwnerDashboardClient />
		</OwnerRouteGuard>
	);
}
