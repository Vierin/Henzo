'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminGuard } from '@/components/admin/admin-guard';
import { AdminTable } from '@/components/admin/admin-table';
import { fetchAdminNoShowClients } from '@/lib/admin/api';
import type { AdminNoShowClientRow } from '@/lib/admin/types';

function NoShowsContent() {
  const [rows, setRows] = useState<AdminNoShowClientRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [minNoShows, setMinNoShows] = useState(3);
  const [days, setDays] = useState(90);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetchAdminNoShowClients({
        page,
        limit: 20,
        minNoShows,
        days,
      });
      setRows(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load no-shows');
    } finally {
      setLoading(false);
    }
  }, [page, minNoShows, days]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground">
        Chronic no-shows
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Clients who repeatedly miss visits, grouped per studio
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Min no-shows
          <select
            value={minNoShows}
            onChange={(e) => {
              setMinNoShows(Number(e.target.value));
              setPage(1);
            }}
            className="rounded-lg border border-border px-3 py-2 text-sm text-foreground"
          >
            {[2, 3, 5, 10].map((n) => (
              <option key={n} value={n}>
                {n}+
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Window
          <select
            value={days}
            onChange={(e) => {
              setDays(Number(e.target.value));
              setPage(1);
            }}
            className="rounded-lg border border-border px-3 py-2 text-sm text-foreground"
          >
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
            <option value={180}>180 days</option>
            <option value={365}>365 days</option>
          </select>
        </label>
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      {loading ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
      ) : null}

      {!loading && rows.length === 0 && !error ? (
        <p className="mt-6 text-sm text-muted-foreground">
          No clients match this threshold. Lower the minimum or widen the
          window.
        </p>
      ) : null}

      {rows.length > 0 ? (
        <div className="mt-6">
          <AdminTable
            rows={rows}
            columns={[
              {
                key: 'client',
                header: 'Client',
                render: (r) => (
                  <div>
                    <p className="font-medium">{r.clientName ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.clientEmail}
                      {r.clientPhone ? ` · ${r.clientPhone}` : ''}
                    </p>
                  </div>
                ),
              },
              {
                key: 'studio',
                header: 'Studio',
                render: (r) => (
                  <Link
                    href={`/en/admin/studios/${r.studioId}`}
                    className="text-primary hover:underline"
                  >
                    {r.studioName}
                  </Link>
                ),
              },
              {
                key: 'count',
                header: 'No-shows',
                render: (r) => (
                  <span className="font-semibold text-red-600">
                    {r.noShowCount}
                  </span>
                ),
              },
              {
                key: 'last',
                header: 'Last no-show',
                render: (r) => new Date(r.lastNoShowAt).toLocaleDateString(),
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

export default function AdminNoShowsPage() {
  return (
    <AdminGuard>
      <NoShowsContent />
    </AdminGuard>
  );
}
