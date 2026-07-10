'use client';

import { useEffect, useState } from 'react';
import type { OwnerTrainingSession } from '@/lib/owner/types';
import {
  fetchSessionEnrollments,
  updateOwnerSessionStatus,
} from '@/lib/owner/api';
import {
  formatSessionDate,
  formatSessionTime,
} from '@/lib/owner/session-utils';

type Props = {
  session: OwnerTrainingSession | null;
  open: boolean;
  onClose: () => void;
  locale: string;
  onUpdated: () => void;
};

export function SessionDetailDrawer({
  session,
  open,
  onClose,
  locale,
  onUpdated,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [enrollments, setEnrollments] = useState<
    Awaited<ReturnType<typeof fetchSessionEnrollments>>
  >([]);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (!open || !session) return;
    setLoading(true);
    void fetchSessionEnrollments(session.sessionId)
      .then(setEnrollments)
      .finally(() => setLoading(false));
  }, [open, session]);

  if (!open || !session) return null;

  const cancelSession = async () => {
    if (!confirm('Cancel this session?')) return;
    setActing(true);
    try {
      await updateOwnerSessionStatus(session.sessionId, 'CANCELLED');
      onUpdated();
      onClose();
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        aria-label="Close"
      />
      <aside className="relative flex h-full w-full max-w-md flex-col bg-white shadow-xl">
        <div className="border-b border-zinc-100 p-5">
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-zinc-500 hover:text-zinc-800"
          >
            ← Close
          </button>
          <h2 className="mt-3 text-xl font-semibold text-[#3F3F3F]">
            {session.trainingName}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            {formatSessionDate(session.startsAt, locale)} ·{' '}
            {formatSessionTime(session.startsAt, locale)} –{' '}
            {formatSessionTime(session.endsAt, locale)}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            {session.trainerName}
            {session.locationName ? ` · ${session.locationName}` : ''}
          </p>
          <p className="mt-2 text-sm font-medium text-[#3F3287]">
            {session.enrolledCount}/{session.capacity} enrolled
            {session.waitlistCount > 0
              ? ` · ${session.waitlistCount} waitlist`
              : ''}
          </p>
        </div>

        <div className="flex-1 overflow-auto p-5">
          <h3 className="text-sm font-semibold text-zinc-700">Enrollments</h3>
          {loading ? (
            <p className="mt-3 text-sm text-zinc-500">Loading…</p>
          ) : enrollments.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">No enrollments yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {enrollments.map((e) => (
                <li
                  key={e.enrollmentId}
                  className="rounded-xl border border-zinc-100 px-3 py-2 text-sm"
                >
                  <p className="font-medium text-[#3F3F3F]">
                    {e.clientName ?? e.clientEmail ?? e.userId}
                  </p>
                  <p className="text-xs text-zinc-500">{e.status}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {session.status !== 'CANCELLED' ? (
          <div className="border-t border-zinc-100 p-5">
            <button
              type="button"
              disabled={acting}
              onClick={() => void cancelSession()}
              className="w-full rounded-full border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              Cancel session
            </button>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
