'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AdminTable } from '@/components/admin/admin-table';
import {
  fetchAdminDirectoryClients,
  fetchAdminDirectoryTrainers,
  fetchAdminOwners,
} from '@/lib/admin/api';
import type {
  AdminDirectoryClientRow,
  AdminDirectoryTrainerRow,
  AdminOwnerRow,
  ClientActivityTier,
} from '@/lib/admin/types';
import { formatAdminDate } from '@/lib/admin/dateTimeFormat';
import { extractLocaleFromPath, withLocale } from '@/i18n/routing';

type PeopleTab = 'clients' | 'owners' | 'trainers';

const TABS: { id: PeopleTab; label: string }[] = [
  { id: 'clients', label: 'Clients' },
  { id: 'owners', label: 'Owners' },
  { id: 'trainers', label: 'Trainers' },
];

function formatOnboardingGap(gap: string): string {
  if (gap === 'hasTraining') return 'No training';
  if (gap === 'hasPhoto') return 'No photo';
  if (gap === 'hasStudioDetails') return 'No details';
  if (gap === 'noStudio') return 'No studio';
  return gap;
}

function formatLastVisit(iso: string | null): string {
  if (!iso) return 'Never';
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000));
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  return formatAdminDate(d);
}

function ClientActivityBadge({ tier }: { tier: ClientActivityTier }) {
  const map: Record<ClientActivityTier, { label: string; className: string }> =
    {
      active: {
        label: 'Active (7d)',
        className: 'bg-emerald-50 text-emerald-700',
      },
      warming: {
        label: 'Warming (8–30d)',
        className: 'bg-amber-50 text-amber-700',
      },
      sleeping: {
        label: 'Sleeping (30d+)',
        className: 'bg-zinc-100 text-zinc-600',
      },
      never: {
        label: 'Never visited',
        className: 'bg-red-50 text-red-600',
      },
    };
  const conf = map[tier];
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${conf.className}`}
    >
      {conf.label}
    </span>
  );
}

export default function AdminClientsPage() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = extractLocaleFromPath(pathname) ?? 'en';

  const initialTab = searchParams.get('tab');
  const [tab, setTab] = useState<PeopleTab>(
    initialTab === 'owners' ||
      initialTab === 'trainers' ||
      initialTab === 'clients'
      ? initialTab
      : 'clients',
  );
  const [search, setSearch] = useState('');
  const [onboarding, setOnboarding] = useState<'' | 'complete' | 'incomplete'>(
    '',
  );
  const [activityTier, setActivityTier] = useState('');
  const [hideAnonymous, setHideAnonymous] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [owners, setOwners] = useState<AdminOwnerRow[]>([]);
  const [clients, setClients] = useState<AdminDirectoryClientRow[]>([]);
  const [trainers, setTrainers] = useState<AdminDirectoryTrainerRow[]>([]);

  const selectTab = (next: PeopleTab) => {
    setTab(next);
    setPage(1);
    setError(null);
    const q = new URLSearchParams(searchParams.toString());
    q.set('tab', next);
    router.replace(`${pathname}?${q.toString()}`);
  };

  const load = useCallback(async () => {
    setError(null);
    try {
      if (tab === 'owners') {
        const res = await fetchAdminOwners({
          page,
          limit: 20,
          search: search || undefined,
          onboarding: onboarding || undefined,
        });
        setOwners(res.items);
        setTotal(res.total);
        return;
      }
      if (tab === 'trainers') {
        const res = await fetchAdminDirectoryTrainers({
          page,
          limit: 20,
          search: search || undefined,
        });
        setTrainers(res.items);
        setTotal(res.total);
        return;
      }
      const res = await fetchAdminDirectoryClients({
        page,
        limit: 20,
        search: search || undefined,
        activityTier: activityTier || undefined,
        hideAnonymous,
      });
      setClients(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    }
  }, [tab, page, search, onboarding, activityTier, hideAnonymous]);

  useEffect(() => {
    void load();
  }, [load]);

  const studioHref = useMemo(
    () => (studioId: string) =>
      withLocale(`/admin/studios/${studioId}`, locale),
    [locale],
  );

  return (
    <div>
      <h1 className="text-2xl font-semibold">Clients</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Directory of clients, owners, and trainers across all studios.
      </p>

      <div className="mt-4 flex flex-wrap gap-2 border-b border-zinc-200 pb-0">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => selectTab(item.id)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${
              tab === item.id
                ? 'border-primary text-primary'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          type="search"
          placeholder={
            tab === 'owners'
              ? 'Search owner email, name, studio'
              : tab === 'trainers'
                ? 'Search trainer, email, studio'
                : 'Search client name, email, phone'
          }
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
        />
        {tab === 'owners' ? (
          <select
            value={onboarding}
            onChange={(e) => {
              setOnboarding(e.target.value as '' | 'complete' | 'incomplete');
              setPage(1);
            }}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          >
            <option value="">All onboarding</option>
            <option value="complete">Onboarding complete</option>
            <option value="incomplete">Onboarding incomplete</option>
          </select>
        ) : null}
        {tab === 'clients' ? (
          <>
            <select
              value={activityTier}
              onChange={(e) => {
                setActivityTier(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            >
              <option value="">All activity</option>
              <option value="active">Active (7d)</option>
              <option value="warming">Warming (8–30d)</option>
              <option value="sleeping">Sleeping (30d+)</option>
              <option value="never">Never visited</option>
            </select>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={hideAnonymous}
                onChange={(e) => {
                  setHideAnonymous(e.target.checked);
                  setPage(1);
                }}
                className="h-4 w-4 rounded border-zinc-300 text-primary focus:ring-primary"
              />
              Hide anonymous
            </label>
          </>
        ) : null}
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <div className="mt-6">
        {tab === 'clients' ? (
          <AdminTable
            rows={clients}
            columns={[
              {
                key: 'name',
                header: 'Client',
                render: (r) => (
                  <div>
                    <div className="font-medium">{r.name || '—'}</div>
                    <div className="text-xs text-zinc-500">{r.email}</div>
                  </div>
                ),
              },
              {
                key: 'phone',
                header: 'Phone',
                render: (r) => r.phone || '—',
              },
              {
                key: 'bookings',
                header: 'Bookings',
                render: (r) => r.bookingsCount,
              },
              {
                key: 'studios',
                header: 'Studios',
                render: (r) => r.studiosCount,
              },
              {
                key: 'lastVisit',
                header: 'Last visit',
                render: (r) => formatLastVisit(r.lastVisitAt),
              },
              {
                key: 'activity',
                header: 'Activity',
                render: (r) => <ClientActivityBadge tier={r.activityTier} />,
              },
              {
                key: 'location',
                header: 'Location',
                render: (r) => {
                  const city = r.city?.trim();
                  const country = r.country?.trim();
                  if (!city && !country) {
                    return <span className="text-xs text-zinc-400">—</span>;
                  }
                  return (
                    <span className="text-xs text-zinc-700">
                      {[city, country].filter(Boolean).join(', ')}
                    </span>
                  );
                },
              },
            ]}
          />
        ) : null}

        {tab === 'owners' ? (
          <AdminTable
            rows={owners}
            columns={[
              {
                key: 'owner',
                header: 'Owner',
                render: (r) => (
                  <div>
                    <div className="font-medium">{r.ownerName || '—'}</div>
                    <div className="text-xs text-zinc-500">{r.ownerEmail}</div>
                  </div>
                ),
              },
              {
                key: 'phone',
                header: 'Phone',
                render: (r) => r.ownerPhone || '—',
              },
              {
                key: 'studio',
                header: 'Studio',
                render: (r) => {
                  if (!r.studioId || !r.studioName) {
                    return <span className="text-zinc-400">No studio yet</span>;
                  }
                  if (r.onboardingComplete) {
                    return (
                      <Link
                        href={studioHref(r.studioId)}
                        className="font-medium text-primary hover:underline"
                      >
                        {r.studioName}
                      </Link>
                    );
                  }
                  return <span className="text-zinc-700">{r.studioName}</span>;
                },
              },
              {
                key: 'status',
                header: 'Studio status',
                render: (r) => r.studioStatus || '—',
              },
              {
                key: 'onboarding',
                header: 'Onboarding',
                render: (r) =>
                  r.onboardingComplete && r.studioId ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="text-emerald-600">Complete</span>
                      <Link
                        href={studioHref(r.studioId)}
                        className="text-sm text-primary hover:underline"
                      >
                        Open studio
                      </Link>
                    </span>
                  ) : (
                    <span className="text-amber-600">
                      Incomplete
                      {r.onboardingGaps.length > 0
                        ? `: ${r.onboardingGaps.map(formatOnboardingGap).join(', ')}`
                        : ''}
                    </span>
                  ),
              },
            ]}
          />
        ) : null}

        {tab === 'trainers' ? (
          <AdminTable
            rows={trainers}
            columns={[
              {
                key: 'name',
                header: 'Trainer',
                render: (r) => (
                  <div>
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-zinc-500">
                      {r.email || '—'}
                    </div>
                  </div>
                ),
              },
              {
                key: 'phone',
                header: 'Phone',
                render: (r) => r.phone || '—',
              },
              {
                key: 'access',
                header: 'Access',
                render: (r) => r.accessLevel,
              },
              {
                key: 'linked',
                header: 'Account',
                render: (r) =>
                  r.hasLinkedUser ? (
                    <span className="text-emerald-600">Linked</span>
                  ) : (
                    <span className="text-zinc-400">No user</span>
                  ),
              },
              {
                key: 'studio',
                header: 'Studio',
                render: (r) => (
                  <Link
                    href={studioHref(r.studioId)}
                    className="text-primary hover:underline"
                  >
                    {r.studioName}
                  </Link>
                ),
              },
            ]}
          />
        ) : null}
      </div>

      <p className="mt-4 text-sm text-zinc-500">
        {total} total · page {page}
      </p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm disabled:opacity-40"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={page * 20 >= total}
          onClick={() => setPage((p) => p + 1)}
          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
