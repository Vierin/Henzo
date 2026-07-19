'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AdminTable } from '@/components/admin/admin-table';
import { fetchAdminFeedback, patchAdminFeedback } from '@/lib/admin/api';
import type { AdminFeedbackRow } from '@/lib/admin/types';

const statusOptions = [
  { value: '', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
];

export default function FeedbackContent() {
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<AdminFeedbackRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState(searchParams.get('status') ?? 'open');
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetchAdminFeedback({
        page,
        limit: 20,
        status: status || undefined,
      });
      setRows(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load feedback');
    }
  }, [page, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateRow = async (
    id: string,
    patch: { status?: string; adminNote?: string },
  ) => {
    setSavingId(id);
    setError(null);
    try {
      await patchAdminFeedback(id, patch);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold">Feedback</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Mobile app feedback and web contact form
      </p>
      <div className="mt-4">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
        >
          {statusOptions.map((o) => (
            <option key={o.value || 'all'} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      <div className="mt-6 space-y-4">
        {rows.map((row) => (
          <article
            key={row.id}
            className="rounded-lg border border-zinc-200 bg-white p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">{row.name}</p>
                <p className="text-sm text-zinc-500">{row.email}</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <span className="rounded bg-zinc-100 px-2 py-0.5">
                  {row.source}
                </span>
                <span>{new Date(row.createdAt).toLocaleString()}</span>
              </div>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm">{row.message}</p>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <label className="text-sm">
                <span className="text-zinc-500">Status</span>
                <select
                  value={row.status}
                  disabled={savingId === row.id}
                  onChange={(e) =>
                    void updateRow(row.id, { status: e.target.value })
                  }
                  className="ml-2 rounded border border-zinc-200 px-2 py-1 text-sm"
                >
                  <option value="open">open</option>
                  <option value="in_progress">in_progress</option>
                  <option value="resolved">resolved</option>
                </select>
              </label>
            </div>
            {row.adminNote ? (
              <p className="mt-2 text-xs text-zinc-500">
                Note: {row.adminNote}
              </p>
            ) : null}
          </article>
        ))}
        {rows.length === 0 ? (
          <p className="text-sm text-zinc-500">No feedback in this filter.</p>
        ) : null}
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
