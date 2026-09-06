'use client';

import Link from 'next/link';
import { useMemo } from 'react';
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
import { useTranslation } from '@/contexts/LanguageContext';
import { useState } from 'react';

export default function OwnerDashboardPage() {
  const t = useTranslation();
  const pathname = usePathname();
  const locale = (extractLocaleFromPath(pathname) ?? 'en') as Locale;
  const { studio, isLoading: studioLoading } = useOwnerStudio();
  const [publishing, setPublishing] = useState(false);
  const [publishMsg, setPublishMsg] = useState<string | null>(null);

  const todayBounds = useMemo(() => dayBoundsIso(new Date()), []);

  const sessionsQuery = useQuery({
    queryKey: ['owner-sessions-today', todayBounds.from],
    queryFn: () => fetchOwnerSessions(todayBounds),
    enabled: Boolean(studio?.id),
  });

  const checklistQuery = useQuery({
    queryKey: ['owner-checklist', studio?.id],
    queryFn: fetchOnboardingChecklist,
    enabled: Boolean(studio?.id),
  });

  const sessions = sessionsQuery.data ?? [];
  const checklist = checklistQuery.data;
  const enrolledToday = sessions.reduce(
    (sum, s) => sum + (s.enrolledCount || 0),
    0,
  );

  const onPublish = async () => {
    if (!studio?.id || !checklist?.canPublish) return;
    setPublishing(true);
    setPublishMsg(null);
    try {
      await publishStudio(studio.id);
      setPublishMsg('Studio published');
      await checklistQuery.refetch();
    } catch (err) {
      setPublishMsg(err instanceof Error ? err.message : 'Failed to publish');
    } finally {
      setPublishing(false);
    }
  };

  if (studioLoading) {
    return (
      <p className="text-sm text-gray-500">
        {t('owner.dashboard.loadingDashboard') || 'Loading dashboard...'}
      </p>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold text-gray-900">
          {studio?.name || 'Studio'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {t('owner.dashboard.businessOverview') ||
            "Here's your business overview"}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide">
            Today&apos;s sessions
          </div>
          <div className="text-2xl font-semibold mt-1">{sessions.length}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide">
            Enrolled today
          </div>
          <div className="text-2xl font-semibold mt-1">{enrolledToday}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 col-span-2 md:col-span-1">
          <div className="text-xs text-gray-500 uppercase tracking-wide">
            Status
          </div>
          <div className="text-2xl font-semibold mt-1 capitalize">
            {(studio?.status || 'draft').toLowerCase()}
          </div>
        </div>
      </div>

      {checklist && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-gray-900">Setup checklist</h2>
              <p className="text-sm text-gray-500 mt-1">
                {checklist.requiredCompleted
                  ? 'Required steps done'
                  : `Missing: ${checklist.missingRequiredSteps.join(', ') || '—'}`}
              </p>
            </div>
            {checklist.canPublish && studio?.status !== 'ACTIVE' && (
              <button
                onClick={onPublish}
                disabled={publishing}
                className="shrink-0 rounded-lg bg-[#ea4b4b] text-white text-sm font-medium px-3 py-2 disabled:opacity-60"
              >
                {publishing ? 'Publishing…' : 'Publish'}
              </button>
            )}
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            <li className="flex justify-between">
              <span>Studio details</span>
              <span>
                {checklist.steps.hasStudioDetails.completed ? '✓' : '—'}
              </span>
            </li>
            <li className="flex justify-between">
              <span>Training</span>
              <span>{checklist.steps.hasTraining.completed ? '✓' : '—'}</span>
            </li>
            <li className="flex justify-between">
              <span>Photo</span>
              <span>{checklist.steps.hasPhoto.completed ? '✓' : '—'}</span>
            </li>
          </ul>
          {publishMsg && (
            <p className="text-sm mt-3 text-gray-600">{publishMsg}</p>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Today&apos;s sessions</h2>
          <Link
            href={withLocale('/trainings/new', locale)}
            className="text-sm font-medium text-[#ea4b4b] hover:underline"
          >
            Create training
          </Link>
        </div>
        {sessionsQuery.isLoading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : sessionsQuery.isError ? (
          <p className="text-sm text-red-600">Failed to load sessions</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-gray-500">No sessions today</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {sessions.map((s) => (
              <li key={s.sessionId}>
                <Link
                  href={withLocale(`/calendar/session/${s.sessionId}`, locale)}
                  className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-2 px-2 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-gray-900">
                      {s.training?.name || 'Training'}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {new Date(s.startsAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      · {s.enrolledCount}/{s.capacity} · {s.trainer?.name}
                    </div>
                  </div>
                  <span className="text-xs uppercase text-gray-400">
                    {s.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4">
          <Link
            href={withLocale('/calendar', locale)}
            className="text-sm text-gray-600 hover:text-[#ea4b4b]"
          >
            Open schedule →
          </Link>
        </div>
      </div>
    </div>
  );
}
