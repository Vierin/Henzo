import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { StudioPublicScheduleView } from '@/components/studios/studioPublicScheduleView';
import {
  fetchPublicStudioBySlug,
  fetchPublicStudioSchedule,
} from '@/lib/client/fetch-studio-detail';
import { isLocale } from '@/i18n/routing';
import { buildDynamicPageMetadata, resolveLocale } from '@/seo';
import type { Locale } from '@/i18n/routing';
import { isBareStudioId, resolveStudioPublicSlug } from '@/utils/slug';
import { addDays, startOfToday } from '@/lib/owner/schedule-dates';

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
      pathAfterLocale: `/studio/${slug}/schedule`,
      title: 'Schedule — Henzo',
      description: 'View studio schedule and book a class.',
    });
  }
  const canonicalSlug = resolveStudioPublicSlug({
    id: studio.id,
    name: studio.name,
    slug: studio.slug,
  });
  return buildDynamicPageMetadata(locale, {
    pathAfterLocale: `/studio/${canonicalSlug}/schedule`,
    title: `${studio.name} schedule — Henzo`,
    description: `Browse ${studio.name} classes and book in the Henzo app.`,
  });
}

export default async function StudioPublicSchedulePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw) || !slug?.trim()) notFound();
  const locale = resolveLocale(raw) as Locale;

  const studio = await fetchPublicStudioBySlug(slug);
  if (!studio) notFound();

  const canonicalSlug = resolveStudioPublicSlug({
    id: studio.id,
    name: studio.name,
    slug: studio.slug,
  });

  if (isBareStudioId(slug) && canonicalSlug !== slug) {
    redirect(`/${locale}/studio/${canonicalSlug}/schedule`);
  }

  const today = startOfToday();
  const to = addDays(today, Math.max(0, studio.bookingPeriodDays - 1));
  to.setHours(23, 59, 59, 999);

  const sessions = await fetchPublicStudioSchedule(studio.id, {
    from: today,
    to,
    limit: 500,
  });

  return (
    <StudioPublicScheduleView
      studio={studio}
      initialSessions={sessions}
      locale={locale}
      studioSlug={canonicalSlug}
    />
  );
}
