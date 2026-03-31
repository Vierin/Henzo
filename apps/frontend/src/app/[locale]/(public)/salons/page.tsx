import type { Metadata } from 'next';
import { Suspense } from 'react';
import SalonsClient from '@/app/[locale]/(public)/salons/salonsClient';
import LoadingFallback from '@/components/LoadingFallback';
import { buildStaticPageMetadata, resolveLocale } from '@/seo';

export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale: raw } = await params;
	return buildStaticPageMetadata('salons', resolveLocale(raw));
}

export default function SalonsPage() {
	return (
		<Suspense fallback={<LoadingFallback fullScreen={true} />}>
			<SalonsClient />
		</Suspense>
	);
}
