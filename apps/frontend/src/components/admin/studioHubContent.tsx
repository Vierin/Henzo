'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  ActivityTierBadge,
  formatLastActive,
} from '@/components/admin/activityTierBadge';
import { AdminModal } from '@/components/admin/adminModal';
import {
  AdminTimeInput,
  normalizeAdminHm,
} from '@/components/admin/adminTimeInput';
import { WeekdayPills } from '@/components/admin/weekdayPills';
import { AdminTable } from '@/components/admin/admin-table';
import {
  activateFounderProgram,
  createAdminRecurringSessions,
  confirmAdminStudioPendingEnrollment,
  createAdminStudioTrainer,
  createAdminStudioTraining,
  fetchAdminStudio,
  fetchAdminStudioActivity,
  fetchAdminStudioAnalytics,
  fetchAdminStudioPendingEnrollments,
  fetchAdminStudioClients,
  fetchAdminStudioPaymentEvents,
  fetchAdminStudioTrainers,
  fetchAdminStudioTrainings,
  fetchAdminStudioVisits,
  fetchTrainingCategories,
  patchAdminStudioProfile,
  patchAdminSubscription,
  publishAdminStudio,
  requestAdminStudioClaimLink,
  deleteAdminStudio,
  uploadAdminStudioPhoto,
  type TrainingCategoryOption,
} from '@/lib/admin/api';
import { compressImageForAdminUpload } from '@/lib/admin/compressImageForAdminUpload';
import {
  formatAdminDate,
  formatAdminDateTime24h,
} from '@/lib/admin/dateTimeFormat';
import type {
  AdminPaymentEventRow,
  AdminStudioClientRow,
  AdminStudioDetail,
  AdminTrainer,
  AdminTraining,
  AdminVisitRow,
  StudioAnalyticsData,
  StudioActivityResponse,
} from '@/lib/admin/types';

type Tab =
  | 'overview'
  | 'analytics'
  | 'clients'
  | 'visits'
  | 'edit'
  | 'subscription';

const tabs: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'clients', label: 'Clients' },
  { id: 'visits', label: 'Visits' },
  { id: 'edit', label: 'Setup / Edit' },
  { id: 'subscription', label: 'Subscription' },
];

function defaultPeriod() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return { from: from.toISOString(), to: to.toISOString() };
}

export function StudioHubContent({ studioId }: { studioId: string }) {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab');
  const validTabs: Tab[] = [
    'overview',
    'analytics',
    'clients',
    'visits',
    'edit',
    'subscription',
  ];
  const [tab, setTab] = useState<Tab>(
    validTabs.includes(initialTab as Tab) ? (initialTab as Tab) : 'overview',
  );
  const [studio, setStudio] = useState<AdminStudioDetail | null>(null);
  const [activity, setActivity] = useState<StudioActivityResponse | null>(null);
  const [analytics, setAnalytics] = useState<StudioAnalyticsData | null>(null);
  const [trainings, setTrainings] = useState<AdminTraining[]>([]);
  const [trainers, setTrainers] = useState<AdminTrainer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadStudio = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchAdminStudio(studioId);
      setStudio(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load studio');
    }
  }, [studioId]);

  const loadEditData = useCallback(async () => {
    try {
      const [t, tr] = await Promise.all([
        fetchAdminStudioTrainings(studioId),
        fetchAdminStudioTrainers(studioId),
      ]);
      setTrainings(t);
      setTrainers(tr);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load edit data');
    }
  }, [studioId]);

  const loadAnalytics = useCallback(async () => {
    const { from, to } = defaultPeriod();
    try {
      const res = await fetchAdminStudioAnalytics(studioId, from, to);
      setAnalytics(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load analytics');
    }
  }, [studioId]);

  const loadActivity = useCallback(async () => {
    try {
      const data = await fetchAdminStudioActivity(studioId);
      setActivity(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load activity');
    }
  }, [studioId]);

  useEffect(() => {
    void loadStudio();
  }, [loadStudio]);

  useEffect(() => {
    if (tab === 'overview') void loadActivity();
    if (tab === 'analytics') void loadAnalytics();
    if (tab === 'edit') void loadEditData();
  }, [tab, loadAnalytics, loadEditData, loadActivity]);

  if (error && !studio) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!studio) {
    return <p className="text-sm text-zinc-500">Loading studio…</p>;
  }

  const sub = studio.Subscription;

  return (
    <div>
      <Link
        href="/en/admin/studios"
        className="text-sm text-zinc-500 hover:text-zinc-800"
      >
        ← Studios
      </Link>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{studio.name}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {studio.isUnclaimed && studio.intendedOwnerEmail
              ? `Unclaimed → ${studio.intendedOwnerEmail}`
              : studio.User.email}{' '}
            · {studio.status}
            {studio._count.TrainingSession > 0
              ? ` · ${studio._count.TrainingSession} sessions`
              : ''}
          </p>
        </div>
        <ActivityTierBadge tier={studio.activityTier} />
      </div>

      <div className="mt-6 flex gap-1 border-b border-zinc-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium ${
              tab === t.id
                ? 'border-b-2 border-primary text-primary'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      {tab === 'overview' ? (
        <OverviewTab
          studio={studio}
          activity={activity}
          saving={saving}
          onGoToEdit={() => setTab('edit')}
          onCopyClaimLink={async () => {
            setSaving(true);
            setError(null);
            try {
              const res = await requestAdminStudioClaimLink(studioId, {
                sendEmail: false,
              });
              if (typeof navigator !== 'undefined' && navigator.clipboard) {
                await navigator.clipboard.writeText(res.manageUrl);
                toast.success('Claim link copied');
              } else {
                toast.success(`Claim link: ${res.manageUrl}`);
              }
            } catch (e) {
              const message =
                e instanceof Error ? e.message : 'Failed to generate link';
              setError(message);
              toast.error(message);
            } finally {
              setSaving(false);
            }
          }}
          onSendClaimEmail={async () => {
            setSaving(true);
            setError(null);
            try {
              await requestAdminStudioClaimLink(studioId, { sendEmail: true });
              toast.success('Claim email sent');
            } catch (e) {
              const message =
                e instanceof Error ? e.message : 'Failed to send claim email';
              setError(message);
              toast.error(message);
            } finally {
              setSaving(false);
            }
          }}
          onPublish={async () => {
            setSaving(true);
            setError(null);
            try {
              await publishAdminStudio(studioId);
              toast.success(
                'Studio published (ACTIVE) - clients can find and book',
              );
              await loadStudio();
            } catch (e) {
              const message = e instanceof Error ? e.message : 'Publish failed';
              setError(message);
              toast.error(message);
            } finally {
              setSaving(false);
            }
          }}
        />
      ) : null}

      {tab === 'analytics' ? <AnalyticsTab analytics={analytics} /> : null}

      {tab === 'clients' ? <ClientsTab studioId={studioId} /> : null}

      {tab === 'visits' ? <VisitsTab studioId={studioId} /> : null}

      {tab === 'edit' ? (
        <EditTab
          studio={studio}
          trainings={trainings}
          trainers={trainers}
          saving={saving}
          onSaveProfile={async (fields) => {
            setSaving(true);
            setError(null);
            try {
              await patchAdminStudioProfile(studioId, fields);
              toast.success('Profile saved');
              await loadStudio();
            } catch (e) {
              const message = e instanceof Error ? e.message : 'Save failed';
              setError(message);
              toast.error(message);
              throw e;
            } finally {
              setSaving(false);
            }
          }}
          onUploadPhoto={async (file) => {
            setSaving(true);
            setError(null);
            try {
              const compressed = await compressImageForAdminUpload(file);
              const res = await uploadAdminStudioPhoto(studioId, {
                base64: compressed.base64,
                contentType: compressed.contentType,
                fileName: compressed.fileName,
              });
              toast.success('Photo uploaded');
              await loadStudio();
              return res.photos ?? [];
            } catch (e) {
              const message = e instanceof Error ? e.message : 'Upload failed';
              setError(message);
              toast.error(message);
              throw e;
            } finally {
              setSaving(false);
            }
          }}
          onCreateTraining={async (payload) => {
            setSaving(true);
            setError(null);
            try {
              const created = await createAdminStudioTraining(studioId, {
                ...payload.training,
                studioId,
              });
              const trainingId = (created as { id?: string })?.id;
              if (!trainingId) {
                throw new Error('Training created but id missing');
              }
              await createAdminRecurringSessions(studioId, {
                studioId,
                trainingId,
                ...payload.sessions,
              });
              toast.success('Training and sessions created');
              await loadEditData();
              await loadStudio();
            } catch (e) {
              const message = e instanceof Error ? e.message : 'Create failed';
              setError(message);
              toast.error(message);
              throw e;
            } finally {
              setSaving(false);
            }
          }}
          onCreateTrainer={async (body) => {
            setSaving(true);
            setError(null);
            try {
              await createAdminStudioTrainer(studioId, body);
              toast.success('Trainer created');
              await loadEditData();
              await loadStudio();
            } catch (e) {
              const message = e instanceof Error ? e.message : 'Create failed';
              setError(message);
              toast.error(message);
              throw e;
            } finally {
              setSaving(false);
            }
          }}
          onCreateSessions={async (body) => {
            setSaving(true);
            setError(null);
            try {
              await createAdminRecurringSessions(studioId, body);
              toast.success('Sessions created');
              await loadStudio();
            } catch (e) {
              const message = e instanceof Error ? e.message : 'Create failed';
              setError(message);
              toast.error(message);
              throw e;
            } finally {
              setSaving(false);
            }
          }}
          onDeleteStudio={async () => {
            setSaving(true);
            try {
              await deleteAdminStudio(studioId);
              toast.success('Studio deleted');
              window.location.href = '/en/admin/studios';
            } catch (e) {
              const message = e instanceof Error ? e.message : 'Delete failed';
              toast.error(message);
            } finally {
              setSaving(false);
            }
          }}
        />
      ) : null}

      {tab === 'subscription' && sub ? (
        <SubscriptionTab
          subscription={sub}
          saving={saving}
          onSave={async (body) => {
            setSaving(true);
            setError(null);
            try {
              await patchAdminSubscription(sub.id, body);
              toast.success('Subscription updated');
              await loadStudio();
            } catch (e) {
              const message = e instanceof Error ? e.message : 'Update failed';
              setError(message);
              toast.error(message);
            } finally {
              setSaving(false);
            }
          }}
          onFounder={async () => {
            setSaving(true);
            setError(null);
            try {
              await activateFounderProgram(sub.id);
              toast.success('Founder Program activated - owner notified');
              await loadStudio();
            } catch (e) {
              const message =
                e instanceof Error ? e.message : 'Activation failed';
              setError(message);
              toast.error(message);
            } finally {
              setSaving(false);
            }
          }}
        />
      ) : null}

      {tab === 'subscription' && !sub ? (
        <p className="mt-6 text-sm text-zinc-500">No subscription record.</p>
      ) : null}

      {tab === 'subscription' ? (
        <StudioPaymentEvents studioId={studioId} />
      ) : null}
    </div>
  );
}

function OverviewTab({
  studio,
  activity,
  saving,
  onGoToEdit,
  onCopyClaimLink,
  onSendClaimEmail,
  onPublish,
}: {
  studio: AdminStudioDetail;
  activity: StudioActivityResponse | null;
  saving: boolean;
  onGoToEdit: () => void;
  onCopyClaimLink: () => Promise<void>;
  onSendClaimEmail: () => Promise<void>;
  onPublish: () => Promise<void>;
}) {
  const cl = studio.onboardingChecklist;
  const stepLabels: Record<string, string> = {
    hasStudioDetails: 'Name + address',
    hasTraining: 'At least one training',
    hasPhoto: 'At least one photo',
  };
  const requiredSteps = Object.entries(cl.steps).filter(
    ([, step]) => step.required,
  );
  const canPublish = cl.canPublish && studio.status !== 'ACTIVE';
  const needsSessions = studio._count.TrainingSession === 0;
  const onboardingDone = cl.requiredCompleted && !needsSessions;
  const [pendingRows, setPendingRows] = useState<
    Array<{
      id: string;
      createdAt: string;
      User: { id: string; name: string | null; email: string };
      TrainingSession: {
        id: string;
        startsAt: string;
        Training: { id: string; name: string };
      };
    }>
  >([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const loadPending = useCallback(async () => {
    if (!studio.isUnclaimed) {
      setPendingRows([]);
      return;
    }
    setPendingLoading(true);
    try {
      const rows = await fetchAdminStudioPendingEnrollments(studio.id, 20);
      setPendingRows(rows);
    } finally {
      setPendingLoading(false);
    }
  }, [studio.id, studio.isUnclaimed]);

  useEffect(() => {
    void loadPending();
  }, [loadPending]);

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="font-medium">Owner / claim</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div>
            <dt className="text-zinc-500">Tech owner</dt>
            <dd>{studio.User.email}</dd>
          </div>
          {studio.intendedOwnerEmail ? (
            <div>
              <dt className="text-zinc-500">Intended owner</dt>
              <dd className="text-amber-700">{studio.intendedOwnerEmail}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-zinc-500">Claim</dt>
            <dd>
              {studio.claimedAt
                ? `Claimed ${formatAdminDateTime24h(studio.claimedAt)}`
                : studio.isUnclaimed
                  ? 'Unclaimed'
                  : '—'}
            </dd>
          </div>
          {studio.isUnclaimed ? (
            <div className="pt-2">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void onCopyClaimLink()}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-50"
                >
                  Copy claim link
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void onSendClaimEmail()}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-50"
                >
                  Send claim email
                </button>
              </div>
            </div>
          ) : null}
          <div>
            <dt className="text-zinc-500">Last activity</dt>
            <dd>{formatLastActive(studio.lastActivityAt)}</dd>
          </div>
        </dl>
        {studio.isUnclaimed ? (
          <div className="mt-4">
            <h3 className="text-sm font-medium">Pending enrollments</h3>
            {pendingLoading ? (
              <p className="mt-2 text-xs text-zinc-500">Loading…</p>
            ) : pendingRows.length === 0 ? (
              <p className="mt-2 text-xs text-zinc-500">
                No pending enrollments
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {pendingRows.map((row) => (
                  <li
                    key={row.id}
                    className="rounded border border-zinc-200 px-2 py-2 text-xs"
                  >
                    <p className="font-medium">
                      {row.TrainingSession.Training.name} ·{' '}
                      {formatAdminDateTime24h(row.TrainingSession.startsAt)}
                    </p>
                    <p className="text-zinc-500">
                      {row.User.name || 'Client'} · {row.User.email}
                    </p>
                    <button
                      type="button"
                      disabled={confirmingId === row.id}
                      onClick={() => {
                        setConfirmingId(row.id);
                        void confirmAdminStudioPendingEnrollment(
                          studio.id,
                          row.id,
                        )
                          .then(() => loadPending())
                          .finally(() => setConfirmingId(null));
                      }}
                      className="mt-1 rounded border border-zinc-200 px-2 py-1 text-xs hover:bg-zinc-50 disabled:opacity-50"
                    >
                      Confirm booking
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="font-medium">Counts</h2>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="text-zinc-500">Bookings</dt>
            <dd className="text-lg font-semibold">{studio._count.Booking}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Sessions</dt>
            <dd className="text-lg font-semibold">
              {studio._count.TrainingSession}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Trainings</dt>
            <dd className="text-lg font-semibold">{studio._count.Training}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Trainers</dt>
            <dd className="text-lg font-semibold">{studio._count.Trainer}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Clients</dt>
            <dd className="text-lg font-semibold">
              {studio._count.StudioClients}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">30d bookings</dt>
            <dd className="text-lg font-semibold">{studio.bookingsLast30d}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4 lg:col-span-2">
        <h2 className="font-medium">Activity (90d, weekly)</h2>
        {!activity ? (
          <p className="mt-2 text-sm text-zinc-500">Loading timeline…</p>
        ) : activity.timeline.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">No activity yet</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-left text-zinc-500">
                <th className="pb-2">Week</th>
                <th className="pb-2">Bookings</th>
                <th className="pb-2">Sessions</th>
              </tr>
            </thead>
            <tbody>
              {activity.timeline.map((row) => (
                <tr key={row.weekStart} className="border-t border-zinc-100">
                  <td className="py-1.5">{row.weekStart}</td>
                  <td className="py-1.5">{row.bookings}</td>
                  <td className="py-1.5">{row.sessions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {!onboardingDone ? (
        <section className="rounded-lg border border-zinc-200 bg-white p-4 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-medium">Launch checklist</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onGoToEdit}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-50"
              >
                Setup / Edit →
              </button>
              {canPublish ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void onPublish()}
                  className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                >
                  Publish studio
                </button>
              ) : null}
            </div>
          </div>
          <p className="mt-2 text-sm text-zinc-600">
            Status: <strong>{studio.status}</strong>
            {cl.canPublish
              ? ' · Ready to publish'
              : ' · Finish required steps first'}
          </p>
          {needsSessions ? (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              No class sessions yet. Add a training with a schedule in Setup /
              Edit so clients have something to book.
            </p>
          ) : null}
          {!cl.requiredCompleted ? (
            <p className="mt-2 text-sm text-amber-700">
              Missing required: {cl.missingRequiredSteps.join(', ')}
            </p>
          ) : (
            <p className="mt-2 text-sm text-emerald-700">
              Required onboarding steps complete
            </p>
          )}
          <ul className="mt-3 space-y-2 text-sm">
            {requiredSteps.map(([key, step]) => (
              <li key={key} className="flex items-center gap-2">
                <span
                  className={
                    step.completed ? 'text-emerald-600' : 'text-zinc-400'
                  }
                >
                  {step.completed ? '✓' : '○'}
                </span>
                {!step.completed ? (
                  <button
                    type="button"
                    onClick={onGoToEdit}
                    className="text-left hover:text-primary"
                  >
                    {stepLabels[key] ?? key}
                  </button>
                ) : (
                  <span>{stepLabels[key] ?? key}</span>
                )}
                {step.required ? (
                  <span className="text-xs text-zinc-400">required</span>
                ) : null}
              </li>
            ))}
            <li className="flex items-center gap-2">
              <span
                className={
                  !needsSessions ? 'text-emerald-600' : 'text-zinc-400'
                }
              >
                {!needsSessions ? '✓' : '○'}
              </span>
              <button
                type="button"
                onClick={onGoToEdit}
                className="text-left hover:text-primary"
              >
                Recurring class sessions (for first bookings)
              </button>
            </li>
          </ul>
        </section>
      ) : canPublish ? (
        <section className="rounded-lg border border-zinc-200 bg-white p-4 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-medium">Ready to publish</h2>
              <p className="mt-1 text-sm text-zinc-600">
                Onboarding complete · Status: <strong>{studio.status}</strong>
              </p>
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={() => void onPublish()}
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              Publish studio
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function AnalyticsTab({
  analytics,
}: {
  analytics: StudioAnalyticsData | null;
}) {
  if (!analytics) {
    return <p className="mt-6 text-sm text-zinc-500">Loading analytics…</p>;
  }

  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard
        label="Revenue (30d)"
        value={formatCompactAmount(analytics.revenueTotal)}
      />
      <StatCard label="Bookings" value={analytics.bookingCount} />
      <StatCard
        label="Sessions scheduled"
        value={analytics.trainingSessionsScheduled}
      />
      <StatCard
        label="Active enrollments"
        value={analytics.enrollmentsActive}
      />
      <StatCard label="No-shows" value={analytics.noshowCount} />
      <StatCard
        label="Attendance rate"
        value={
          analytics.attendanceRate != null
            ? `${Math.round(analytics.attendanceRate * 100)}%`
            : '—'
        }
      />
      <section className="rounded-lg border border-zinc-200 bg-white p-4 sm:col-span-2 lg:col-span-3">
        <h2 className="font-medium">Clients (90d rolling)</h2>
        <dl className="mt-3 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-zinc-500">Total</dt>
            <dd className="text-xl font-semibold">{analytics.clients.total}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Regular</dt>
            <dd className="text-xl font-semibold">
              {analytics.clients.regular}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">New in period</dt>
            <dd className="text-xl font-semibold">
              {analytics.clients.newInPeriod}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Inactive</dt>
            <dd className="text-xl font-semibold">
              {analytics.clients.inactive}
            </dd>
          </div>
        </dl>
        {!analytics.isPro ? (
          <p className="mt-3 text-xs text-zinc-500">
            Full analytics require STUDIO/ENTERPRISE subscription
          </p>
        ) : null}
      </section>
    </div>
  );
}

// Compact amount like the mobile app: thousands → k, millions → M.
function formatCompactAmount(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  const v = Math.abs(value);
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
  if (v >= 1_000_000) return `${fmt(v / 1_000_000)}M`;
  if (v >= 1_000) return `${fmt(v / 1_000)}k`;
  return String(Math.round(v));
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function todayInputValue() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addMonthsInputValue(base: string, months: number) {
  const [y, m, d] = base.split('-').map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  dt.setMonth(dt.getMonth() + months);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/** ISO weekday: Mon=1 … Sun=7 (matches mobile / backend). */
function isoWeekdayFromDateInput(value: string): number {
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  const js = dt.getDay(); // Sun=0
  return js === 0 ? 7 : js;
}

function dateInputToApiDay(value: string): string {
  return `${value}T00:00:00.000`;
}

function weeksCountInclusive(start: string, end: string): number {
  const [ys, ms, ds] = start.split('-').map(Number);
  const [ye, me, de] = end.split('-').map(Number);
  const a = new Date(ys, (ms ?? 1) - 1, ds ?? 1).getTime();
  const b = new Date(ye, (me ?? 1) - 1, de ?? 1).getTime();
  const days = Math.floor((b - a) / (24 * 60 * 60 * 1000)) + 1;
  return Math.min(26, Math.max(1, Math.ceil(days / 7)));
}

function studioLocationOptions(
  studio: AdminStudioDetail,
): { id: string; label: string }[] {
  const mainLabel =
    (studio.address && studio.address.trim()) || studio.name || 'Main location';
  const opts: { id: string; label: string }[] = [
    { id: 'default', label: mainLabel },
  ];
  const settings = studio.reminderSettings;
  if (!settings || typeof settings !== 'object') return opts;
  const raw = (settings as Record<string, unknown>).trainingLocations;
  if (!Array.isArray(raw)) return opts;
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const loc = entry as { id?: string; name?: string; address?: string };
    const id = String(loc.id ?? '').trim();
    if (!id || id === 'default') continue;
    const label =
      String(loc.name ?? '').trim() || String(loc.address ?? '').trim() || id;
    opts.push({ id, label });
  }
  return opts;
}

type CreateTrainingWithSessionsPayload = {
  training: {
    name: string;
    duration: number;
    price: number;
    description?: string;
    language?: string;
    trainingCategoryId?: number;
    trainerIds: string[];
  };
  sessions: {
    capacity: number;
    trainerId?: string;
    locationId?: string;
    daysOfWeek?: number[];
    startTime?: string;
    slots?: { day: number; startTime: string }[];
    weeksCount: number;
    startsFromDate: string;
    endsOnDate: string;
    timezone?: string;
  };
};

function EditTab({
  studio,
  trainings,
  trainers,
  saving,
  onSaveProfile,
  onUploadPhoto,
  onCreateTraining,
  onCreateTrainer,
  onCreateSessions,
  onDeleteStudio,
}: {
  studio: AdminStudioDetail;
  trainings: AdminTraining[];
  trainers: AdminTrainer[];
  saving: boolean;
  onSaveProfile: (fields: Record<string, unknown>) => Promise<void>;
  onUploadPhoto: (file: File) => Promise<string[]>;
  onCreateTraining: (
    payload: CreateTrainingWithSessionsPayload,
  ) => Promise<void>;
  onCreateTrainer: (body: {
    name: string;
    email?: string;
    accessLevel: 'ADMIN' | 'EMPLOYEE';
  }) => Promise<void>;
  onCreateSessions: (body: Record<string, unknown>) => Promise<void>;
  onDeleteStudio: () => void;
}) {
  const [description, setDescription] = useState(studio.description ?? '');
  const [name, setName] = useState(studio.name ?? '');
  const [phone, setPhone] = useState(studio.phone ?? '');
  const [email, setEmail] = useState(studio.email ?? '');
  const [address, setAddress] = useState(studio.address ?? '');
  const [website, setWebsite] = useState(studio.website ?? '');
  const [instagram, setInstagram] = useState(studio.instagram ?? '');
  const [photos, setPhotos] = useState((studio.photos ?? []).join('\n'));
  const [photoList, setPhotoList] = useState<string[]>(studio.photos ?? []);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setPhotoList(studio.photos ?? []);
    setPhotos((studio.photos ?? []).join('\n'));
  }, [studio.photos]);

  const locations = studioLocationOptions(studio);

  const [trainingModalOpen, setTrainingModalOpen] = useState(false);
  const [categories, setCategories] = useState<TrainingCategoryOption[]>([]);
  const [trName, setTrName] = useState('');
  const [trCategoryId, setTrCategoryId] = useState('');
  const [trLocationId, setTrLocationId] = useState('default');
  const [trDuration, setTrDuration] = useState('60');
  const [trCapacity, setTrCapacity] = useState('10');
  const [trPrice, setTrPrice] = useState('');
  const [trLanguage, setTrLanguage] = useState('en');
  const [trDescription, setTrDescription] = useState('');
  const [trTrainerId, setTrTrainerId] = useState('');
  const [trRecurring, setTrRecurring] = useState(false);
  const [trDate, setTrDate] = useState(todayInputValue);
  const [trTime, setTrTime] = useState('09:00');
  const [trEndDate, setTrEndDate] = useState(() =>
    addMonthsInputValue(todayInputValue(), 2),
  );
  const [trDays, setTrDays] = useState<number[]>([1, 3, 5]);
  const [trDayTimes, setTrDayTimes] = useState<Record<number, string>>({
    1: '09:00',
    3: '09:00',
    5: '09:00',
  });

  const [trainerModalOpen, setTrainerModalOpen] = useState(false);
  const [trainerName, setTrainerName] = useState('');
  const [trainerEmail, setTrainerEmail] = useState('');

  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [sessTrainingId, setSessTrainingId] = useState('');
  const [sessDays, setSessDays] = useState<number[]>([1, 3, 5]);
  const [sessTime, setSessTime] = useState('09:00');
  const [sessCapacity, setSessCapacity] = useState('10');

  useEffect(() => {
    if (!trainingModalOpen) return;
    let cancelled = false;
    void fetchTrainingCategories()
      .then((list) => {
        if (!cancelled) setCategories(list);
      })
      .catch(() => {
        if (!cancelled) setCategories([]);
      });
    return () => {
      cancelled = true;
    };
  }, [trainingModalOpen]);

  const resetTrainingForm = () => {
    const today = todayInputValue();
    setTrName('');
    setTrCategoryId('');
    setTrLocationId('default');
    setTrDuration('60');
    setTrCapacity('10');
    setTrPrice('');
    setTrLanguage('en');
    setTrDescription('');
    setTrTrainerId('');
    setTrRecurring(false);
    setTrDate(today);
    setTrTime('09:00');
    setTrEndDate(addMonthsInputValue(today, 2));
    setTrDays([1, 3, 5]);
    setTrDayTimes({ 1: '09:00', 3: '09:00', 5: '09:00' });
  };

  const setRecurringDays = (days: number[]) => {
    setTrDays(days);
    setTrDayTimes((prev) => {
      const next = { ...prev };
      for (const d of days) {
        if (!next[d]) next[d] = trTime || '09:00';
      }
      for (const key of Object.keys(next)) {
        const day = Number(key);
        if (!days.includes(day)) delete next[day];
      }
      return next;
    });
  };

  const trainingFormValid = (() => {
    const duration = Number(trDuration) || 0;
    const capacity = Number(trCapacity) || 0;
    const price = Number(trPrice) || 0;
    if (!trName.trim()) return false;
    if (duration < 1 || duration > 480) return false;
    if (capacity < 1 || capacity > 30) return false;
    if (price <= 0) return false;
    if (categories.length > 0 && !trCategoryId) return false;
    if (!trDate) return false;
    if (trRecurring) {
      if (trDays.length === 0) return false;
      if (!trEndDate || trEndDate < trDate) return false;
      const maxEnd = addMonthsInputValue(trDate, 2);
      if (trEndDate > maxEnd) return false;
    } else if (!trTime) {
      return false;
    }
    return true;
  })();

  // On failure the parent handler surfaces the error banner and rethrows; we
  // swallow here so the modal stays open (fields intact) with no unhandled
  // rejection.
  const submitTraining = async () => {
    if (!trainingFormValid) return;
    const duration = Number(trDuration) || 60;
    const capacity = Number(trCapacity) || 10;
    const price = Number(trPrice);
    const categoryId = trCategoryId ? Number(trCategoryId) : undefined;
    try {
      const sessions: CreateTrainingWithSessionsPayload['sessions'] =
        trRecurring
          ? {
              capacity,
              trainerId: trTrainerId || undefined,
              locationId: trLocationId || undefined,
              slots: trDays.map((day) => ({
                day,
                startTime: normalizeAdminHm(
                  trDayTimes[day] || trTime || '09:00',
                ),
              })),
              weeksCount: weeksCountInclusive(trDate, trEndDate),
              startsFromDate: dateInputToApiDay(trDate),
              endsOnDate: dateInputToApiDay(trEndDate),
              timezone: 'Asia/Ho_Chi_Minh',
            }
          : {
              capacity,
              trainerId: trTrainerId || undefined,
              locationId: trLocationId || undefined,
              daysOfWeek: [isoWeekdayFromDateInput(trDate)],
              startTime: normalizeAdminHm(trTime),
              weeksCount: 1,
              startsFromDate: dateInputToApiDay(trDate),
              endsOnDate: dateInputToApiDay(trDate),
              timezone: 'Asia/Ho_Chi_Minh',
            };

      await onCreateTraining({
        training: {
          name: trName.trim(),
          duration,
          price,
          description: trDescription.trim() || undefined,
          language: trLanguage || undefined,
          trainingCategoryId: categoryId,
          trainerIds: trTrainerId ? [trTrainerId] : [],
        },
        sessions,
      });
      setTrainingModalOpen(false);
      resetTrainingForm();
    } catch {
      /* error surfaced by parent */
    }
  };

  const submitTrainer = async () => {
    try {
      await onCreateTrainer({
        name: trainerName.trim(),
        email: trainerEmail.trim() || undefined,
        accessLevel: 'EMPLOYEE',
      });
      setTrainerModalOpen(false);
      setTrainerName('');
      setTrainerEmail('');
    } catch {
      /* error surfaced by parent */
    }
  };

  const submitSessions = async () => {
    try {
      await onCreateSessions({
        studioId: studio.id,
        trainingId: sessTrainingId,
        capacity: Number(sessCapacity) || 10,
        daysOfWeek: sessDays,
        startTime: sessTime,
        weeksCount: 4,
      });
      setSessionModalOpen(false);
    } catch {
      /* error surfaced by parent */
    }
  };

  return (
    <div className="mt-6 space-y-8">
      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="font-medium">Profile</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="text-zinc-500">Studio name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="text-zinc-500">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="text-zinc-500">Phone</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="text-zinc-500">Email</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="text-zinc-500">Address</span>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="text-zinc-500">Website</span>
            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="text-zinc-500">Instagram</span>
            <input
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
          <div className="sm:col-span-2 space-y-2">
            <span className="text-sm text-zinc-500">Photos</span>
            {photoList.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {photoList.map((url) => (
                  <img
                    key={url}
                    src={url}
                    alt=""
                    className="h-20 w-20 rounded-lg object-cover border border-zinc-200"
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-400">No photos yet</p>
            )}
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={saving || uploading}
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (!file) return;
                  setUploading(true);
                  void onUploadPhoto(file)
                    .then((next) => {
                      const list = Array.isArray(next) ? next : [];
                      setPhotoList(list);
                      setPhotos(list.join('\n'));
                    })
                    .catch(() => {
                      /* parent surfaces error */
                    })
                    .finally(() => setUploading(false));
                }}
              />
              {uploading ? 'Compressing & uploading…' : 'Upload photo'}
            </label>
            <p className="text-xs text-zinc-400">
              Images are compressed to WebP (max ~1600px) before upload.
            </p>
            <label className="block text-sm">
              <span className="text-zinc-500">
                Or paste photo URLs (one per line)
              </span>
              <textarea
                value={photos}
                onChange={(e) => setPhotos(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              />
            </label>
          </div>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() =>
            void onSaveProfile({
              name,
              description,
              phone,
              email,
              address,
              website,
              instagram,
              photos: photos
                .split('\n')
                .map((p) => p.trim())
                .filter(Boolean),
            })
          }
          className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Save profile
        </button>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-medium">Trainings ({trainings.length})</h2>
          <AddButton
            onClick={() => {
              resetTrainingForm();
              setTrainingModalOpen(true);
            }}
          />
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          Creates the class catalog item and schedule sessions in one step (same
          fields as the mobile app; trainer is optional).
        </p>
        <ul className="mt-2 space-y-1 text-sm">
          {trainings.map((t) => (
            <li key={t.id}>
              {t.name} · {t.duration}min · {t.price}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-medium">Trainers ({trainers.length})</h2>
          <AddButton onClick={() => setTrainerModalOpen(true)} />
        </div>
        <ul className="mt-2 space-y-1 text-sm">
          {trainers.map((t) => (
            <li key={t.id}>
              {t.name} · {t.accessLevel}
              {t.email ? ` · ${t.email}` : ''}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-medium">Add sessions to existing training</h2>
          <AddButton
            onClick={() => {
              if (trainings.length === 0) return;
              setSessTrainingId(trainings[0]?.id ?? '');
              setSessionModalOpen(true);
            }}
          />
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          Optional — use when the training already exists and you only need more
          weekly slots.
        </p>
        {trainings.length === 0 ? (
          <p className="mt-2 text-sm text-amber-700">
            Add a training above before creating extra sessions.
          </p>
        ) : null}
      </section>

      <section className="mt-8 rounded-lg border border-red-200 bg-red-50 p-4">
        <h3 className="text-sm font-semibold text-red-700">Danger zone</h3>
        <p className="mt-1 text-xs text-red-600">
          Permanently delete this studio and all associated data (trainings,
          sessions, bookings). Enrolled clients will be notified.
        </p>
        <button
          disabled={saving}
          onClick={() => {
            if (
              window.confirm(
                `Are you sure you want to permanently delete "${studio.name}"? This action cannot be undone.`,
              )
            ) {
              onDeleteStudio();
            }
          }}
          className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          Delete studio
        </button>
      </section>

      <AdminModal
        open={trainingModalOpen}
        title="Add training"
        size="lg"
        onClose={() => setTrainingModalOpen(false)}
      >
        <div className="space-y-3">
          <Field label="Name">
            <input
              value={trName}
              onChange={(e) => setTrName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </Field>
          {categories.length > 0 ? (
            <Field label="Category">
              <select
                value={trCategoryId}
                onChange={(e) => setTrCategoryId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name_en}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
          {locations.length > 1 ? (
            <Field label="Address / location">
              <select
                value={trLocationId}
                onChange={(e) => setTrLocationId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.label}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Duration (min)">
              <input
                type="number"
                min={1}
                max={480}
                value={trDuration}
                onChange={(e) => setTrDuration(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Capacity">
              <input
                type="number"
                min={1}
                max={30}
                value={trCapacity}
                onChange={(e) => setTrCapacity(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Price (VND)">
              <input
                type="number"
                min={1}
                value={trPrice}
                onChange={(e) => setTrPrice(e.target.value)}
                placeholder="e.g. 250000"
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Language">
              <select
                value={trLanguage}
                onChange={(e) => setTrLanguage(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              >
                <option value="en">English</option>
                <option value="ru">Russian</option>
                <option value="vi">Vietnamese</option>
              </select>
            </Field>
          </div>
          <Field label="Description (optional)">
            <textarea
              value={trDescription}
              onChange={(e) => setTrDescription(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Trainer (optional)">
            <select
              value={trTrainerId}
              onChange={(e) => setTrTrainerId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            >
              <option value="">No trainer</option>
              {trainers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>

          <div className="border-t border-zinc-100 pt-3">
            <p className="text-sm font-medium text-zinc-700">Schedule</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setTrRecurring(false)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  !trRecurring
                    ? 'bg-[#3F3287] text-white'
                    : 'bg-zinc-100 text-zinc-600'
                }`}
              >
                One training
              </button>
              <button
                type="button"
                onClick={() => setTrRecurring(true)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  trRecurring
                    ? 'bg-[#3F3287] text-white'
                    : 'bg-zinc-100 text-zinc-600'
                }`}
              >
                Repeated training
              </button>
            </div>
          </div>

          {!trRecurring ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date">
                <input
                  type="date"
                  value={trDate}
                  onChange={(e) => setTrDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Time (24h)">
                <AdminTimeInput
                  value={trTime}
                  onChange={setTrTime}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                />
              </Field>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Start date">
                  <input
                    type="date"
                    value={trDate}
                    onChange={(e) => {
                      const next = e.target.value;
                      setTrDate(next);
                      const maxEnd = addMonthsInputValue(next, 2);
                      if (trEndDate > maxEnd) setTrEndDate(maxEnd);
                      if (trEndDate < next) setTrEndDate(next);
                    }}
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="End date (max +2 months)">
                  <input
                    type="date"
                    value={trEndDate}
                    min={trDate}
                    max={addMonthsInputValue(trDate, 2)}
                    onChange={(e) => setTrEndDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                  />
                </Field>
              </div>
              <Field label="Repeat on">
                <div className="mt-1">
                  <WeekdayPills value={trDays} onChange={setRecurringDays} />
                </div>
              </Field>
              {trDays.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-zinc-500">Time per day</p>
                  {trDays.map((day) => {
                    const label =
                      ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][
                        day - 1
                      ] ?? String(day);
                    return (
                      <div
                        key={day}
                        className="flex items-center justify-between gap-3"
                      >
                        <span className="text-sm text-zinc-600 w-10">
                          {label}
                        </span>
                        <AdminTimeInput
                          value={trDayTimes[day] || '09:00'}
                          onChange={(hm) =>
                            setTrDayTimes((prev) => ({
                              ...prev,
                              [day]: hm,
                            }))
                          }
                          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                        />
                      </div>
                    );
                  })}
                </div>
              ) : null}
              <p className="text-xs text-zinc-500">
                ~{weeksCountInclusive(trDate, trEndDate)} week
                {weeksCountInclusive(trDate, trEndDate) === 1 ? '' : 's'} in
                range
              </p>
            </>
          )}
        </div>
        <ModalActions
          disabled={saving || !trainingFormValid}
          onCancel={() => setTrainingModalOpen(false)}
          onSubmit={() => void submitTraining()}
          submitLabel="Create class"
        />
      </AdminModal>

      <AdminModal
        open={trainerModalOpen}
        title="Add trainer"
        onClose={() => setTrainerModalOpen(false)}
      >
        <div className="space-y-3">
          <Field label="Name">
            <input
              value={trainerName}
              onChange={(e) => setTrainerName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Email (optional)">
            <input
              value={trainerEmail}
              onChange={(e) => setTrainerEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </Field>
        </div>
        <ModalActions
          disabled={saving || !trainerName.trim()}
          onCancel={() => setTrainerModalOpen(false)}
          onSubmit={() => void submitTrainer()}
          submitLabel="Add trainer"
        />
      </AdminModal>

      <AdminModal
        open={sessionModalOpen}
        title="Add recurring sessions"
        onClose={() => setSessionModalOpen(false)}
      >
        <div className="space-y-3">
          <Field label="Training">
            <select
              value={sessTrainingId}
              onChange={(e) => setSessTrainingId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            >
              <option value="">Select training</option>
              {trainings.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Days of week">
            <div className="mt-1">
              <WeekdayPills value={sessDays} onChange={setSessDays} />
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start time (24h)">
              <AdminTimeInput
                value={sessTime}
                onChange={setSessTime}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Capacity">
              <input
                type="number"
                value={sessCapacity}
                onChange={(e) => setSessCapacity(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              />
            </Field>
          </div>
        </div>
        <ModalActions
          disabled={saving || !sessTrainingId || sessDays.length === 0}
          onCancel={() => setSessionModalOpen(false)}
          onSubmit={() => void submitSessions()}
          submitLabel="Create sessions"
        />
      </AdminModal>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="text-zinc-500">{label}</span>
      {children}
    </label>
  );
}

function AddButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-[#3F3287] hover:bg-zinc-50"
    >
      <Plus className="h-4 w-4" />
      Add
    </button>
  );
}

function ModalActions({
  disabled,
  onCancel,
  onSubmit,
  submitLabel,
}: {
  disabled: boolean;
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel: string;
}) {
  return (
    <div className="mt-5 flex justify-end gap-2">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-lg border border-zinc-200 px-4 py-2 text-sm hover:bg-zinc-50"
      >
        Cancel
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onSubmit}
        className="rounded-lg bg-[#3F3287] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {submitLabel}
      </button>
    </div>
  );
}

function SubscriptionTab({
  subscription,
  saving,
  onSave,
  onFounder,
}: {
  subscription: NonNullable<AdminStudioDetail['Subscription']>;
  saving: boolean;
  onSave: (body: {
    type?: string;
    status?: string;
    currentPeriodEnd?: string | null;
    manualOverride?: boolean;
  }) => Promise<void>;
  onFounder: () => Promise<void>;
}) {
  const [type, setType] = useState(subscription.type);
  const [status, setStatus] = useState(subscription.status);
  const [periodEnd, setPeriodEnd] = useState(
    subscription.currentPeriodEnd
      ? subscription.currentPeriodEnd.slice(0, 10)
      : '',
  );

  const extendDays = (days: number) => {
    const base = periodEnd ? new Date(periodEnd) : new Date();
    base.setDate(base.getDate() + days);
    setPeriodEnd(base.toISOString().slice(0, 10));
  };

  return (
    <div className="mt-6 max-w-lg space-y-4">
      {subscription.manualOverride ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Manual override active
          {subscription.manualOverrideBy
            ? ` (${subscription.manualOverrideBy})`
            : ''}
          — RevenueCat/Stripe sync won&apos;t overwrite
        </p>
      ) : null}

      <label className="block text-sm">
        <span className="text-zinc-500">Type</span>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
        >
          <option value="SOLO">SOLO</option>
          <option value="STUDIO">STUDIO</option>
          <option value="ENTERPRISE">ENTERPRISE</option>
        </select>
      </label>

      <label className="block text-sm">
        <span className="text-zinc-500">Status</span>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
        >
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
          <option value="CANCELLED">CANCELLED</option>
          <option value="EXPIRED">EXPIRED</option>
        </select>
      </label>

      <label className="block text-sm">
        <span className="text-zinc-500">Period end</span>
        <input
          type="date"
          value={periodEnd}
          onChange={(e) => setPeriodEnd(e.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setType('STUDIO');
            extendDays(30);
          }}
          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-50"
        >
          Grant STUDIO +30d
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => {
            if (
              !window.confirm(
                'Add this studio to the Founder Program? This grants the STUDIO plan free for 90 days and sends a push notification to the owner.',
              )
            ) {
              return;
            }
            setType('STUDIO');
            setStatus('ACTIVE');
            const end = new Date();
            end.setDate(end.getDate() + 90);
            setPeriodEnd(end.toISOString().slice(0, 10));
            void onFounder();
          }}
          className="rounded-full border border-[#3F3287] bg-[#3F3287]/5 px-3 py-1.5 text-sm font-medium text-[#3F3287] hover:bg-[#3F3287]/10 disabled:opacity-50"
        >
          + Add Founder Program (STUDIO 90 days)
        </button>
        <button
          type="button"
          onClick={() => extendDays(90)}
          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-50"
        >
          Extend +90d
        </button>
        <button
          type="button"
          onClick={() => {
            setType('SOLO');
            setStatus('ACTIVE');
            setPeriodEnd('');
          }}
          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-50"
        >
          Revoke to SOLO
        </button>
      </div>

      <button
        type="button"
        disabled={saving}
        onClick={() =>
          void onSave({
            type,
            status,
            currentPeriodEnd: periodEnd ? `${periodEnd}T23:59:59.999Z` : null,
            manualOverride: true,
          })
        }
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        Save subscription
      </button>
    </div>
  );
}

function StudioPaymentEvents({ studioId }: { studioId: string }) {
  const [events, setEvents] = useState<AdminPaymentEventRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminStudioPaymentEvents(studioId, 10)
      .then(setEvents)
      .catch((e) =>
        setError(
          e instanceof Error ? e.message : 'Failed to load payment events',
        ),
      );
  }, [studioId]);

  return (
    <div className="mt-8">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Payment history (last 10 events)
      </h3>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      {!error && events.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          No payment events recorded.
        </p>
      ) : null}
      {events.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {events.map((e) => (
            <li
              key={e.id}
              className="rounded-lg border border-border bg-white px-4 py-3 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className={
                    e.severity === 'error'
                      ? 'font-medium text-red-600'
                      : 'font-medium text-foreground'
                  }
                >
                  {e.type}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatAdminDateTime24h(e.createdAt)}
                </span>
              </div>
              {e.message ? (
                <p className="mt-1 text-muted-foreground">{e.message}</p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function ClientsTab({ studioId }: { studioId: string }) {
  const [rows, setRows] = useState<AdminStudioClientRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchAdminStudioClients(studioId, {
          page,
          limit: 20,
          search: search || undefined,
        });
        if (cancelled) return;
        setRows(res.items);
        setTotal(res.total);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load clients');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [studioId, page, search]);

  return (
    <div className="mt-6">
      <input
        type="search"
        placeholder="Search name, email, phone"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        className="rounded-lg border border-border px-3 py-2 text-sm"
      />
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      {loading ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading clients…</p>
      ) : null}
      {!loading && rows.length === 0 && !error ? (
        <p className="mt-4 text-sm text-muted-foreground">No clients found.</p>
      ) : null}
      {rows.length > 0 ? (
        <div className="mt-4">
          <AdminTable
            rows={rows}
            columns={[
              {
                key: 'client',
                header: 'Client',
                render: (r) => (
                  <div>
                    <p className="font-medium">{r.name ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.email}
                      {r.phone ? ` · ${r.phone}` : ''}
                      {r.isGuest ? ' · guest' : ''}
                    </p>
                  </div>
                ),
              },
              {
                key: 'source',
                header: 'Source',
                render: (r) => r.source,
              },
              {
                key: 'visits',
                header: 'Visits',
                render: (r) => r.visitsCount,
              },
              {
                key: 'noShows',
                header: 'No-shows',
                render: (r) =>
                  r.noShowCount > 0 ? (
                    <span className="font-semibold text-red-600">
                      {r.noShowCount}
                    </span>
                  ) : (
                    '0'
                  ),
              },
              {
                key: 'lastVisit',
                header: 'Last visit',
                render: (r) =>
                  r.lastVisitAt ? formatAdminDate(r.lastVisitAt) : '—',
              },
              {
                key: 'added',
                header: 'Added',
                render: (r) => formatAdminDate(r.rosterCreatedAt),
              },
            ]}
          />
        </div>
      ) : null}
      <Pagination page={page} total={total} limit={20} onChange={setPage} />
    </div>
  );
}

function VisitsTab({ studioId }: { studioId: string }) {
  const [rows, setRows] = useState<AdminVisitRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchAdminStudioVisits(studioId, {
          page,
          limit: 20,
          status: status || undefined,
        });
        if (cancelled) return;
        setRows(res.items);
        setTotal(res.total);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load visits');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [studioId, page, status]);

  return (
    <div className="mt-6">
      <select
        value={status}
        onChange={(e) => {
          setStatus(e.target.value);
          setPage(1);
        }}
        className="rounded-lg border border-border px-3 py-2 text-sm"
      >
        <option value="">All statuses</option>
        <option value="COMPLETED">Completed</option>
        <option value="CONFIRMED">Confirmed</option>
        <option value="PENDING">Pending</option>
        <option value="ACTIVE">Active (enrollment)</option>
        <option value="NO_SHOW">No-show</option>
        <option value="CANCELLED">Cancelled</option>
      </select>
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      {loading ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading visits…</p>
      ) : null}
      {!loading && rows.length === 0 && !error ? (
        <p className="mt-4 text-sm text-muted-foreground">No visits found.</p>
      ) : null}
      {rows.length > 0 ? (
        <div className="mt-4">
          <AdminTable
            rows={rows}
            columns={[
              {
                key: 'date',
                header: 'Date',
                render: (r) => formatAdminDateTime24h(r.startsAt),
              },
              {
                key: 'client',
                header: 'Client',
                render: (r) => (
                  <div>
                    <p className="font-medium">{r.clientName ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.clientEmail}
                    </p>
                  </div>
                ),
              },
              {
                key: 'training',
                header: 'Training',
                render: (r) => r.trainingName,
              },
              {
                key: 'kind',
                header: 'Type',
                render: (r) =>
                  r.kind === 'booking' ? 'Booking' : 'Group session',
              },
              {
                key: 'status',
                header: 'Status',
                render: (r) =>
                  r.status === 'NOSHOW' || r.status === 'NO_SHOW' ? (
                    <span className="font-semibold text-red-600">NO-SHOW</span>
                  ) : (
                    r.status
                  ),
              },
            ]}
          />
        </div>
      ) : null}
      <Pagination page={page} total={total} limit={20} onChange={setPage} />
    </div>
  );
}

function Pagination({
  page,
  total,
  limit,
  onChange,
}: {
  page: number;
  total: number;
  limit: number;
  onChange: (updater: (p: number) => number) => void;
}) {
  return (
    <div className="mt-4 flex items-center gap-2">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onChange((p) => p - 1)}
        className="rounded border border-border px-3 py-1 text-sm disabled:opacity-40"
      >
        Prev
      </button>
      <button
        type="button"
        disabled={page * limit >= total}
        onClick={() => onChange((p) => p + 1)}
        className="rounded border border-border px-3 py-1 text-sm disabled:opacity-40"
      >
        Next
      </button>
      <span className="text-sm text-muted-foreground">
        {total} total · page {page}
      </span>
    </div>
  );
}
