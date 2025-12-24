import { Suspense } from 'react';
import { seoConfig } from '@/constants/seoConfig';
import MapSearchClient from './MapSearchClient';
import LoadingFallback from '@/components/LoadingFallback';

export const metadata = {
	...seoConfig.map,
	robots: { index: true, follow: true },
};

export default function MapSearchPage() {
	return (
		<Suspense fallback={<LoadingFallback />}>
			<MapSearchClient />
		</Suspense>
	);
}
