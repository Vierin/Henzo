import { Metadata } from 'next';
import { Suspense } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import SalonInfoClient from './SalonInfoClient';

// Private page - should not be indexed
export const metadata: Metadata = {
	title: 'Salon Information - Henzo',
	description: 'Manage your salon information and settings',
	robots: {
		index: false,
		follow: false,
		noarchive: true,
		nosnippet: true,
	},
};

export default function SalonInfoPage() {
	return (
		<Suspense
			fallback={
				<div className="flex items-center justify-center min-h-[400px]">
					<LoadingSpinner message="Loading salon information..." />
				</div>
			}
		>
			<SalonInfoClient />
		</Suspense>
	);
}
