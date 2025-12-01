import { Suspense } from 'react';
import { seoConfig } from '@/constants/seoConfig';
import MapSearchClient from './MapSearchClient';

export const metadata = {
	...seoConfig.map,
	robots: { index: true, follow: true },
};

export default function MapSearchPage() {
	return (
		<Suspense
			fallback={
				<div className="min-h-screen flex items-center justify-center bg-gray-50">
					<div className="text-center">
						<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff5b5b] mx-auto mb-4"></div>
						<p className="text-gray-600">Loading...</p>
					</div>
				</div>
			}
		>
			<MapSearchClient />
		</Suspense>
	);
}
