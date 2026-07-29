'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AdminTable } from '@/components/admin/admin-table';
import {
  ActivityTierBadge,
  formatLastActive,
} from '@/components/admin/activityTierBadge';
import { createAdminUnclaimedStudio, fetchAdminStudios } from '@/lib/admin/api';
import type { AdminStudioRow } from '@/lib/admin/types';

export default function StudiosContent() {
  const router = useRouter();
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
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    intendedOwnerEmail: '',
    address: '',
    phone: '',
    sendClaimEmail: false,
  });

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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);
    try {
      const created = await createAdminUnclaimedStudio({
        name: form.name.trim(),
        intendedOwnerEmail: form.intendedOwnerEmail.trim(),
        address: form.address.trim() || undefined,
        phone: form.phone.trim() || undefined,
        sendClaimEmail: form.sendClaimEmail,
      });
      setShowCreate(false);
      setForm({
        name: '',
        intendedOwnerEmail: '',
        address: '',
        phone: '',
        sendClaimEmail: false,
      });
      router.push(`/en/admin/studios/${created.id}`);
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : 'Failed to create studio',
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Studios</h1>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Create unclaimed studio
        </button>
      </div>

      {showCreate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={handleCreate}
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
          >
            <h2 className="text-lg font-semibold">Create unclaimed studio</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Studio is owned by the system until the real owner claims it via
              email.
            </p>
            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Studio name *</span>
                <input
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium">
                  Intended owner email *
                </span>
                <input
                  required
                  type="email"
                  value={form.intendedOwnerEmail}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      intendedOwnerEmail: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Address</span>
                <input
                  value={form.address}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, address: e.target.value }))
                  }
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Phone</span>
                <input
                  value={form.phone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.sendClaimEmail}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      sendClaimEmail: e.target.checked,
                    }))
                  }
                />
                Send claim email now (otherwise on first booking)
              </label>
            </div>
            {createError ? (
              <p className="mt-3 text-sm text-red-600">{createError}</p>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={creating}
                onClick={() => setShowCreate(false)}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {creating ? 'Creating…' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          type="search"
          placeholder="Search name, slug, owner / intended email"
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
                  {r.isUnclaimed ? (
                    <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">
                      Unclaimed
                    </span>
                  ) : null}
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
              render: (r) =>
                r.isUnclaimed && r.intendedOwnerEmail ? (
                  <span className="text-amber-700">
                    → {r.intendedOwnerEmail}
                  </span>
                ) : (
                  r.User.email
                ),
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
