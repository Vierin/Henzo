'use client';

import { useQuery } from '@tanstack/react-query';
import { SettingsSubpageShell } from '@/components/owner/settingsSubpageShell';
import {
  fetchOwnerSubscription,
  fetchOwnerUsage,
  planBadgeLabel,
} from '@/lib/owner/fetch-subscription';
import { ownerTheme } from '@/lib/owner/owner-theme';

export default function SubscriptionSettingsPage() {
  const subQuery = useQuery({
    queryKey: ['owner-subscription'],
    queryFn: fetchOwnerSubscription,
  });
  const usageQuery = useQuery({
    queryKey: ['owner-usage'],
    queryFn: fetchOwnerUsage,
  });

  const plan = planBadgeLabel(subQuery.data ?? null);
  const usage = usageQuery.data;

  return (
    <SettingsSubpageShell title="Subscription & billing">
      <div className="rounded-[14px] bg-white px-4 py-4">
        <p
          className="text-xs font-medium uppercase tracking-wide"
          style={{ color: ownerTheme.textSecondary }}
        >
          Current plan
        </p>
        <p
          className="mt-1 text-xl font-bold"
          style={{ color: ownerTheme.text }}
        >
          {plan}
        </p>
        {subQuery.data?.status ? (
          <p
            className="mt-1 text-sm capitalize"
            style={{ color: ownerTheme.textSecondary }}
          >
            Status: {subQuery.data.status}
          </p>
        ) : null}
      </div>

      {(usage?.classesLimit != null || usage?.trainersLimit != null) && (
        <div className="space-y-2">
          {usage.classesLimit != null ? (
            <div className="rounded-[14px] bg-white px-4 py-3.5 text-sm">
              <span style={{ color: ownerTheme.textSecondary }}>
                Classes this month{' '}
              </span>
              <span
                className="font-semibold"
                style={{ color: ownerTheme.text }}
              >
                {usage.classesUsed}/{usage.classesLimit}
              </span>
            </div>
          ) : null}
          {usage.trainersLimit != null ? (
            <div className="rounded-[14px] bg-white px-4 py-3.5 text-sm">
              <span style={{ color: ownerTheme.textSecondary }}>Trainers </span>
              <span
                className="font-semibold"
                style={{ color: ownerTheme.text }}
              >
                {usage.trainersUsed}/{usage.trainersLimit}
              </span>
            </div>
          ) : null}
        </div>
      )}

      <p className="text-sm" style={{ color: ownerTheme.textSecondary }}>
        Plan upgrades and billing portal open from the Henzo app / Stripe
        checkout.
      </p>
    </SettingsSubpageShell>
  );
}
