'use client';

import { useEffect, useState } from 'react';
import { fetchStudioAnalytics } from '@/lib/owner/api';
import type { StudioAnalytics } from '@/lib/owner/types';

export default function OwnerAnalyticsPage() {
  const [data, setData] = useState<StudioAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const to = new Date();
    const from = new Date(to.getTime() - 30 * 86400000);
    void fetchStudioAnalytics(from.toISOString(), to.toISOString())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-zinc-500">Loading…</p>;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#3F3F3F]">Reports</h1>
      <p className="mt-1 text-sm text-zinc-500">Last 30 days</p>
      {!data ? (
        <p className="mt-6 text-sm text-zinc-500">
          Analytics unavailable. Upgrade your plan or complete studio setup.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-[#EDE9F6] p-5">
            <p className="text-sm text-zinc-600">Bookings</p>
            <p className="text-3xl font-semibold">{data.totalBookings}</p>
          </div>
          <div className="rounded-2xl bg-[#FAD0C5] p-5">
            <p className="text-sm text-zinc-600">Clients</p>
            <p className="text-3xl font-semibold">{data.totalClients}</p>
          </div>
          <div className="rounded-2xl bg-[#E8F5D0] p-5">
            <p className="text-sm text-zinc-600">Completion</p>
            <p className="text-3xl font-semibold">
              {data.completionRate != null
                ? `${Math.round(data.completionRate)}%`
                : '—'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
