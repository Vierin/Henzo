import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { StudioPublicView } from '@/components/studios/studioPublicView';
import { StudioShareLanding } from './studioShareLanding';
import {
  fetchPublicStudioBySlug,
  fetchPublicStudioSchedule,
} from '@/lib/client/fetch-studio-detail';
import { fetchTrainingCategories } from '@/lib/client/fetch-training-categories';
import { isLocale } from '@/i18n/routing';
import { buildDynamicPageMetadata, resolveLocale } from '@/seo';
import type { Locale } from '@/i18n/routing';
import { isBareStudioId, resolveStudioPublicSlug } from '@/utils/slug';

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
  const canonicalSlug = resolveStudioPublicSlug({
    id: studio.id,
    name: studio.name,
    slug: studio.slug,
  });
  return buildDynamicPageMetadata(locale, {
    pathAfterLocale: `/studio/${canonicalSlug}`,
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

  const canonicalSlug = resolveStudioPublicSlug({
    id: studio.id,
    name: studio.name,
    slug: studio.slug,
  });

  // Bare cuid/uuid → SEO `{name}-{id}` (or stored DB slug)
  if (isBareStudioId(slug) && canonicalSlug !== slug) {
    redirect(`/${locale}/studio/${canonicalSlug}`);
  }

  const [sessions, categories] = await Promise.all([
    fetchPublicStudioSchedule(studio.id),
    fetchTrainingCategories(),
  ]);

  return (
    <StudioPublicView
      studio={studio}
      initialSessions={sessions}
      locale={locale}
      trainingCategories={categories}
    />
  );
}
