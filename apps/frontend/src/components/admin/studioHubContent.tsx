'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ActivityTierBadge,
  formatLastActive,
} from '@/components/admin/activityTierBadge';
import {
  createAdminRecurringSessions,
  createAdminStudioTrainer,
  createAdminStudioTraining,
  fetchAdminStudio,
  fetchAdminStudioActivity,
  fetchAdminStudioAnalytics,
  fetchAdminStudioTrainers,
  fetchAdminStudioTrainings,
  patchAdminStudioProfile,
  patchAdminSubscription,
} from '@/lib/admin/api';
import type {
  AdminStudioDetail,
  AdminTrainer,
  AdminTraining,
  StudioAnalyticsData,
  StudioActivityResponse,
} from '@/lib/admin/types';

type Tab = 'overview' | 'analytics' | 'edit' | 'subscription';

const tabs: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'edit', label: 'Edit' },
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
  const validTabs: Tab[] = ['overview', 'analytics', 'edit', 'subscription'];
  const [tab, setTab] = useState<Tab>(
    validTabs.includes(initialTab as Tab) ? (initialTab as Tab) : 'overview',
  );
  const [studio, setStudio] = useState<AdminStudioDetail | null>(null);
  const [activity, setActivity] = useState<StudioActivityResponse | null>(null);
  const [analytics, setAnalytics] = useState<StudioAnalyticsData | null>(null);
  const [trainings, setTrainings] = useState<AdminTraining[]>([]);
  const [trainers, setTrainers] = useState<AdminTrainer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
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
            {studio.User.email} · {studio.status}
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
                ? 'border-b-2 border-[#3F3287] text-[#3F3287]'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {msg ? (
        <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {msg}
        </p>
      ) : null}
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      {tab === 'overview' ? (
        <OverviewTab
          studio={studio}
          activity={activity}
          onGoToEdit={() => setTab('edit')}
        />
      ) : null}

      {tab === 'analytics' ? <AnalyticsTab analytics={analytics} /> : null}

      {tab === 'edit' ? (
        <EditTab
          studio={studio}
          trainings={trainings}
          trainers={trainers}
          saving={saving}
          onSaveProfile={async (fields) => {
            setSaving(true);
            setMsg(null);
            setError(null);
            try {
              await patchAdminStudioProfile(studioId, fields);
              setMsg('Profile saved');
              await loadStudio();
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Save failed');
            } finally {
              setSaving(false);
            }
          }}
          onCreateTraining={async (body) => {
            setSaving(true);
            setError(null);
            try {
              await createAdminStudioTraining(studioId, {
                ...body,
                studioId,
              });
              setMsg('Training created');
              await loadEditData();
              await loadStudio();
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Create failed');
            } finally {
              setSaving(false);
            }
          }}
          onCreateTrainer={async (body) => {
            setSaving(true);
            setError(null);
            try {
              await createAdminStudioTrainer(studioId, body);
              setMsg('Trainer created');
              await loadEditData();
              await loadStudio();
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Create failed');
            } finally {
              setSaving(false);
            }
          }}
          onCreateSessions={async (body) => {
            setSaving(true);
            setError(null);
            try {
              await createAdminRecurringSessions(studioId, body);
              setMsg('Sessions created');
              await loadStudio();
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Create failed');
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
            setMsg(null);
            setError(null);
            try {
              await patchAdminSubscription(sub.id, body);
              setMsg('Subscription updated');
              await loadStudio();
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Update failed');
            } finally {
              setSaving(false);
            }
          }}
        />
      ) : null}

      {tab === 'subscription' && !sub ? (
        <p className="mt-6 text-sm text-zinc-500">No subscription record.</p>
      ) : null}
    </div>
  );
}

function OverviewTab({
  studio,
  activity,
  onGoToEdit,
}: {
  studio: AdminStudioDetail;
  activity: StudioActivityResponse | null;
  onGoToEdit: () => void;
}) {
  const cl = studio.onboardingChecklist;
  const stepLabels: Record<string, string> = {
    hasTraining: 'At least one training',
    hasPhoto: 'At least one photo',
  };
  const requiredSteps = Object.entries(cl.steps).filter(
    ([, step]) => step.required,
  );

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="font-medium">Owner</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div>
            <dt className="text-zinc-500">Email</dt>
            <dd>{studio.User.email}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Name</dt>
            <dd>{studio.User.name ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Phone</dt>
            <dd>{studio.User.phone ?? studio.phone ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Last activity</dt>
            <dd>{formatLastActive(studio.lastActivityAt)}</dd>
          </div>
        </dl>
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

      <section className="rounded-lg border border-zinc-200 bg-white p-4 lg:col-span-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-medium">Onboarding checklist</h2>
          {!cl.requiredCompleted ? (
            <button
              type="button"
              onClick={onGoToEdit}
              className="text-sm text-[#3F3287] hover:underline"
            >
              Fix in Edit →
            </button>
          ) : null}
        </div>
        {!cl.requiredCompleted ? (
          <p className="mt-2 text-sm text-amber-700">
            Missing required: {cl.missingRequiredSteps.join(', ')}
          </p>
        ) : (
          <p className="mt-2 text-sm text-emerald-700">
            Required steps complete
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
                  className="text-left hover:text-[#3F3287]"
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
        </ul>
      </section>
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
      <StatCard label="Revenue (30d)" value={analytics.revenueTotal} />
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

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function EditTab({
  studio,
  trainings,
  trainers,
  saving,
  onSaveProfile,
  onCreateTraining,
  onCreateTrainer,
  onCreateSessions,
}: {
  studio: AdminStudioDetail;
  trainings: AdminTraining[];
  trainers: AdminTrainer[];
  saving: boolean;
  onSaveProfile: (fields: Record<string, unknown>) => Promise<void>;
  onCreateTraining: (body: {
    name: string;
    duration: number;
    price: number;
    description?: string;
  }) => Promise<void>;
  onCreateTrainer: (body: {
    name: string;
    email?: string;
    accessLevel: 'ADMIN' | 'EMPLOYEE';
  }) => Promise<void>;
  onCreateSessions: (body: Record<string, unknown>) => Promise<void>;
}) {
  const [description, setDescription] = useState(studio.description ?? '');
  const [name, setName] = useState(studio.name ?? '');
  const [phone, setPhone] = useState(studio.phone ?? '');
  const [email, setEmail] = useState(studio.email ?? '');
  const [address, setAddress] = useState(studio.address ?? '');
  const [website, setWebsite] = useState(studio.website ?? '');
  const [instagram, setInstagram] = useState(studio.instagram ?? '');
  const [photos, setPhotos] = useState((studio.photos ?? []).join('\n'));

  const [trName, setTrName] = useState('');
  const [trDuration, setTrDuration] = useState('60');
  const [trPrice, setTrPrice] = useState('0');

  const [trainerName, setTrainerName] = useState('');
  const [trainerEmail, setTrainerEmail] = useState('');

  const [sessTrainingId, setSessTrainingId] = useState('');
  const [sessDays, setSessDays] = useState('1,3,5');
  const [sessTime, setSessTime] = useState('09:00');
  const [sessCapacity, setSessCapacity] = useState('10');

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
          <label className="block text-sm sm:col-span-2">
            <span className="text-zinc-500">Photo URLs (one per line)</span>
            <textarea
              value={photos}
              onChange={(e) => setPhotos(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
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
          className="mt-4 rounded-lg bg-[#3F3287] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Save profile
        </button>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="font-medium">Trainings ({trainings.length})</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {trainings.map((t) => (
            <li key={t.id}>
              {t.name} · {t.duration}min · {t.price}
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <input
            placeholder="Name"
            value={trName}
            onChange={(e) => setTrName(e.target.value)}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
          <input
            placeholder="Duration (min)"
            value={trDuration}
            onChange={(e) => setTrDuration(e.target.value)}
            className="w-28 rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
          <input
            placeholder="Price"
            value={trPrice}
            onChange={(e) => setTrPrice(e.target.value)}
            className="w-24 rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={saving || !trName.trim()}
            onClick={() =>
              void onCreateTraining({
                name: trName.trim(),
                duration: Number(trDuration) || 60,
                price: Number(trPrice) || 0,
              })
            }
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
          >
            Add training
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="font-medium">Trainers ({trainers.length})</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {trainers.map((t) => (
            <li key={t.id}>
              {t.name} · {t.accessLevel}
              {t.email ? ` · ${t.email}` : ''}
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <input
            placeholder="Name"
            value={trainerName}
            onChange={(e) => setTrainerName(e.target.value)}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
          <input
            placeholder="Email (optional)"
            value={trainerEmail}
            onChange={(e) => setTrainerEmail(e.target.value)}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={saving || !trainerName.trim()}
            onClick={() =>
              void onCreateTrainer({
                name: trainerName.trim(),
                email: trainerEmail.trim() || undefined,
                accessLevel: 'EMPLOYEE',
              })
            }
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
          >
            Add trainer
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="font-medium">Recurring sessions</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Create weekly class slots for a training
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <select
            value={sessTrainingId}
            onChange={(e) => setSessTrainingId(e.target.value)}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          >
            <option value="">Select training</option>
            {trainings.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <input
            placeholder="Days 1=Mon (1,3,5)"
            value={sessDays}
            onChange={(e) => setSessDays(e.target.value)}
            className="w-40 rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
          <input
            placeholder="Start time"
            value={sessTime}
            onChange={(e) => setSessTime(e.target.value)}
            className="w-24 rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
          <input
            placeholder="Capacity"
            value={sessCapacity}
            onChange={(e) => setSessCapacity(e.target.value)}
            className="w-20 rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={saving || !sessTrainingId}
            onClick={() => {
              const daysOfWeek = sessDays
                .split(',')
                .map((d) => Number(d.trim()))
                .filter((d) => d >= 1 && d <= 7);
              void onCreateSessions({
                studioId: studio.id,
                trainingId: sessTrainingId,
                capacity: Number(sessCapacity) || 10,
                daysOfWeek,
                startTime: sessTime,
                weeksCount: 4,
              });
            }}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
          >
            Create sessions
          </button>
        </div>
      </section>
    </div>
  );
}

function SubscriptionTab({
  subscription,
  saving,
  onSave,
}: {
  subscription: NonNullable<AdminStudioDetail['Subscription']>;
  saving: boolean;
  onSave: (body: {
    type?: string;
    status?: string;
    currentPeriodEnd?: string | null;
    manualOverride?: boolean;
  }) => Promise<void>;
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
        className="rounded-lg bg-[#3F3287] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        Save subscription
      </button>
    </div>
  );
}
