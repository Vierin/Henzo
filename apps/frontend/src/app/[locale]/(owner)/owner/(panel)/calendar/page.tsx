'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { SessionDetailDrawer } from '@/components/owner/sessionDetailDrawer';
import {
  fetchCurrentStudio,
  fetchOwnerTrainingSessions,
} from '@/lib/owner/api';
import type { OwnerTrainingSession } from '@/lib/owner/types';
import {
  endOfDay,
  formatSessionDate,
  formatSessionTime,
  startOfDay,
  toIsoUtc,
} from '@/lib/owner/session-utils';

export default function OwnerCalendarPage() {
  const params = useParams();
  const locale = (params?.locale as string) ?? 'en';
  const [month, setMonth] = useState(() => new Date());
  const [sessions, setSessions] = useState<OwnerTrainingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<OwnerTrainingSession | null>(null);

  const range = useMemo(() => {
    const start = startOfDay(
      new Date(month.getFullYear(), month.getMonth(), 1),
    );
    const end = endOfDay(
      new Date(month.getFullYear(), month.getMonth() + 1, 0),
    );
    return { from: toIsoUtc(start), to: toIsoUtc(end) };
  }, [month]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await fetchCurrentStudio();
      const data = await fetchOwnerTrainingSessions(range.from, range.to);
      setSessions(data);
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to]);

  useEffect(() => {
    void load();
  }, [load]);

  const byDay = useMemo(() => {
    const map = new Map<string, OwnerTrainingSession[]>();
    for (const s of sessions) {
      const d = new Date(s.startsAt);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const list = map.get(key) ?? [];
      list.push(s);
      map.set(key, list);
    }
    return map;
  }, [sessions]);

  const monthLabel = month.toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
  });

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#3F3F3F]">Schedule</h1>
          <p className="text-sm text-zinc-500">Your training sessions</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
            }
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm"
          >
            ←
          </button>
          <span className="min-w-[140px] text-center text-sm font-semibold">
            {monthLabel}
          </span>
          <button
            type="button"
            onClick={() =>
              setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
            }
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm"
          >
            →
          </button>
          <Link
            href={`/${locale}/owner/services/new`}
            className="rounded-full bg-[#3F3287] px-4 py-2 text-sm font-medium text-white"
          >
            Add class
          </Link>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : sessions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 p-8 text-center">
          <p className="text-sm text-zinc-500">No sessions this month.</p>
          <Link
            href={`/${locale}/owner/services/new`}
            className="mt-2 inline-block text-sm font-medium text-[#3F3287]"
          >
            Create a class →
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(byDay.entries()).map(([key, daySessions]) => {
            const [y, m, d] = key.split('-').map(Number);
            const date = new Date(y, m, d);
            return (
              <section key={key}>
                <h2 className="mb-2 text-sm font-semibold text-zinc-600">
                  {formatSessionDate(date.toISOString(), locale)}
                </h2>
                <div className="space-y-2">
                  {daySessions.map((s) => (
                    <button
                      key={s.sessionId}
                      type="button"
                      onClick={() => setSelected(s)}
                      className="flex w-full items-center justify-between rounded-xl border border-zinc-100 bg-white px-4 py-3 text-left hover:border-[#3F3287]/30"
                    >
                      <div>
                        <p className="font-medium text-[#3F3F3F]">
                          {s.trainingName}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {formatSessionTime(s.startsAt, locale)} ·{' '}
                          {s.enrolledCount}/{s.capacity}
                        </p>
                      </div>
                      <span className="text-xs text-zinc-400">{s.status}</span>
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <SessionDetailDrawer
        session={selected}
        open={selected != null}
        onClose={() => setSelected(null)}
        locale={locale}
        onUpdated={() => void load()}
      />
    </>
  );
}
