'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminGuard } from '@/components/admin/admin-guard';
import { AdminTable } from '@/components/admin/admin-table';
import { fetchAdminSubscriptions } from '@/lib/admin/api';

function SubscriptionsContent() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetchAdminSubscriptions({
        page,
        limit: 20,
        status: status || undefined,
        type: type || undefined,
      });
      setRows(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load subscriptions');
    }
  }, [page, status, type]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Subscriptions</h1>
      <div className="mt-4 flex flex-wrap gap-2">
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
          <option value="INACTIVE">INACTIVE</option>
          <option value="CANCELLED">CANCELLED</option>
          <option value="EXPIRED">EXPIRED</option>
        </select>
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
        >
          <option value="">All types</option>
          <option value="SOLO">Solo</option>
          <option value="STUDIO">Studio</option>
          <option value="ENTERPRISE">Enterprise</option>
        </select>
      </div>
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      <div className="mt-6">
        <AdminTable
          rows={rows}
          columns={[
            {
              key: 'studio',
              header: 'Studio',
              render: (r) => {
                const s = r.Studio as { name?: string } | undefined;
                return s?.name ?? '—';
              },
            },
            {
              key: 'type',
              header: 'Type',
              render: (r) => String(r.type ?? ''),
            },
            {
              key: 'status',
              header: 'Status',
              render: (r) => String(r.status ?? ''),
            },
            {
              key: 'end',
              header: 'Period end',
              render: (r) => {
                const cpe = r.currentPeriodEnd as string | null;
                return cpe ? new Date(cpe).toLocaleDateString() : '—';
              },
            },
            {
              key: 'override',
              header: 'Override',
              render: (r) =>
                r.manualOverride ? (
                  <span className="text-xs text-amber-700">Manual</span>
                ) : (
                  '—'
                ),
            },
            {
              key: 'link',
              header: '',
              render: (r) => {
                const studio = r.Studio as { id?: string } | undefined;
                return studio?.id ? (
                  <a
                    href={`/en/admin/studios/${studio.id}?tab=subscription`}
                    className="text-sm text-primary hover:underline"
                  >
                    Open
                  </a>
                ) : (
                  '—'
                );
              },
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

export default function AdminSubscriptionsPage() {
  return (
    <AdminGuard>
      <SubscriptionsContent />
    </AdminGuard>
  );
}
