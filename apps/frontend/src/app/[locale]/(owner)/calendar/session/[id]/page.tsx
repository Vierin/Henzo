'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Clock, MapPin, Plus } from 'lucide-react';
import { extractLocaleFromPath, withLocale, type Locale } from '@/i18n/routing';
import { useOwnerStudio } from '@/contexts/OwnerStudioContext';
import { ownerTheme } from '@/lib/owner/owner-theme';
import {
  formatOwnerTime24h,
  isPlaceholderTrainerName,
  trainingLanguageLabel,
} from '@/lib/owner/format-time';
import {
  fetchOwnerSessionById,
  fetchSessionEnrollments,
  updateEnrollmentStatus,
  updateOwnerSessionStatus,
} from '@/lib/owner/fetch-session-detail';
import {
  buildClassShareUrl,
  buildOwnerSessionShareText,
  shareOrCopyText,
} from '@/lib/owner/share-session';
import {
  OwnerSessionEditScopeModal,
  type OwnerSessionEditScope,
} from '@/components/owner/ownerSessionEditScopeModal';

function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function asCoord(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function categoryLabel(
  session: {
    training?: {
      trainingCategory?: {
        nameEn?: string | null;
        nameVn?: string | null;
        nameRu?: string | null;
      } | null;
    };
  },
  locale: Locale,
): string {
  const c = session.training?.trainingCategory;
  if (!c) return '';
  if (locale === 'ru') return (c.nameRu || c.nameEn || '').trim();
  if (locale === 'vi') return (c.nameVn || c.nameEn || '').trim();
  return (c.nameEn || c.nameRu || c.nameVn || '').trim();
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}

export default function SessionDetailPage() {
  const params = useParams<{ id: string }>();
  const sessionId = params.id;
  const pathname = usePathname();
  const locale = (extractLocaleFromPath(pathname) ?? 'en') as Locale;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { studio } = useOwnerStudio();
  const path = (p: string) => withLocale(p, locale);

  const [editScopeOpen, setEditScopeOpen] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareHint, setShareHint] = useState<string | null>(null);

  const range = useMemo(() => {
    const from = addDays(new Date(), -60);
    const to = addDays(new Date(), 120);
    return { from: from.toISOString(), to: to.toISOString() };
  }, []);

  const sessionQuery = useQuery({
    queryKey: ['owner-session', sessionId, range.from],
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

  const cancelMutation = useMutation({
    mutationFn: () => updateOwnerSessionStatus(sessionId, 'CANCELLED'),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['owner-sessions-day'] }),
        queryClient.invalidateQueries({ queryKey: ['owner-sessions-week'] }),
        queryClient.invalidateQueries({
          queryKey: ['owner-session', sessionId],
        }),
      ]);
      router.push(path('/calendar'));
    },
  });

  const session = sessionQuery.data;
  const enrollments = enrollmentsQuery.data ?? [];

  const now = Date.now();
  const starts = session ? new Date(session.startsAt).getTime() : 0;
  const ends = session ? new Date(session.endsAt).getTime() : 0;
  const isUpcoming = Boolean(session && starts > now);
  const sessionEnded = Boolean(session && ends <= now);
  const statusUpper = String(session?.status || '').toUpperCase();
  const canEdit = Boolean(session) && statusUpper !== 'CANCELLED' && isUpcoming;
  const canCancel =
    Boolean(session) &&
    statusUpper !== 'CANCELLED' &&
    statusUpper !== 'COMPLETED' &&
    isUpcoming;
  /** No-show toggles only after the class has ended. */
  const showAttendanceToggles = sessionEnded && statusUpper !== 'CANCELLED';

  const accent = session?.training?.displayColor || ownerTheme.accent;
  const capacity = session?.capacity || 0;
  const enrolled = session?.enrolledCount || 0;
  const waitlistCount = session?.waitlistCount || 0;
  const ratio = capacity > 0 ? Math.min(1, enrolled / capacity) : 0;
  const pct = capacity > 0 ? Math.round(ratio * 100) : 0;
  const spotsLeft = capacity > 0 ? Math.max(0, capacity - enrolled) : 0;
  const cat = session ? categoryLabel(session, locale) : '';
  const venue =
    session?.locationName?.trim() ||
    studio?.address?.trim() ||
    studio?.name ||
    '';
  const trainerRaw = session?.trainer?.name?.trim() || '';
  const trainer = isPlaceholderTrainerName(trainerRaw) ? '' : trainerRaw;
  const language = trainingLanguageLabel(session?.training?.language);

  const activeAttendees = enrollments.filter((e) => {
    const st = String(e.status || '').toUpperCase();
    return st !== 'CANCELLED' && st !== 'WAITLIST';
  });

  const onPickEditScope = (scope: OwnerSessionEditScope) => {
    setEditScopeOpen(false);
    const q = new URLSearchParams({
      applyToFollowing: scope === 'following' ? '1' : '0',
    });
    router.push(
      path(`/calendar/session/${encodeURIComponent(sessionId)}/edit?${q}`),
    );
  };

  const onShare = async () => {
    if (!session || !studio?.id || shareBusy) return;
    setShareBusy(true);
    setShareHint(null);
    try {
      const origin =
        typeof window !== 'undefined'
          ? window.location.origin
          : 'https://henzo.app';
      const shareUrl = buildClassShareUrl({
        studioId: studio.id,
        sessionId: session.sessionId,
        startsAt: session.startsAt,
        origin,
        locale,
      });
      const dateLine = new Intl.DateTimeFormat(locale, {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
      }).format(new Date(session.startsAt));
      const timeLine = `${formatOwnerTime24h(session.startsAt)} – ${formatOwnerTime24h(session.endsAt)}`;
      const text = buildOwnerSessionShareText({
        trainingName: session.training?.name || 'Class',
        dateLine,
        timeLine,
        address: venue,
        latitude: asCoord(studio.latitude),
        longitude: asCoord(studio.longitude),
        shareUrl,
      });
      const result = await shareOrCopyText({
        title: session.training?.name || 'Class',
        text,
        url: shareUrl,
      });
      if (result === 'copied') {
        setShareHint('Link copied');
        window.setTimeout(() => setShareHint(null), 2000);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setShareHint('Could not share');
      window.setTimeout(() => setShareHint(null), 2000);
    } finally {
      setShareBusy(false);
    }
  };

  const dateHeading = session
    ? new Intl.DateTimeFormat(locale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
        .format(new Date(session.startsAt))
        .toUpperCase()
    : '';

  const ringR = 28;
  const ringC = 2 * Math.PI * ringR;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 pb-10 lg:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.push(path('/calendar'))}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white"
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5" style={{ color: ownerTheme.text }} />
        </button>
        <h1 className="text-lg font-bold" style={{ color: ownerTheme.text }}>
          Class
        </h1>
        <button
          type="button"
          disabled={shareBusy || !studio?.id || !session}
          onClick={() => void onShare()}
          className="inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: ownerTheme.accent }}
        >
          <img
            src="/images/icons/icon-share.svg"
            alt=""
            width={16}
            height={12}
            aria-hidden
          />
          Share
        </button>
      </div>
      {shareHint ? (
        <p
          className="text-center text-xs font-medium"
          style={{ color: ownerTheme.accent }}
        >
          {shareHint}
        </p>
      ) : null}

      {sessionQuery.isLoading ? (
        <p className="text-sm" style={{ color: ownerTheme.textSecondary }}>
          Loading…
        </p>
      ) : !session ? (
        <p className="text-sm text-red-600">Session not found</p>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-6">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2.5">
              {cat ? (
                <span
                  className="rounded-full px-3 py-1.5 text-[13px] font-semibold uppercase tracking-tight"
                  style={{
                    backgroundColor: accent,
                    color:
                      accent.toLowerCase() === '#c2f600' ||
                      accent.toLowerCase() === '#ffeb3b'
                        ? ownerTheme.text
                        : '#fff',
                  }}
                >
                  {cat}
                </span>
              ) : null}
              <span
                className="text-sm tracking-tight"
                style={{ color: ownerTheme.text }}
              >
                {dateHeading}
              </span>
            </div>

            <h2
              className="text-[1.75rem] font-bold leading-tight tracking-tight sm:text-[2rem]"
              style={{ color: ownerTheme.text }}
            >
              {session.training?.name || 'Class'}
            </h2>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <span
                className="inline-flex items-center gap-2.5 text-[15px]"
                style={{ color: ownerTheme.text }}
              >
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: accent }}
                >
                  <Clock
                    className="h-[18px] w-[18px]"
                    style={{
                      color:
                        accent.toLowerCase() === '#c2f600' ||
                        accent.toLowerCase() === '#ffeb3b'
                          ? ownerTheme.text
                          : '#fff',
                    }}
                  />
                </span>
                {formatOwnerTime24h(session.startsAt)} –{' '}
                {formatOwnerTime24h(session.endsAt)}
              </span>
              {venue ? (
                <span
                  className="inline-flex min-w-0 items-center gap-2.5 text-[15px]"
                  style={{ color: ownerTheme.text }}
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: accent }}
                  >
                    <MapPin
                      className="h-[18px] w-[18px]"
                      style={{
                        color:
                          accent.toLowerCase() === '#c2f600' ||
                          accent.toLowerCase() === '#ffeb3b'
                            ? ownerTheme.text
                            : '#fff',
                      }}
                    />
                  </span>
                  <span className="truncate">{venue}</span>
                </span>
              ) : null}
            </div>

            {(trainer || language) && (
              <p
                className="text-sm"
                style={{ color: ownerTheme.textSecondary }}
              >
                {[trainer ? `With ${trainer}` : null, language]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            )}

            <div className="flex items-center gap-3 rounded-[18px] bg-white px-4 py-4">
              <div className="relative h-[72px] w-[72px] shrink-0">
                <svg viewBox="0 0 72 72" className="h-full w-full -rotate-90">
                  <circle
                    cx="36"
                    cy="36"
                    r={ringR}
                    fill="none"
                    stroke={accent}
                    strokeOpacity={0.22}
                    strokeWidth="7"
                  />
                  <circle
                    cx="36"
                    cy="36"
                    r={ringR}
                    fill="none"
                    stroke={accent}
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray={ringC}
                    strokeDashoffset={ringC * (1 - ratio)}
                  />
                </svg>
                <span
                  className="absolute inset-0 flex items-center justify-center text-base font-medium"
                  style={{ color: ownerTheme.text }}
                >
                  {pct}%
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="text-[12px] font-medium uppercase tracking-wide"
                  style={{ color: 'rgba(63,63,63,0.4)' }}
                >
                  Capacity
                </p>
                <p
                  className="mt-1 text-[15px] font-normal tabular-nums"
                  style={{ color: ownerTheme.text }}
                >
                  {enrolled} of {capacity || '—'} booked
                </p>
                <p
                  className="mt-1 text-[12px]"
                  style={{ color: 'rgba(63,63,63,0.45)' }}
                >
                  {waitlistCount > 0
                    ? `${spotsLeft} spots left · ${waitlistCount} on waitlist`
                    : `${spotsLeft} spots left`}
                </p>
              </div>
              {isUpcoming ? (
                <Link
                  href={path(
                    `/clients?enrollSession=${encodeURIComponent(session.sessionId)}`,
                  )}
                  className="inline-flex h-11 shrink-0 items-center gap-1 rounded-full px-4 text-[15px] font-semibold text-white"
                  style={{ backgroundColor: ownerTheme.accent }}
                >
                  <Plus className="h-5 w-5" strokeWidth={2.5} />
                  Add
                </Link>
              ) : null}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                disabled={!canEdit}
                onClick={() => setEditScopeOpen(true)}
                className="flex flex-1 items-center justify-center rounded-[12px] py-3.5 text-sm font-medium text-white disabled:opacity-45"
                style={{ backgroundColor: ownerTheme.accent }}
              >
                Edit
              </button>
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
                className="flex flex-1 items-center justify-center rounded-[12px] bg-white py-3.5 text-sm font-medium disabled:opacity-45"
                style={{
                  color: ownerTheme.textSecondary,
                  boxShadow: 'inset 0 0 0 1px #E8D5C8',
                }}
              >
                {cancelMutation.isPending ? 'Cancelling…' : 'Cancel'}
              </button>
            </div>
          </div>

          <section className="space-y-3">
            <div className="flex items-end justify-between gap-2">
              <h3
                className="text-[13px] font-extrabold uppercase tracking-[0.06em]"
                style={{ color: ownerTheme.text }}
              >
                Attendees · {activeAttendees.length}
              </h3>
              {showAttendanceToggles ? (
                <span
                  className="text-[10px] font-bold uppercase tracking-wide"
                  style={{ color: ownerTheme.textSecondary }}
                >
                  No show / Completed
                </span>
              ) : null}
            </div>

            {enrollmentsQuery.isLoading ? (
              <p
                className="text-sm"
                style={{ color: ownerTheme.textSecondary }}
              >
                Loading…
              </p>
            ) : activeAttendees.length === 0 ? (
              <div
                className="rounded-[14px] bg-white px-4 py-8 text-center text-sm"
                style={{ color: ownerTheme.textSecondary }}
              >
                No attendees yet
              </div>
            ) : (
              <ul className="space-y-2">
                {activeAttendees.map((e) => {
                  const name =
                    e.user?.name?.trim() || e.user?.email?.trim() || 'Guest';
                  const sub =
                    e.user?.phone?.trim() || e.user?.email?.trim() || '';
                  const isNoShow =
                    String(e.status || '').toUpperCase() === 'NO_SHOW';
                  return (
                    <li
                      key={e.enrollmentId}
                      className="flex items-center gap-3 rounded-[14px] bg-white px-3.5 py-3"
                    >
                      <span
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                        style={{
                          backgroundColor: ownerTheme.bgSoft,
                          color: ownerTheme.text,
                        }}
                      >
                        {initials(name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className="truncate text-[15px] font-bold"
                          style={{ color: ownerTheme.text }}
                        >
                          {name}
                        </p>
                        {sub ? (
                          <p
                            className="truncate text-[13px]"
                            style={{ color: ownerTheme.textSecondary }}
                          >
                            {sub}
                          </p>
                        ) : null}
                      </div>
                      {showAttendanceToggles ? (
                        <div className="flex shrink-0 items-center gap-2">
                          {isNoShow ? (
                            <span
                              className="text-[12px]"
                              style={{ color: ownerTheme.textSecondary }}
                            >
                              No show
                            </span>
                          ) : null}
                          <button
                            type="button"
                            role="switch"
                            aria-checked={!isNoShow}
                            disabled={statusMutation.isPending}
                            onClick={() =>
                              statusMutation.mutate({
                                enrollmentId: e.enrollmentId,
                                status: isNoShow ? 'ACTIVE' : 'NO_SHOW',
                              })
                            }
                            className={`relative h-7 w-12 rounded-full transition-colors disabled:opacity-50 ${
                              isNoShow ? 'bg-[#E26152]' : 'bg-[#4CAF50]'
                            }`}
                            aria-label={
                              isNoShow ? 'Mark present' : 'Mark no-show'
                            }
                          >
                            <span
                              className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                                isNoShow ? 'left-0.5' : 'left-[22px]'
                              }`}
                            />
                          </button>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}

      <OwnerSessionEditScopeModal
        open={editScopeOpen}
        onClose={() => setEditScopeOpen(false)}
        onSelect={onPickEditScope}
      />
    </div>
  );
}
