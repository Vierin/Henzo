'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { OwnerChecklistCard } from '@/components/owner/dashboard/ownerChecklistCard';
import { OwnerStatsCards } from '@/components/owner/dashboard/ownerStatsCards';
import { OwnerTodayClasses } from '@/components/owner/dashboard/ownerTodayClasses';
import { OwnerDashboardSidebar } from '@/components/owner/dashboard/ownerDashboardSidebar';
import { SessionDetailDrawer } from '@/components/owner/sessionDetailDrawer';
import {
  fetchCurrentStudio,
  fetchOnboardingChecklist,
  fetchOwnerStudioClients,
  fetchOwnerTrainingSessions,
  publishStudio,
} from '@/lib/owner/api';
import type { OwnerTrainingSession, Studio } from '@/lib/owner/types';
import type { StudioOnboardingChecklist } from '@/lib/owner/types';
import {
  endOfDay,
  isSameDay,
  startOfDay,
  toIsoUtc,
} from '@/lib/owner/session-utils';

export default function OwnerDashboardPage() {
  const params = useParams();
  const locale = (params?.locale as string) ?? 'en';
  const [studio, setStudio] = useState<Studio | null>(null);
  const [checklist, setChecklist] = useState<StudioOnboardingChecklist | null>(
    null,
  );
  const [sessions, setSessions] = useState<OwnerTrainingSession[]>([]);
  const [clientsCount, setClientsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [selectedSession, setSelectedSession] =
    useState<OwnerTrainingSession | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const now = new Date();
      const from = toIsoUtc(startOfDay(now));
      const to = toIsoUtc(endOfDay(new Date(now.getTime() + 7 * 86400000)));

      const [studioRes, checklistRes, sessionsRes, clientsRes] =
        await Promise.all([
          fetchCurrentStudio(),
          fetchOnboardingChecklist(),
          fetchOwnerTrainingSessions(from, to),
          fetchOwnerStudioClients(),
        ]);

      setStudio(studioRes);
      setChecklist(checklistRes);
      setSessions(sessionsRes);
      setClientsCount(clientsRes.length);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const todaySessions = useMemo(
    () => sessions.filter((s) => isSameDay(new Date(s.startsAt), new Date())),
    [sessions],
  );

  const bookingsToday = useMemo(
    () => todaySessions.reduce((sum, s) => sum + s.enrolledCount, 0),
    [todaySessions],
  );

  const onPublish = async () => {
    if (!studio?.id) return;
    setPublishing(true);
    try {
      await publishStudio(studio.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to publish');
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading dashboard…</p>;
  }

  return (
    <>
      <div className="flex flex-col gap-6 xl:flex-row xl:gap-8">
        <div className="min-w-0 flex-1">
          <header className="mb-6">
            <h1 className="text-2xl font-semibold text-[#3F3F3F] md:text-3xl">
              Hello, {studio?.name ?? 'your studio'} 👋
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Here&apos;s what&apos;s happening in your studio today.
            </p>
          </header>

          {error ? (
            <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </p>
          ) : null}

          <OwnerChecklistCard
            checklist={checklist}
            locale={locale}
            onPublish={() => void onPublish()}
            publishing={publishing}
            studioStatus={studio?.status ?? 'DRAFT'}
          />

          <OwnerStatsCards
            classesToday={todaySessions.length}
            bookingsToday={bookingsToday}
            walkInsToday={0}
            clientsTotal={clientsCount}
            locale={locale}
          />

          <OwnerTodayClasses
            sessions={todaySessions}
            locale={locale}
            onSelect={setSelectedSession}
          />

          <div className="mt-8 rounded-2xl bg-gradient-to-r from-[#EDE9F6] to-[#FAD0C5] p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-[#3F3287]">
                  Keep growing your studio
                </p>
                <p className="mt-1 text-sm text-zinc-600">
                  Add classes, invite clients, and track your schedule.
                </p>
              </div>
              <Link
                href={`/${locale}/owner/analytics`}
                className="rounded-full bg-[#3F3287] px-5 py-2 text-sm font-medium text-white"
              >
                View reports
              </Link>
            </div>
          </div>
        </div>

        <div className="w-full shrink-0 xl:w-[280px]">
          <OwnerDashboardSidebar
            studio={studio}
            sessions={sessions}
            locale={locale}
          />
        </div>
      </div>

      <SessionDetailDrawer
        session={selectedSession}
        open={selectedSession != null}
        onClose={() => setSelectedSession(null)}
        locale={locale}
        onUpdated={() => void load()}
      />
    </>
  );
}
