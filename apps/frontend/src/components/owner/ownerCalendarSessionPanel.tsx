'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowRight, Globe, MapPin, UserRound } from 'lucide-react';
import type { OwnerTrainingSession } from '@/lib/owner/types';
import { ownerTheme } from '@/lib/owner/owner-theme';
import {
  formatOwnerDateShort,
  formatOwnerTime24h,
  isPlaceholderTrainerName,
  trainingLanguageLabel,
} from '@/lib/owner/format-time';
import {
  OwnerSessionEditScopeModal,
  type OwnerSessionEditScope,
} from '@/components/owner/ownerSessionEditScopeModal';
import { extractLocaleFromPath, type Locale } from '@/i18n/routing';

function categoryLabel(session: OwnerTrainingSession, locale: Locale): string {
  const c = session.training?.trainingCategory;
  if (!c) return '';
  if (locale === 'ru') return (c.nameRu || c.nameEn || '').trim();
  if (locale === 'vi') return (c.nameVn || c.nameEn || '').trim();
  return (c.nameEn || c.nameRu || c.nameVn || '').trim();
}

function chipTextOn(bg: string): string {
  const h = bg.toLowerCase();
  if (h === '#c2f600' || h === '#ffeb3b' || h === '#b7d356') {
    return ownerTheme.text;
  }
  return '#fff';
}

/** Compact calendar sidebar preview — full management lives on session page. */
export function OwnerCalendarSessionPanel({
  session,
  localePath,
}: {
  session: OwnerTrainingSession;
  localePath: (path: string) => string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = (extractLocaleFromPath(pathname) ?? 'en') as Locale;
  const [editScopeOpen, setEditScopeOpen] = useState(false);

  const durationMin = useMemo(() => {
    const a = new Date(session.startsAt).getTime();
    const b = new Date(session.endsAt).getTime();
    return Math.max(0, Math.round((b - a) / 60000));
  }, [session.startsAt, session.endsAt]);

  const trainerRaw = session.trainer?.name?.trim() || '';
  const trainer = isPlaceholderTrainerName(trainerRaw) ? '' : trainerRaw;
  const language = trainingLanguageLabel(session.training?.language);
  const capacity = session.capacity || 0;
  const enrolled = session.enrolledCount || 0;
  const waitlistCount = session.waitlistCount || 0;
  const accent = session.training?.displayColor || ownerTheme.accent;
  const venue = session.locationName?.trim() || '';
  const cat = categoryLabel(session, locale);
  const detailsHref = localePath(`/calendar/session/${session.sessionId}`);

  const statusUpper = String(session.status || '').toUpperCase();
  const isUpcoming = new Date(session.startsAt).getTime() > Date.now();
  const canEdit =
    Boolean(session.sessionId) && statusUpper !== 'CANCELLED' && isUpcoming;

  const ratio = capacity > 0 ? Math.min(1, enrolled / capacity) : 0;
  const pct = capacity > 0 ? Math.round(ratio * 100) : 0;
  const spotsLeft = capacity > 0 ? Math.max(0, capacity - enrolled) : 0;
  const r = 22;
  const c = 2 * Math.PI * r;

  const onPickEditScope = (scope: OwnerSessionEditScope) => {
    setEditScopeOpen(false);
    const q = new URLSearchParams({
      applyToFollowing: scope === 'following' ? '1' : '0',
    });
    router.push(
      localePath(
        `/calendar/session/${encodeURIComponent(session.sessionId)}/edit?${q}`,
      ),
    );
  };

  return (
    <>
      <aside className="flex w-full flex-col self-start overflow-hidden rounded-[16px] bg-white">
        <div className="flex items-start justify-between gap-2 px-4 pb-1 pt-3.5">
          <div className="min-w-0 flex-1">
            <h2
              className="truncate text-lg font-bold"
              style={{ color: ownerTheme.text }}
            >
              {session.training?.name || 'Class'}
            </h2>
            <p
              className="mt-1 text-sm"
              style={{ color: ownerTheme.textSecondary }}
            >
              {formatOwnerDateShort(session.startsAt)}
            </p>
            <p
              className="mt-0.5 text-sm tabular-nums"
              style={{ color: ownerTheme.textSecondary }}
            >
              {formatOwnerTime24h(session.startsAt)} –{' '}
              {formatOwnerTime24h(session.endsAt)}
              {durationMin ? ` (${durationMin} min)` : ''}
            </p>
          </div>
          {cat ? (
            <span
              className="mt-0.5 shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold uppercase tracking-tight"
              style={{
                backgroundColor: accent,
                color: chipTextOn(accent),
              }}
            >
              {cat}
            </span>
          ) : null}
        </div>

        <div className="flex items-end gap-2.5 px-4 py-3">
          <div className="relative h-16 w-16 shrink-0">
            <svg viewBox="0 0 54 54" className="h-full w-full -rotate-90">
              <circle
                cx="27"
                cy="27"
                r={r}
                fill="none"
                stroke={accent}
                strokeOpacity={0.22}
                strokeWidth="6"
              />
              <circle
                cx="27"
                cy="27"
                r={r}
                fill="none"
                stroke={accent}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={c}
                strokeDashoffset={c * (1 - ratio)}
              />
            </svg>
            <span
              className="absolute inset-0 flex items-center justify-center text-base font-extrabold tracking-tight"
              style={{ color: ownerTheme.text }}
            >
              {pct}%
            </span>
          </div>
          <div className="min-w-0 flex-1 pb-0.5">
            <p
              className="text-[13px] font-medium tracking-tight"
              style={{ color: 'rgba(63,63,63,0.4)' }}
            >
              CAPACITY
            </p>
            <p
              className="mt-1 text-[15px] font-bold tracking-tight tabular-nums"
              style={{ color: ownerTheme.text }}
            >
              {enrolled} of {capacity || '—'} booked
            </p>
            <p
              className="mt-1 text-[11px] font-medium tracking-tight"
              style={{ color: 'rgba(63,63,63,0.4)' }}
            >
              {waitlistCount > 0
                ? `${spotsLeft} spots left · ${waitlistCount} on waitlist`
                : `${spotsLeft} spots left`}
            </p>
          </div>
        </div>

        {(trainer || venue || language) && (
          <div className="space-y-2.5 border-t border-[#F1E4DB] px-4 py-3.5">
            {trainer ? (
              <PreviewRow
                icon={
                  <UserRound className="h-4 w-4" style={{ color: '#4D39A8' }} />
                }
                label={trainer}
              />
            ) : null}
            {venue ? (
              <PreviewRow
                icon={
                  <MapPin className="h-4 w-4" style={{ color: '#4D39A8' }} />
                }
                label={venue}
              />
            ) : null}
            {language ? (
              <PreviewRow
                icon={
                  <Globe className="h-4 w-4" style={{ color: '#4D39A8' }} />
                }
                label={language}
              />
            ) : null}
          </div>
        )}

        <div className="flex gap-2.5 border-t border-[#F1E4DB] px-4 py-3.5">
          <button
            type="button"
            disabled={!canEdit}
            onClick={() => setEditScopeOpen(true)}
            className="flex flex-1 items-center justify-center rounded-[12px] py-3 text-sm font-semibold text-white disabled:opacity-45"
            style={{ backgroundColor: ownerTheme.accent }}
          >
            Edit
          </button>
          <Link
            href={detailsHref}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-[12px] bg-white py-3 text-sm font-semibold transition hover:bg-[#FFFCF9]"
            style={{
              color: ownerTheme.text,
              boxShadow: 'inset 0 0 0 1px #E8D5C8',
            }}
          >
            Details
            <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
          </Link>
        </div>
      </aside>

      <OwnerSessionEditScopeModal
        open={editScopeOpen}
        onClose={() => setEditScopeOpen(false)}
        onSelect={onPickEditScope}
      />
    </>
  );
}

function PreviewRow({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="shrink-0">{icon}</span>
      <span
        className="min-w-0 truncate text-sm"
        style={{ color: ownerTheme.text }}
      >
        {label}
      </span>
    </div>
  );
}
