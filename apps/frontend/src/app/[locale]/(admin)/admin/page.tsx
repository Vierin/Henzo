'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminGuard } from '@/components/admin/admin-guard';
import { KpiCard } from '@/components/admin/kpi-card';
import { fetchAdminOverview } from '@/lib/admin/api';
import type { AdminOverview } from '@/lib/admin/types';

function OverviewContent() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminOverview()
      .then(setData)
      .catch((e) =>
        setError(e instanceof Error ? e.message : 'Failed to load overview'),
      );
  }, []);

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!data) {
    return <p className="text-sm text-zinc-500">Loading overview…</p>;
  }

  const crashDisplay =
    data.crashFreeRate7d != null ? `${data.crashFreeRate7d.toFixed(2)}%` : '—';

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Overview</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard label="Active studios" value={data.activeStudios} />
        <KpiCard
          label="Today bookings"
          value={data.todayBookings}
          hint="Asia/Ho_Chi_Minh calendar day"
        />
        <KpiCard
          label="Failed notifications (24h)"
          value={data.failedNotifications24h}
        />
        <KpiCard label="Failed payments (24h)" value={data.failedPayments24h} />
        <KpiCard
          label="Crash-free rate (7d)"
          value={crashDisplay}
          hint="From env or latest snapshot"
        />
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        {data.links.crashlytics ? (
          <Link
            href={data.links.crashlytics}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50"
          >
            Open Crashlytics
          </Link>
        ) : null}
        {data.links.sentry ? (
          <Link
            href={data.links.sentry}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50"
          >
            Open Sentry
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export default function AdminOverviewPage() {
  return (
    <AdminGuard>
      <OverviewContent />
    </AdminGuard>
  );
}
