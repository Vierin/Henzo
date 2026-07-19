'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AdminTable } from '@/components/admin/admin-table';
import {
  ActivityTierBadge,
  formatLastActive,
} from '@/components/admin/activityTierBadge';
import { fetchAdminStudios } from '@/lib/admin/api';
import type { AdminStudioRow } from '@/lib/admin/types';

export default function StudiosContent() {
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<AdminStudioRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [activityTier, setActivityTier] = useState(
    searchParams.get('activityTier') ?? '',
  );
  const [onboardingIncomplete, setOnboardingIncomplete] = useState(
    searchParams.get('onboardingIncomplete') === 'true',
  );
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetchAdminStudios({
        page,
        limit: 20,
        search: search || undefined,
        status: status || undefined,
        activityTier: activityTier || undefined,
        onboardingIncomplete: onboardingIncomplete || undefined,
      });
      setRows(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load studios');
    }
  }, [page, search, status, activityTier, onboardingIncomplete]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Studios</h1>
      <div className="mt-4 flex flex-wrap gap-2">
        <input
          type="search"
          placeholder="Search name, slug, owner email"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="READY">READY</option>
          <option value="DRAFT">DRAFT</option>
        </select>
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
          <option value="never_used">Never used</option>
          <option value="draft">Draft / Ready</option>
        </select>
        <label className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm">
          <input
            type="checkbox"
            checked={onboardingIncomplete}
            onChange={(e) => {
              setOnboardingIncomplete(e.target.checked);
              setPage(1);
            }}
          />
          Onboarding incomplete
        </label>
      </div>
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      <div className="mt-6">
        <AdminTable
          rows={rows}
          columns={[
            {
              key: 'name',
              header: 'Name',
              render: (r) => (
                <Link
                  href={`/en/admin/studios/${r.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {r.name}
                </Link>
              ),
            },
            {
              key: 'activity',
              header: 'Activity',
              render: (r) => <ActivityTierBadge tier={r.activityTier} />,
            },
            {
              key: 'lastActive',
              header: 'Last active',
              render: (r) => formatLastActive(r.lastActivityAt),
            },
            {
              key: 'status',
              header: 'Status',
              render: (r) => r.status,
            },
            {
              key: 'owner',
              header: 'Owner',
              render: (r) => r.User.email,
            },
            {
              key: 'clients',
              header: 'Clients',
              render: (r) => r.clientsCount,
            },
            {
              key: 'onboarding',
              header: 'Onboarding',
              render: (r) =>
                r.onboardingGaps.length === 0 ? (
                  <span className="text-emerald-600">Complete</span>
                ) : (
                  <span className="text-amber-600">
                    {r.onboardingGaps
                      .map((g) =>
                        g === 'hasTraining' ? 'No training' : 'No photo',
                      )
                      .join(', ')}
                  </span>
                ),
            },
            {
              key: 'usage',
              header: '30d bookings / sessions',
              render: (r) => `${r.bookingsLast30d} / ${r.sessionsLast30d}`,
            },
            {
              key: 'sub',
              header: 'Subscription',
              render: (r) =>
                r.Subscription
                  ? `${r.Subscription.type} / ${r.Subscription.status}`
                  : '—',
            },
          ]}
        />
      </div>
      <p className="mt-4 text-sm text-zinc-500">
        {total} total · page {page}
      </p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
          className="rounded border px-3 py-1 text-sm disabled:opacity-40"
        >
          Prev
        </button>
        <button
          type="button"
          disabled={page * 20 >= total}
          onClick={() => setPage((p) => p + 1)}
          className="rounded border px-3 py-1 text-sm disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
