import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { StudioPublicView } from '@/components/studios/studioPublicView';
import { StudioShareLanding } from './studioShareLanding';
import {
  fetchPublicStudioBySlug,
  fetchPublicStudioSchedule,
} from '@/lib/client/fetch-studio-detail';
import { isLocale } from '@/i18n/routing';
import { buildDynamicPageMetadata, resolveLocale } from '@/seo';
import type { Locale } from '@/i18n/routing';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: raw, slug } = await params;
  const locale = resolveLocale(raw);
  const studio = await fetchPublicStudioBySlug(slug);
  if (!studio) {
    return buildDynamicPageMetadata(locale, {
      pathAfterLocale: `/studio/${slug}`,
      title: 'Henzo',
      description: 'Open Henzo to view the studio schedule and book a class.',
    });
  }
  return buildDynamicPageMetadata(locale, {
    pathAfterLocale: `/studio/${slug}`,
    title: `${studio.name} — Henzo`,
    description:
      studio.description?.slice(0, 155) ||
      `View ${studio.name} schedule and book classes in the Henzo app.`,
  });
}

export default async function StudioPublicPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw) || !slug?.trim()) notFound();
  const locale = resolveLocale(raw) as Locale;
  const sp = await searchParams;
  const openApp =
    sp.openApp === '1' ||
    sp.openApp === 'true' ||
    (typeof sp.openApp === 'string' && sp.openApp === '1');

  if (openApp) {
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

  const studio = await fetchPublicStudioBySlug(slug);
  if (!studio) notFound();

  const sessions = await fetchPublicStudioSchedule(studio.id);

  return (
    <StudioPublicView
      studio={studio}
      initialSessions={sessions}
      locale={locale}
    />
  );
}
