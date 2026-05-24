'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminGuard } from '@/components/admin/admin-guard';
import { AdminTable } from '@/components/admin/admin-table';
import { fetchAdminNotifications } from '@/lib/admin/api';

function NotificationsContent() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [type, setType] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetchAdminNotifications({
        page,
        limit: 30,
        type: type || undefined,
      });
      setRows(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load notifications');
    }
  }, [page, type]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Notifications</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Failed push and email reminder deliveries
      </p>
      <div className="mt-4">
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
        >
          <option value="">All failure types</option>
          <option value="push_failed">push_failed</option>
          <option value="email_reminder_failed">email_reminder_failed</option>
        </select>
      </div>
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      <div className="mt-6">
        <AdminTable
          rows={rows}
          columns={[
            {
              key: 'type',
              header: 'Type',
              render: (r) => String(r.type ?? ''),
            },
            {
              key: 'severity',
              header: 'Severity',
              render: (r) => String(r.severity ?? ''),
            },
            {
              key: 'message',
              header: 'Message',
              render: (r) => String(r.message ?? '—'),
            },
            {
              key: 'at',
              header: 'When',
              render: (r) => new Date(String(r.createdAt)).toLocaleString(),
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
          disabled={page * 30 >= total}
          onClick={() => setPage((p) => p + 1)}
          className="rounded border px-3 py-1 text-sm disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default function AdminNotificationsPage() {
  return (
    <AdminGuard>
      <NotificationsContent />
    </AdminGuard>
  );
}
