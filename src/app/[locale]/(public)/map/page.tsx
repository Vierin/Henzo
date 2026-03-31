import { Suspense } from 'react';
import type { Metadata } from 'next';
import { buildStaticPageMetadata, resolveLocale } from '@/seo';
import MapSearchClient from './MapSearchClient';
import LoadingFallback from '@/components/LoadingFallback';

export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale: raw } = await params;
	return buildStaticPageMetadata('map', resolveLocale(raw), {
		robots: { index: true, follow: true },
	});
}

export default function MapSearchPage() {
	return (
		<Suspense fallback={<LoadingFallback />}>
			<MapSearchClient />
		</Suspense>
	);
}
