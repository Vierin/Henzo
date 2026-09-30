'use client';

import { useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { extractLocaleFromPath, withLocale, type Locale } from '@/i18n/routing';
import { useOwnerStudio } from '@/contexts/OwnerStudioContext';
import {
  dayBoundsIso,
  fetchOwnerSessions,
} from '@/lib/owner/fetch-owner-sessions';
import {
  fetchOnboardingChecklist,
  publishStudio,
} from '@/lib/owner/fetch-onboarding-checklist';
import { fetchOwnerAccountProfile } from '@/lib/owner/fetch-account';
import { fetchSessionEnrollments } from '@/lib/owner/fetch-session-detail';
import type { OwnerSessionEnrollment } from '@/lib/owner/types';
import { useTranslation } from '@/contexts/LanguageContext';
import { ownerTheme } from '@/lib/owner/owner-theme';
import { resolveStudioPublicSlug } from '@/utils/slug';
import { buildStudioBookingUrl } from '@/lib/owner/booking-link';
import { listStudioPhotoAssets } from '@/lib/owner/studio-photo-assets';
import { fetchPublicStudioBySlug } from '@/lib/client/fetch-studio-detail';
import { fetchTrainingCategoriesClient } from '@/lib/client/fetch-training-categories';
import {
  trainingCategoryLabel,
  type PublicTrainingCategory,
} from '@/lib/client/training-category';
import { OwnerOnboardingCard } from '@/components/owner/ownerOnboardingCard';
import {
  OwnerDashboardStatCards,
  OwnerFeaturedSessionCard,
} from '@/components/owner/ownerDashboardCards';
import {
  OwnerDashboardGreeting,
  OwnerDashboardNewClassButton,
  OwnerDashboardCopyBookingLinkButton,
  OwnerDashboardSchedulePanel,
  OwnerDashboardSidebar,
  OwnerDashboardStudioBanner,
  buildLastBookings,
} from '@/components/owner/ownerDesktopDashboard';

export default function OwnerDashboardPage() {
  const t = useTranslation();
  const pathname = usePathname();
  const locale = (extractLocaleFromPath(pathname) ?? 'en') as Locale;
  const { studio, isLoading: studioLoading, refresh } = useOwnerStudio();
  const [publishing, setPublishing] = useState(false);

  const profileQuery = useQuery({
    queryKey: ['owner-account-profile'],
    queryFn: fetchOwnerAccountProfile,
  });

  const firstName = useMemo(() => {
    const raw =
      profileQuery.data?.name?.trim() ||
      profileQuery.data?.email?.split('@')[0] ||
      'there';
    return raw.split(/\s+/)[0] || 'there';
  }, [profileQuery.data]);

  const todayBounds = useMemo(() => dayBoundsIso(new Date()), []);
  const recentBounds = useMemo(() => {
    const to = new Date();
    to.setHours(23, 59, 59, 999);
    const from = new Date();
    from.setDate(from.getDate() - 14);
    from.setHours(0, 0, 0, 0);
    return { from: from.toISOString(), to: to.toISOString() };
  }, []);
  const upcomingBounds = useMemo(() => {
    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + 14);
    to.setHours(23, 59, 59, 999);
    return { from: from.toISOString(), to: to.toISOString() };
  }, []);

  const todayQuery = useQuery({
    queryKey: ['owner-sessions-today', todayBounds.from],
    queryFn: () => fetchOwnerSessions(todayBounds),
    enabled: Boolean(studio?.id),
  });

  const recentQuery = useQuery({
    queryKey: ['owner-sessions-recent', recentBounds.from],
    queryFn: () => fetchOwnerSessions(recentBounds),
    enabled: Boolean(studio?.id),
  });

  const upcomingQuery = useQuery({
    queryKey: ['owner-sessions-upcoming', upcomingBounds.from],
    queryFn: () => fetchOwnerSessions(upcomingBounds),
    enabled: Boolean(studio?.id),
  });

  const checklistQuery = useQuery({
    queryKey: ['owner-checklist', studio?.id],
    queryFn: fetchOnboardingChecklist,
    enabled: Boolean(studio?.id),
  });

  const todaySessions = todayQuery.data ?? [];
  const recentSessions = recentQuery.data ?? [];
  const upcomingSessions = upcomingQuery.data ?? [];
  const checklist = checklistQuery.data;

  const bookingsToday = todaySessions.reduce(
    (sum, s) => sum + (s.enrolledCount || 0),
    0,
  );
  const waitlistToday = todaySessions.reduce(
    (sum, s) => sum + (s.waitlistCount || 0),
    0,
  );

  const featured = useMemo(() => {
    const now = Date.now();
    return (
      upcomingSessions.find((s) => new Date(s.endsAt).getTime() > now) ?? null
    );
  }, [upcomingSessions]);

  const sessionsForLastBookings = useMemo(() => {
    return [...recentSessions]
      .filter((s) => (s.enrolledCount || 0) > 0)
      .sort(
        (a, b) =>
          new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime(),
      )
      .slice(0, 5);
  }, [recentSessions]);

  const lastBookingsQuery = useQuery({
    queryKey: [
      'owner-last-bookings',
      sessionsForLastBookings.map((s) => s.sessionId).join(','),
    ],
    queryFn: async () => {
      const entries = await Promise.all(
        sessionsForLastBookings.map(async (s) => {
          const list = await fetchSessionEnrollments(s.sessionId);
          return [s.sessionId, list] as const;
        }),
      );
      const map: Record<string, OwnerSessionEnrollment[]> = {};
      for (const [id, list] of entries) map[id] = list;
      return map;
    },
    enabled: Boolean(studio?.id) && sessionsForLastBookings.length > 0,
  });

  const lastBookings = useMemo(
    () =>
      buildLastBookings(
        sessionsForLastBookings,
        lastBookingsQuery.data ?? {},
        4,
      ),
    [sessionsForLastBookings, lastBookingsQuery.data],
  );

  const studioDetailsCompleted =
    Boolean(checklist?.steps.hasStudioDetails.completed) ||
    Boolean(studio?.name?.trim() && studio?.address?.trim());
  const hasTraining = Boolean(checklist?.steps.hasTraining.completed);
  const hasPhoto = Boolean(checklist?.steps.hasPhoto.completed);
  const stepsLeft = [studioDetailsCompleted, hasTraining, hasPhoto].filter(
    (x) => !x,
  ).length;

  const isActive = String(studio?.status || '').toUpperCase() === 'ACTIVE';
  const showOnboarding =
    !studio || (!isActive && (stepsLeft > 0 || Boolean(checklist?.canPublish)));

  const previewHref = studio
    ? withLocale(
        `/studio/${resolveStudioPublicSlug({
          id: studio.id,
          name: studio.name,
          slug: studio.slug,
        })}`,
        locale,
      )
    : null;

  const publicSlug = studio
    ? resolveStudioPublicSlug({
        id: studio.id,
        name: studio.name,
        slug: studio.slug,
      })
    : null;

  const publicStudioQuery = useQuery({
    queryKey: ['owner-public-studio-preview', publicSlug],
    queryFn: () => fetchPublicStudioBySlug(publicSlug!),
    enabled: Boolean(publicSlug),
    staleTime: 60_000,
  });

  const categoriesQuery = useQuery({
    queryKey: ['training-categories'],
    queryFn: fetchTrainingCategoriesClient,
    staleTime: 300_000,
  });

  const studioBannerPhoto = useMemo(() => {
    const assets = studio ? listStudioPhotoAssets(studio) : [];
    return (
      assets[0]?.cardUrl ||
      assets[0]?.heroUrl ||
      publicStudioQuery.data?.photos?.[0] ||
      publicStudioQuery.data?.photoUrl ||
      null
    );
  }, [studio, publicStudioQuery.data]);

  const studioBannerCategories = useMemo(() => {
    const publicStudio = publicStudioQuery.data;
    if (!publicStudio) return [];
    const byId = new Map<number, PublicTrainingCategory>(
      (categoriesQuery.data ?? []).map((c) => [c.id, c]),
    );
    const ids =
      publicStudio.categoryIds.length > 0
        ? publicStudio.categoryIds
        : publicStudio.categoryLabels.map((c) => c.id);

    return ids
      .map((id) => {
        const cat = byId.get(id);
        const fallback = publicStudio.categoryLabels.find((c) => c.id === id);
        const label = cat
          ? trainingCategoryLabel(cat, locale)
          : locale === 'ru'
            ? (fallback?.nameRu || fallback?.nameEn || '').trim()
            : locale === 'vi'
              ? (fallback?.nameVn || fallback?.nameEn || '').trim()
              : (fallback?.nameEn || '').trim();
        if (!label) return null;
        return {
          id,
          label,
          chipBgHex: cat?.chipBgHex || fallback?.chipBgHex || ownerTheme.bgSoft,
          chipFgHex: cat?.chipFgHex || fallback?.chipFgHex || ownerTheme.text,
        };
      })
      .filter(
        (
          c,
        ): c is {
          id: number;
          label: string;
          chipBgHex: string;
          chipFgHex: string;
        } => Boolean(c),
      );
  }, [publicStudioQuery.data, categoriesQuery.data, locale]);

  const onPublish = async () => {
    if (!studio?.id || !checklist?.canPublish) return;
    setPublishing(true);
    try {
      await publishStudio(studio.id);
      await Promise.all([checklistQuery.refetch(), refresh()]);
    } catch {
      // keep UI
    } finally {
      setPublishing(false);
    }
  };

  const path = (p: string) => withLocale(p, locale);

  const bookingLink = useMemo(() => {
    if (!studio?.id) return undefined;
    const origin =
      typeof window !== 'undefined'
        ? window.location.origin
        : 'https://henzo.app';
    return buildStudioBookingUrl({
      studio: { id: studio.id, name: studio.name, slug: studio.slug },
      locale,
      origin,
    });
  }, [studio?.id, studio?.name, studio?.slug, locale]);

  if (studioLoading) {
    return (
      <p className="text-sm" style={{ color: ownerTheme.textSecondary }}>
        {t('owner.dashboard.loadingDashboard') || 'Loading dashboard...'}
      </p>
    );
  }

  return (
    <div className="space-y-5 lg:space-y-6">
      <OwnerDashboardGreeting locale={locale} firstName={firstName} />

      {showOnboarding ? (
        <OwnerOnboardingCard
          studioDetailsCompleted={studioDetailsCompleted}
          hasTraining={hasTraining}
          hasPhoto={hasPhoto}
          canPublish={Boolean(checklist?.canPublish)}
          isPublishing={publishing}
          detailsHref={path('/business/complete-setup')}
          trainingHref={
            studio ? path('/trainings/new') : path('/business/complete-setup')
          }
          photoHref={
            studio
              ? path('/salon-info/studio')
              : path('/business/complete-setup')
          }
          previewHref={previewHref}
          onPublish={() => void onPublish()}
        />
      ) : null}

      {featured ? (
        <div className="lg:hidden">
          <OwnerFeaturedSessionCard
            session={featured}
            href={path(`/calendar/session/${featured.sessionId}`)}
          />
        </div>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-3 lg:space-y-4">
          <OwnerDashboardStatCards
            classesToday={todaySessions.length}
            bookingsToday={bookingsToday}
            waitlistToday={waitlistToday}
          />
          <OwnerDashboardSchedulePanel
            sessions={todaySessions}
            localePath={path}
            bookingLink={bookingLink}
          />
          {!showOnboarding && previewHref && studio ? (
            <OwnerDashboardStudioBanner
              href={previewHref}
              name={studio.name}
              address={
                publicStudioQuery.data?.address || studio.address || null
              }
              photoUrl={studioBannerPhoto}
              rating={publicStudioQuery.data?.avgRating}
              reviewCount={publicStudioQuery.data?.reviewCount}
              categories={studioBannerCategories}
            />
          ) : null}
        </div>

        <div className="space-y-3">
          <div className="flex gap-2 lg:flex-col">
            <OwnerDashboardNewClassButton href={path('/trainings/new')} />
            {bookingLink ? (
              <OwnerDashboardCopyBookingLinkButton bookingLink={bookingLink} />
            ) : null}
          </div>
          <OwnerDashboardSidebar
            localePath={path}
            lastBookings={lastBookings}
            featuredSession={featured}
          />
        </div>
      </div>
    </div>
  );
}
