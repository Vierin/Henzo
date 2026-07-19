'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminTable } from '@/components/admin/admin-table';
import { fetchAdminPaymentEvents } from '@/lib/admin/api';
import type { AdminPaymentEventRow } from '@/lib/admin/types';

const typeLabels: Record<string, string> = {
  subscription_failed: 'Subscription failed',
  revenuecat_webhook_error: 'Webhook error',
};

export default function PaymentsContent() {
  const [rows, setRows] = useState<AdminPaymentEventRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetchAdminPaymentEvents({
        page,
        limit: 20,
        from: from ? `${from}T00:00:00.000Z` : undefined,
        to: to ? `${to}T23:59:59.999Z` : undefined,
      });
      setRows(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [page, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground">Payment issues</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Failed subscriptions and RevenueCat webhook errors
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          From
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-border px-3 py-2 text-sm text-foreground"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          To
          <input
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-border px-3 py-2 text-sm text-foreground"
          />
        </label>
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      {loading ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
      ) : null}
      {!loading && rows.length === 0 && !error ? (
        <p className="mt-6 text-sm text-muted-foreground">
          No payment errors in this period.
        </p>
      ) : null}

      {rows.length > 0 ? (
        <div className="mt-6">
          <AdminTable
            rows={rows}
            columns={[
              {
                key: 'date',
                header: 'Date',
                render: (r) => new Date(r.createdAt).toLocaleString(),
              },
              {
                key: 'type',
                header: 'Type',
                render: (r) => (
                  <span
                    className={
                      r.severity === 'error'
                        ? 'font-medium text-red-600'
                        : 'font-medium text-amber-600'
                    }
                  >
                    {typeLabels[r.type] ?? r.type}
                  </span>
                ),
              },
              {
                key: 'studio',
                header: 'Studio',
                render: (r) =>
                  r.studioId ? (
                    <Link
                      href={`/en/admin/studios/${r.studioId}?tab=subscription`}
                      className="text-primary hover:underline"
                    >
                      {r.studioName ?? r.studioId}
                    </Link>
                  ) : (
                    '—'
                  ),
              },
              {
                key: 'owner',
                header: 'Owner',
                render: (r) => r.ownerEmail ?? '—',
              },
              {
                key: 'message',
                header: 'Details',
                render: (r) => (
                  <div className="max-w-md">
                    <p className="truncate">{r.message ?? '—'}</p>
                    {r.metadata ? (
                      <button
                        type="button"
                        onClick={() =>
                          setExpanded(expanded === r.id ? null : r.id)
                        }
                        className="mt-1 text-xs text-primary hover:underline"
                      >
                        {expanded === r.id ? 'Hide metadata' : 'Show metadata'}
                      </button>
                    ) : null}
                    {expanded === r.id && r.metadata ? (
                      <pre className="mt-2 max-h-48 overflow-auto rounded bg-secondary/40 p-2 text-xs">
                        {JSON.stringify(r.metadata, null, 2)}
                      </pre>
                    ) : null}
                  </div>
                ),
              },
            ]}
          />
        </div>
      ) : null}

      <p className="mt-4 text-sm text-muted-foreground">
        {total} total · page {page}
      </p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
          className="rounded border border-border px-3 py-1 text-sm disabled:opacity-40"
        >
          Prev
        </button>
        <button
          type="button"
          disabled={page * 20 >= total}
          onClick={() => setPage((p) => p + 1)}
          className="rounded border border-border px-3 py-1 text-sm disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
