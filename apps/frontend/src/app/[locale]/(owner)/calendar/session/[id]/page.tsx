'use client';

import { useMemo } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { extractLocaleFromPath, withLocale, type Locale } from '@/i18n/routing';
import {
  fetchOwnerSessionById,
  fetchSessionEnrollments,
  updateEnrollmentStatus,
} from '@/lib/owner/fetch-session-detail';

export default function SessionDetailPage() {
  const params = useParams<{ id: string }>();
  const sessionId = params.id;
  const pathname = usePathname();
  const locale = (extractLocaleFromPath(pathname) ?? 'en') as Locale;
  const router = useRouter();
  const queryClient = useQueryClient();

  const range = useMemo(() => {
    const from = addDays(new Date(), -14);
    const to = addDays(new Date(), 30);
    return { from: from.toISOString(), to: to.toISOString() };
  }, []);

  const sessionQuery = useQuery({
    queryKey: ['owner-session', sessionId],
    queryFn: () => fetchOwnerSessionById(sessionId, range.from, range.to),
    enabled: Boolean(sessionId),
  });

  const enrollmentsQuery = useQuery({
    queryKey: ['owner-enrollments', sessionId],
    queryFn: () => fetchSessionEnrollments(sessionId),
    enabled: Boolean(sessionId),
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
        queryKey: ['owner-enrollments', sessionId],
      });
    },
  });

  const session = sessionQuery.data;
  const enrollments = enrollmentsQuery.data ?? [];

  return (
    <div className="space-y-5 max-w-3xl">
      <button
        onClick={() => router.push(withLocale('/calendar', locale))}
        className="text-sm text-gray-500 hover:text-[#ea4b4b]"
      >
        ← Back to schedule
      </button>

      {sessionQuery.isLoading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : !session ? (
        <p className="text-sm text-red-600">Session not found</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
          <h1 className="text-2xl font-semibold text-gray-900">
            {session.training?.name}
          </h1>
          <p className="text-sm text-gray-600">
            {new Date(session.startsAt).toLocaleString()} –{' '}
            {new Date(session.endsAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
          <div className="flex flex-wrap gap-3 text-sm text-gray-600">
            <span>
              Capacity: {session.enrolledCount}/{session.capacity}
            </span>
            <span>Trainer: {session.trainer?.name || '—'}</span>
            {session.locationName && <span>{session.locationName}</span>}
            <span className="uppercase text-gray-400">{session.status}</span>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h2 className="font-semibold mb-3">Enrollments</h2>
        {enrollmentsQuery.isLoading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : enrollments.length === 0 ? (
          <p className="text-sm text-gray-500">No enrollments</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {enrollments.map((e) => (
              <li
                key={e.enrollmentId}
                className="py-3 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="font-medium text-sm">
                    {e.user?.name || e.user?.email || 'Guest'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {e.user?.email || e.user?.phone || e.status}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase text-gray-400">
                    {e.status}
                  </span>
                  {e.status !== 'CANCELLED' && (
                    <button
                      disabled={statusMutation.isPending}
                      onClick={() =>
                        statusMutation.mutate({
                          enrollmentId: e.enrollmentId,
                          status: e.status === 'NO_SHOW' ? 'ACTIVE' : 'NO_SHOW',
                        })
                      }
                      className="text-xs rounded-md border border-gray-200 px-2 py-1 hover:border-[#ea4b4b] hover:text-[#ea4b4b]"
                    >
                      {e.status === 'NO_SHOW' ? 'Mark present' : 'No-show'}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}
