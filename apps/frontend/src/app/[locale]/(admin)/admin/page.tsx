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
      <p className="mt-1 text-sm text-zinc-500">
        Owner engagement & platform health
      </p>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-zinc-500">
        Owner activity
      </h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Active owners (7d)"
          value={data.ownersActive7d}
          hint="Booking or session activity in last 7 days"
        />
        <KpiCard label="Warming (8–30d)" value={data.ownersWarming30d} />
        <KpiCard
          label="Sleeping (30d+)"
          value={data.ownersSleeping30d}
          hint="Published studio, no recent activity"
        />
        <KpiCard
          label="Never used"
          value={data.ownersNeverUsed}
          hint="ACTIVE but zero bookings/sessions"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/en/admin/studios?activityTier=active"
          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50"
        >
          View active →
        </Link>
        <Link
          href="/en/admin/studios?activityTier=sleeping"
          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50"
        >
          View sleeping →
        </Link>
        <Link
          href="/en/admin/studios?activityTier=never_used"
          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50"
        >
          View never used →
        </Link>
      </div>

      <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-zinc-500">
        Growth
      </h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard label="Bookings (7d)" value={data.bookingsLast7d} />
        <KpiCard label="New studios (30d)" value={data.newStudiosLast30d} />
        <KpiCard
          label="Open feedback"
          value={data.openFeedbackCount}
          hint="Mobile + web contact inbox"
        />
      </div>
      {data.openFeedbackCount > 0 ? (
        <Link
          href="/en/admin/feedback?status=open"
          className="mt-3 inline-block text-sm text-[#3F3287] hover:underline"
        >
          View open feedback →
        </Link>
      ) : null}

      <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-zinc-500">
        Platform
      </h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          label="Published studios"
          value={data.publishedStudios}
          hint="StudioStatus.ACTIVE"
        />
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
