import React, { Suspense } from 'react';
import { Metadata } from 'next';
import CalendarClient from './CalendarClient';
import LoadingSpinner from '@/components/LoadingSpinner';

// Private page - should not be indexed
export const metadata: Metadata = {
	title: 'Calendar - Henzo Business',
	description: 'View and manage your salon appointments calendar',
	robots: {
		index: false,
		follow: false,
		noarchive: true,
		nosnippet: true,
	},
};

// P3: Suspense для постепенной загрузки
export default function CalendarPage() {
	return (
		<Suspense
			fallback={
				<div className="flex items-center justify-center min-h-screen bg-[#fff7f6]">
					<LoadingSpinner size="lg" message="Loading calendar..." />
				</div>
			}
		>
			<CalendarClient />
		</Suspense>
	);
}
