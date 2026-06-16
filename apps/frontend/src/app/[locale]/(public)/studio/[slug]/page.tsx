import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale } from '@/i18n/routing';
import { buildDynamicPageMetadata, resolveLocale } from '@/seo';
import { StudioShareLanding } from './studioShareLanding';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: raw, slug } = await params;
  const locale = resolveLocale(raw);
  return buildDynamicPageMetadata(locale, {
    pathAfterLocale: `/studio/${slug}`,
    title: 'Henzo',
    description: 'Open Henzo to view the studio schedule and book a class.',
  });
}

export default async function StudioSharePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) notFound();
  if (!slug?.trim()) notFound();

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white">
          <p className="text-sm text-gray-400">Loading…</p>
        </div>
      }
    >
      <StudioShareLanding />
    </Suspense>
  );
}
