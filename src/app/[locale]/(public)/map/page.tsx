import { seoConfig } from '@/constants/seoConfig';
import MapSearchClient from './MapSearchClient';

export const metadata = {
	...seoConfig.map,
	robots: { index: true, follow: true },
};

export default function MapSearchPage() {
	return <MapSearchClient />;
}
