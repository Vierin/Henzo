'use client';

import Link from 'next/link';
import { MoreHorizontal } from 'lucide-react';
import type { OwnerTrainingSession } from '@/lib/owner/types';
import {
  enrollmentPercent,
  formatSessionTime,
  getSessionUiStatus,
} from '@/lib/owner/session-utils';

const statusStyles: Record<
  ReturnType<typeof getSessionUiStatus>,
  { label: string; className: string }
> = {
  in_progress: {
    label: 'IN PROGRESS',
    className: 'bg-[#FF5B5B]/15 text-[#F15942]',
  },
  upcoming: {
    label: 'UPCOMING',
    className: 'bg-[#C2F600]/30 text-[#5a7a00]',
  },
  waitlist: {
    label: 'WAITLIST',
    className: 'bg-zinc-200 text-zinc-600',
  },
  past: {
    label: 'COMPLETED',
    className: 'bg-zinc-100 text-zinc-500',
  },
};

type Props = {
  sessions: OwnerTrainingSession[];
  locale: string;
  onSelect: (session: OwnerTrainingSession) => void;
};

export function OwnerTodayClasses({ sessions, locale, onSelect }: Props) {
  const sorted = [...sessions].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );

  return (
    <section className="mt-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#3F3F3F]">
          Today&apos;s classes
        </h2>
        <Link
          href={`/${locale}/owner/calendar`}
          className="text-sm font-medium text-[#3F3287] hover:underline"
        >
          View schedule →
        </Link>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-8 text-center">
          <p className="text-sm text-zinc-500">
            No classes scheduled for today.
          </p>
          <Link
            href={`/${locale}/owner/services/new`}
            className="mt-3 inline-block text-sm font-medium text-[#3F3287]"
          >
            Add your first class →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((session) => {
            const uiStatus = getSessionUiStatus(session);
            const badge = statusStyles[uiStatus];
            const pct = enrollmentPercent(session);
            const duration = session.trainingDurationMinutes ?? 60;

            return (
              <article
                key={session.sessionId}
                className="flex items-center gap-4 rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm"
              >
                <div className="hidden w-16 shrink-0 text-center sm:block">
                  <p className="text-sm font-semibold text-[#3F3F3F]">
                    {formatSessionTime(session.startsAt, locale)}
                  </p>
                  <p className="text-xs text-zinc-400">{duration} min</p>
                </div>

                <div
                  className="hidden h-14 w-20 shrink-0 rounded-xl bg-gradient-to-br from-[#EDE9F6] to-[#FAD0C5] sm:block"
                  aria-hidden
                />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-[#3F3F3F]">
                      {session.trainingName}
                    </h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-500">
                    {session.trainerName}
                    {session.locationName ? ` · ${session.locationName}` : ''}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-400 sm:hidden">
                    {formatSessionTime(session.startsAt, locale)} · {duration}{' '}
                    min
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  {uiStatus === 'in_progress' ? (
                    <div
                      className="relative flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#3F3287]/20"
                      title={`${pct}% booked`}
                    >
                      <span className="text-xs font-semibold text-[#3F3287]">
                        {pct}%
                      </span>
                    </div>
                  ) : uiStatus === 'upcoming' ? (
                    <button
                      type="button"
                      onClick={() => onSelect(session)}
                      className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                    >
                      Details
                    </button>
                  ) : null}
                  <p className="hidden text-xs text-zinc-500 md:block">
                    {session.enrolledCount}/{session.capacity} booked
                  </p>
                  <button
                    type="button"
                    onClick={() => onSelect(session)}
                    className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-50"
                    aria-label="More options"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
