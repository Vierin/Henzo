'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import { extractLocaleFromPath, withLocale, type Locale } from '@/i18n/routing';
import { useOwnerStudio } from '@/contexts/OwnerStudioContext';
import { ownerTheme } from '@/lib/owner/owner-theme';
import { formatOwnerTime24h } from '@/lib/owner/format-time';
import {
  fetchOwnerSessionById,
  patchOwnerTrainingSession,
} from '@/lib/owner/fetch-session-detail';
import { fetchStaff } from '@/lib/owner/fetch-staff';
import { listTrainingLocations } from '@/lib/owner/training-locations';
import { OwnerSelect } from '@/components/owner/ownerSelect';
import {
  fetchOwnerSubscription,
  planBadgeLabel,
} from '@/lib/owner/fetch-subscription';

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocalValue(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new Error('Invalid date/time');
  return d.toISOString();
}

const inputClass =
  'w-full rounded-xl border-0 bg-white px-3.5 py-3 text-[15px] outline-none';

export default function OwnerEditSessionPage() {
  const params = useParams<{ id: string }>();
  const sessionId = params.id;
  const searchParams = useSearchParams();
  const applyToFollowing = searchParams.get('applyToFollowing') === '1';
  const pathname = usePathname();
  const locale = (extractLocaleFromPath(pathname) ?? 'en') as Locale;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { studio } = useOwnerStudio();
  const path = (p: string) => withLocale(p, locale);

  const range = useMemo(() => {
    const from = new Date();
    from.setMonth(from.getMonth() - 1);
    const to = new Date();
    to.setMonth(to.getMonth() + 3);
    return { from: from.toISOString(), to: to.toISOString() };
  }, []);

  const sessionQuery = useQuery({
    queryKey: ['owner-session', sessionId, range.from],
    queryFn: () => fetchOwnerSessionById(sessionId, range.from, range.to),
    enabled: Boolean(sessionId),
  });

  const staffQuery = useQuery({
    queryKey: ['owner-staff', studio?.id],
    queryFn: () => fetchStaff(studio!.id),
    enabled: Boolean(studio?.id),
  });

  const subQuery = useQuery({
    queryKey: ['owner-subscription'],
    queryFn: fetchOwnerSubscription,
  });

  const session = sessionQuery.data;
  const locations = useMemo(
    () => listTrainingLocations(studio, studio?.name || 'Main studio'),
    [studio],
  );

  const isPro = planBadgeLabel(subQuery.data ?? null) !== 'Solo';

  const [startsLocal, setStartsLocal] = useState('');
  const [trainerId, setTrainerId] = useState('');
  const [locationId, setLocationId] = useState('default');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    setStartsLocal(toDatetimeLocalValue(session.startsAt));
    setTrainerId(session.trainer?.id?.trim() || '');
    const loc = session.locationId?.trim();
    setLocationId(loc && loc.length > 0 ? loc : 'default');
  }, [session]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error('Session not found');
      const body: {
        startsAt?: string;
        trainerId?: string | null;
        locationId?: string | null;
        applyToFollowing?: boolean;
      } = {};

      const nextStarts = fromDatetimeLocalValue(startsLocal);
      if (nextStarts !== new Date(session.startsAt).toISOString()) {
        body.startsAt = nextStarts;
      }

      const beforeTrainer = session.trainer?.id?.trim() || '';
      const afterTrainer = trainerId.trim();
      if (beforeTrainer !== afterTrainer) {
        body.trainerId = afterTrainer || null;
      }

      const beforeLoc = session.locationId?.trim() || '';
      const afterLoc = locationId === 'default' ? '' : locationId.trim();
      if (beforeLoc !== afterLoc) {
        body.locationId = afterLoc || null;
      }

      if (Object.keys(body).length === 0) return;
      if (applyToFollowing) body.applyToFollowing = true;
      await patchOwnerTrainingSession(session.sessionId, body);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['owner-sessions-day'] }),
        queryClient.invalidateQueries({ queryKey: ['owner-sessions-week'] }),
        queryClient.invalidateQueries({
          queryKey: ['owner-session', sessionId],
        }),
        queryClient.invalidateQueries({ queryKey: ['owner-sessions-today'] }),
      ]);
      router.push(path(`/calendar/session/${encodeURIComponent(sessionId)}`));
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Failed to save');
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    saveMutation.mutate();
  };

  const title = applyToFollowing
    ? 'This class and all future ones'
    : 'This class only';

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      <div className="flex items-center gap-2">
        <Link
          href={path(`/calendar/session/${encodeURIComponent(sessionId)}`)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white"
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5" style={{ color: ownerTheme.text }} />
        </Link>
        <h1
          className="min-w-0 flex-1 text-xl font-bold tracking-tight"
          style={{ color: ownerTheme.text }}
        >
          {title}
        </h1>
      </div>

      {sessionQuery.isLoading ? (
        <p className="text-sm" style={{ color: ownerTheme.textSecondary }}>
          Loading…
        </p>
      ) : !session ? (
        <p className="text-sm text-red-600">Session not found</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          {applyToFollowing ? (
            <div
              className="rounded-xl px-3.5 py-3 text-[13px] leading-snug"
              style={{
                backgroundColor: 'rgba(241, 89, 66, 0.12)',
                color: ownerTheme.text,
              }}
            >
              Changes apply to this class and every later active class of the
              same training.
            </div>
          ) : null}

          <p
            className="text-[13px]"
            style={{ color: ownerTheme.textSecondary }}
          >
            Edit schedule for{' '}
            <span className="font-semibold" style={{ color: ownerTheme.text }}>
              {session.training?.name || 'Class'}
            </span>
            . Name, price and duration are edited under Trainings.
          </p>

          <label className="block">
            <span
              className="mb-1.5 block text-[13px] font-medium"
              style={{ color: ownerTheme.textSecondary }}
            >
              Date & time
            </span>
            <input
              type="datetime-local"
              value={startsLocal}
              onChange={(e) => setStartsLocal(e.target.value)}
              required
              className={inputClass}
              style={{ color: ownerTheme.text }}
            />
            <span
              className="mt-1 block text-xs"
              style={{ color: ownerTheme.textSecondary }}
            >
              Ends ~{session.training?.duration || '—'} min after start
              {session.endsAt
                ? ` (currently ${formatOwnerTime24h(session.endsAt)})`
                : ''}
            </span>
          </label>

          {locations.length > 1 ? (
            <label className="block">
              <span
                className="mb-1.5 block text-[13px] font-medium"
                style={{ color: ownerTheme.textSecondary }}
              >
                Location
              </span>
              <OwnerSelect
                value={locationId}
                onChange={setLocationId}
                options={locations.map((l) => ({
                  value: l.id,
                  label: l.name,
                }))}
              />
            </label>
          ) : null}

          {isPro && (staffQuery.data?.length ?? 0) > 0 ? (
            <label className="block">
              <span
                className="mb-1.5 block text-[13px] font-medium"
                style={{ color: ownerTheme.textSecondary }}
              >
                Trainer
              </span>
              <OwnerSelect
                value={trainerId}
                onChange={setTrainerId}
                options={[
                  { value: '', label: 'No trainer' },
                  ...(staffQuery.data ?? []).map((t) => ({
                    value: t.id,
                    label: t.name || 'Trainer',
                  })),
                ]}
              />
            </label>
          ) : null}

          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="w-full rounded-[14px] py-3.5 text-[15px] font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: ownerTheme.accent }}
          >
            {saveMutation.isPending ? 'Saving…' : 'Save'}
          </button>
        </form>
      )}
    </div>
  );
}
