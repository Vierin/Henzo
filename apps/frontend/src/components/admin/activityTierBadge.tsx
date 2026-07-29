import type { ActivityTier } from '@/lib/admin/types';
import { formatAdminDate } from '@/lib/admin/dateTimeFormat';

const tierStyles: Record<ActivityTier, string> = {
  active: 'bg-emerald-100 text-emerald-800',
  warming: 'bg-amber-100 text-amber-800',
  sleeping: 'bg-orange-100 text-orange-800',
  never_used: 'bg-zinc-200 text-zinc-700',
  draft: 'bg-slate-100 text-slate-600',
};

const tierLabels: Record<ActivityTier, string> = {
  active: 'Active',
  warming: 'Warming',
  sleeping: 'Sleeping',
  never_used: 'Never used',
  draft: 'Draft',
};

export function ActivityTierBadge({ tier }: { tier: ActivityTier }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tierStyles[tier]}`}
    >
      {tierLabels[tier]}
    </span>
  );
}

export function formatLastActive(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days === 0) return 'Today';
  if (days === 1) return '1d ago';
  if (days < 30) return `${days}d ago`;
  return formatAdminDate(d);
}
