import React from 'react';
import { Metadata } from 'next';
import ClientReviewsClient from './ClientReviewsClient';
import { ClientRouteGuard } from '@/components/RouteGuard';

// Private page - should not be indexed
export const metadata: Metadata = {
	title: 'Your Reviews - Henzo',
	description: 'View and manage your beauty service reviews',
	robots: {
		index: false,
		follow: false,
		noarchive: true,
		nosnippet: true,
	},
};

export default function ClientReviews() {
	return (
		<ClientRouteGuard>
			<ClientReviewsClient />
		</ClientRouteGuard>
	);
}
