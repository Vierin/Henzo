import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { serverApiGet } from '@/lib/api-server';
import { isLocale, type Locale } from '@/i18n/routing';
import { buildDynamicPageMetadata, resolveLocale } from '@/seo';
import StudioPublicClient from './StudioPublicClient';
import type { PublicStudioPayload } from './types';

export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
	const { locale: raw, slug } = await params;
	const locale = resolveLocale(raw);
	const data = await serverApiGet<PublicStudioPayload>(
		`/studios/public/by-slug/${encodeURIComponent(slug)}`,
		{ revalidate: 120 }
	);
	if (!data) {
		return { title: 'Studio' };
	}
	const title = data.name || 'Studio';
	const desc =
		(data.descriptionEn || data.description || '').trim().slice(0, 160) ||
		`${title} · Henzo`;
	const og = data.photos?.[0];
	return buildDynamicPageMetadata(locale, {
		pathAfterLocale: `/studio/${slug}`,
		title,
		description: desc,
		...(og ? { images: [og] } : {}),
	});
}

export default async function StudioPublicPage({
	params,
}: {
	params: Promise<{ locale: string; slug: string }>;
}) {
	const { locale: raw, slug } = await params;
	if (!isLocale(raw)) notFound();
	const locale = raw as Locale;

	const studio = await serverApiGet<PublicStudioPayload>(
		`/studios/public/by-slug/${encodeURIComponent(slug)}`,
		{ revalidate: 120 }
	);

	if (!studio) notFound();

	return <StudioPublicClient locale={locale} studio={studio} />;
}
