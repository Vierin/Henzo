'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Globe, Plus, UserRound, X } from 'lucide-react';
import type { OwnerTrainingSession } from '@/lib/owner/types';
import { ownerTheme } from '@/lib/owner/owner-theme';
import {
  formatOwnerDateShort,
  formatOwnerTime24h,
  isPlaceholderTrainerName,
  trainingLanguageLabel,
} from '@/lib/owner/format-time';
import {
  fetchSessionEnrollments,
  updateEnrollmentStatus,
  updateOwnerSessionStatus,
} from '@/lib/owner/fetch-session-detail';

type Tab = 'details' | 'participants' | 'waitlist';

export function OwnerCalendarSessionPanel({
  session,
  localePath,
  onClose,
}: {
  session: OwnerTrainingSession;
  localePath: (path: string) => string;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>('details');
  const queryClient = useQueryClient();

  useEffect(() => {
    setTab('details');
  }, [session.sessionId]);

  const enrollmentsQuery = useQuery({
    queryKey: ['owner-enrollments', session.sessionId],
    queryFn: () => fetchSessionEnrollments(session.sessionId),
  });

  const statusMutation = useMutation({
    mutationFn: ({
      enrollmentId,
      status,
    }: {
      enrollmentId: string;
      status: 'ACTIVE' | 'NO_SHOW';
    }) => updateEnrollmentStatus(enrollmentId, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['owner-enrollments', session.sessionId],
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => updateOwnerSessionStatus(session.sessionId, 'CANCELLED'),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['owner-sessions-day'] }),
        queryClient.invalidateQueries({ queryKey: ['owner-sessions-week'] }),
        queryClient.invalidateQueries({ queryKey: ['owner-enrollments'] }),
      ]);
      onClose();
    },
  });

  const enrollments = enrollmentsQuery.data ?? [];
  const active = enrollments.filter((e) => {
    const st = String(e.status || '').toUpperCase();
    return st !== 'CANCELLED' && st !== 'WAITLIST';
  });
  const waitlist = enrollments.filter(
    (e) => String(e.status || '').toUpperCase() === 'WAITLIST',
  );

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
  const waitlistCount = Math.max(session.waitlistCount || 0, waitlist.length);
  const notes = session.training?.description?.trim() || '';
  const accent = session.training?.displayColor || ownerTheme.accent;
  const editHref = session.trainingId
    ? localePath(`/trainings/${session.trainingId}/edit`)
    : localePath(`/calendar/session/${session.sessionId}`);
  const sessionHref = localePath(`/calendar/session/${session.sessionId}`);

  const statusUpper = String(session.status || '').toUpperCase();
  const ends = new Date(session.endsAt).getTime();
  const starts = new Date(session.startsAt).getTime();
  const now = Date.now();
  const isUpcoming = ends > now || starts > now;
  const canCancel =
    Boolean(session.sessionId) &&
    statusUpper !== 'CANCELLED' &&
    statusUpper !== 'COMPLETED' &&
    isUpcoming;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'details', label: 'Details' },
    { id: 'participants', label: `Participants (${active.length})` },
    { id: 'waitlist', label: `Waitlist (${waitlistCount})` },
  ];

  return (
    <aside className="flex max-h-[calc(100vh-8rem)] w-full flex-col self-start overflow-hidden rounded-[16px] bg-white">
      <div className="flex items-start justify-between gap-2 px-4 pb-1 pt-3.5">
        <div className="min-w-0">
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
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1"
          style={{ color: ownerTheme.textSecondary }}
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="px-4 pt-3">
        <SessionCapacityCard
          accent={accent}
          enrolled={enrolled}
          capacity={capacity}
          waitlistCount={waitlistCount}
          addHref={isUpcoming ? sessionHref : undefined}
        />
      </div>

      <div className="flex gap-2.5 px-4 py-3">
        <Link
          href={editHref}
          className="flex flex-1 items-center justify-center rounded-[12px] py-3 text-sm font-medium text-white"
          style={{ backgroundColor: ownerTheme.accent }}
        >
          Edit
        </Link>
        <button
          type="button"
          disabled={!canCancel || cancelMutation.isPending}
          onClick={() => {
            if (
              !window.confirm(
                'Cancel this class? Participants will be notified.',
              )
            ) {
              return;
            }
            cancelMutation.mutate();
          }}
          className="flex flex-1 items-center justify-center rounded-[12px] bg-white py-3 text-sm font-medium disabled:opacity-45"
          style={{
            color: ownerTheme.textSecondary,
            boxShadow: 'inset 0 0 0 1px #E8D5C8',
          }}
        >
          {cancelMutation.isPending ? 'Cancelling…' : 'Cancel'}
        </button>
      </div>

      <div className="flex border-b border-[#F1E4DB]">
        {tabs.map((t) => {
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className="relative flex-1 pb-2.5 pt-1 text-center text-sm font-semibold"
              style={{
                color: on ? ownerTheme.accent : ownerTheme.textSecondary,
              }}
            >
              {t.label}
              {on ? (
                <span
                  className="absolute inset-x-0 bottom-0 h-0.5 rounded-full"
                  style={{ backgroundColor: ownerTheme.accent }}
                />
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="min-h-0 max-h-[min(360px,45vh)] overflow-y-auto px-4 py-4">
        {tab === 'details' ? (
          <div className="space-y-4">
            <DetailRow
              icon={
                <UserRound className="h-4 w-4" style={{ color: '#4D39A8' }} />
              }
              label="Instructor"
              value={trainer || '—'}
            />
            {language ? (
              <DetailRow
                icon={
                  <Globe className="h-4 w-4" style={{ color: '#4D39A8' }} />
                }
                label="Language"
                value={language}
              />
            ) : null}

            {notes ? (
              <div
                className="rounded-[12px] px-3.5 py-3"
                style={{ backgroundColor: ownerTheme.bg }}
              >
                <p
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: ownerTheme.textSecondary }}
                >
                  Notes
                </p>
                <p
                  className="mt-1.5 text-sm leading-relaxed"
                  style={{ color: ownerTheme.text }}
                >
                  {notes}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        {tab === 'participants' ? (
          <EnrollmentList
            loading={enrollmentsQuery.isLoading}
            empty="No participants yet"
            items={active}
            pending={statusMutation.isPending}
            onToggle={(enrollmentId, status) =>
              statusMutation.mutate({
                enrollmentId,
                status: status === 'NO_SHOW' ? 'ACTIVE' : 'NO_SHOW',
              })
            }
          />
        ) : null}

        {tab === 'waitlist' ? (
          <EnrollmentList
            loading={enrollmentsQuery.isLoading}
            empty="Waitlist is empty"
            items={waitlist}
            pending={false}
          />
        ) : null}
      </div>
    </aside>
  );
}

function SessionCapacityCard({
  accent,
  enrolled,
  capacity,
  waitlistCount,
  addHref,
}: {
  accent: string;
  enrolled: number;
  capacity: number;
  waitlistCount: number;
  addHref?: string;
}) {
  const ratio = capacity > 0 ? Math.min(1, enrolled / capacity) : 0;
  const pct = capacity > 0 ? Math.round(ratio * 100) : 0;
  const spotsLeft = capacity > 0 ? Math.max(0, capacity - enrolled) : 0;
  const r = 22;
  const c = 2 * Math.PI * r;

  return (
    <div className="flex items-end gap-2.5 py-1">
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

      {addHref ? (
        <Link
          href={addHref}
          className="mb-0.5 inline-flex h-11 shrink-0 items-center gap-1 rounded-full px-4 text-[15px] font-semibold text-white"
          style={{ backgroundColor: ownerTheme.accent }}
        >
          <Plus className="h-5 w-5" strokeWidth={2.5} />
          Add
        </Link>
      ) : null}
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5">{icon}</span>
      <div className="min-w-0">
        <p
          className="text-xs font-medium"
          style={{ color: ownerTheme.textSecondary }}
        >
          {label}
        </p>
        <p className="text-sm font-semibold" style={{ color: ownerTheme.text }}>
          {value}
        </p>
      </div>
    </div>
  );
}

function EnrollmentList({
  loading,
  empty,
  items,
  pending,
  onToggle,
}: {
  loading: boolean;
  empty: string;
  items: {
    enrollmentId: string;
    status: string;
    user?: {
      name?: string | null;
      email?: string | null;
      phone?: string | null;
    };
  }[];
  pending: boolean;
  onToggle?: (enrollmentId: string, status: string) => void;
}) {
  if (loading) {
    return (
      <p className="text-sm" style={{ color: ownerTheme.textSecondary }}>
        Loading…
      </p>
    );
  }
  if (items.length === 0) {
    return (
      <p className="text-sm" style={{ color: ownerTheme.textSecondary }}>
        {empty}
      </p>
    );
  }
  return (
    <ul className="divide-y divide-[#F1E4DB]">
      {items.map((e) => (
        <li
          key={e.enrollmentId}
          className="flex items-center justify-between gap-2 py-2.5"
        >
          <div className="min-w-0">
            <p
              className="truncate text-sm font-semibold"
              style={{ color: ownerTheme.text }}
            >
              {e.user?.name || e.user?.email || 'Guest'}
            </p>
            <p
              className="truncate text-xs"
              style={{ color: ownerTheme.textSecondary }}
            >
              {e.user?.email || e.user?.phone || e.status}
            </p>
          </div>
          {onToggle && e.status !== 'CANCELLED' ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => onToggle(e.enrollmentId, e.status)}
              className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold"
              style={{
                backgroundColor: ownerTheme.bg,
                color: ownerTheme.text,
              }}
            >
              {e.status === 'NO_SHOW' ? 'Mark present' : 'No-show'}
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
