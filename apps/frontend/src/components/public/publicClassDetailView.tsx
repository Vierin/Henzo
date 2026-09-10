'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  Copy,
  MapPin,
  Navigation,
  Share2,
  UserRound,
  X,
} from 'lucide-react';
import { ClientHomeHeader } from '@/components/clientHome/clientHomeHeader';
import {
  fetchPublicStudioById,
  fetchPublicStudioScheduleClient,
  type PublicScheduleSession,
  type PublicStudioDetail,
} from '@/lib/client/fetch-studio-detail';
import {
  bookPublicSession,
  fetchMyEnrollment,
  joinSessionWaitlist,
  leaveSessionWaitlist,
  type MyEnrollmentStatus,
} from '@/lib/client/book-session';
import { cancelClientEnrollment } from '@/lib/client-panel/fetch-schedule';
import { formatMoney } from '@/lib/format-money';
import {
  formatOwnerTime24h,
  isPlaceholderTrainerName,
} from '@/lib/owner/format-time';
import { getPublicSupabase } from '@/lib/supabase-public';
import { useTranslation } from '@/contexts/LanguageContext';
import { resolveStudioPublicSlug } from '@/utils/slug';
import type { Locale } from '@/i18n/routing';

type Translate = (key: string) => string;

type Props = {
  studioId: string;
  sessionId: string;
  startsAtHint: string;
  locale: Locale;
};

type ViewMode = 'detail' | 'confirmed';

function dayWindow(iso: string): { from: Date; to: Date } {
  const d = new Date(iso);
  const from = new Date(d);
  from.setHours(0, 0, 0, 0);
  from.setDate(from.getDate() - 1);
  const to = new Date(d);
  to.setHours(23, 59, 59, 999);
  to.setDate(to.getDate() + 1);
  return { from, to };
}

function endsAtIso(session: PublicScheduleSession): string {
  if (session.endsAt) return session.endsAt;
  const start = new Date(session.startsAt).getTime();
  const mins = session.durationMinutes || 60;
  return new Date(start + mins * 60_000).toISOString();
}

function CapacityRing({
  enrolled,
  capacity,
  accent,
  t,
}: {
  enrolled: number;
  capacity: number;
  accent: string;
  t: Translate;
}) {
  const ratio = capacity > 0 ? Math.min(1, enrolled / capacity) : 0;
  const pct = capacity > 0 ? Math.round(ratio * 100) : 0;
  const spotsLeft = capacity > 0 ? Math.max(0, capacity - enrolled) : 0;
  const r = 28;
  const c = 2 * Math.PI * r;

  return (
    <div className="flex items-center gap-3 rounded-[18px] bg-white px-4 py-4">
      <div className="relative h-[72px] w-[72px] shrink-0">
        <svg viewBox="0 0 72 72" className="h-full w-full -rotate-90">
          <circle
            cx="36"
            cy="36"
            r={r}
            fill="none"
            stroke={accent}
            strokeOpacity={0.22}
            strokeWidth="7"
          />
          <circle
            cx="36"
            cy="36"
            r={r}
            fill="none"
            stroke={accent}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - ratio)}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-base font-medium text-[#3F3F3F]">
          {pct}%
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-medium uppercase tracking-wide text-[#3F3F3F]/40">
          {t('classDetail.capacity')}
        </p>
        <p className="mt-1 text-[15px] font-normal tabular-nums text-[#3F3F3F]">
          {t('classDetail.bookedSummary')
            .replace('{current}', String(enrolled))
            .replace('{max}', capacity ? String(capacity) : '—')}
        </p>
        <p className="mt-1 text-[12px] text-[#3F3F3F]/45">
          {t('classDetail.spotsLeft').replace('{spots}', String(spotsLeft))}
        </p>
      </div>
    </div>
  );
}

function AuthGateModal({
  open,
  locale,
  returnPath,
  onClose,
  t,
}: {
  open: boolean;
  locale: Locale;
  returnPath: string;
  onClose: () => void;
  t: Translate;
}) {
  if (!open) return null;
  const next = encodeURIComponent(returnPath);
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label={t('common.close')}
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-t-[20px] bg-white p-5 shadow-xl sm:rounded-[20px]">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#3F3F3F]">
              {t('classDetail.authGateTitle')}
            </h2>
            <p className="mt-1 text-sm text-[#878787]">
              {t('classDetail.authGateBody')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[#878787]"
            aria-label={t('common.close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4 flex flex-col gap-2.5">
          <Link
            href={`/${locale}/login?next=${next}`}
            className="flex h-12 items-center justify-center rounded-[12px] bg-[#E86D4F] text-[15px] font-semibold text-white hover:bg-[#d85e42]"
          >
            {t('classDetail.signIn')}
          </Link>
          <Link
            href={`/${locale}/register?next=${next}`}
            className="flex h-12 items-center justify-center rounded-[12px] border border-[#E8E0DA] bg-white text-[15px] font-semibold text-[#3F3F3F]"
          >
            {t('classDetail.createAccount')}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ConfirmationTicket({
  session,
  studio,
  locale,
  onClose,
  t,
}: {
  session: PublicScheduleSession;
  studio: PublicStudioDetail;
  locale: Locale;
  onClose: () => void;
  t: Translate;
}) {
  const accent = session.displayColor || '#E86D4F';
  const starts = new Date(session.startsAt);
  const ends = new Date(endsAtIso(session));
  const duration = session.durationMinutes || 60;
  const trainerRaw = session.trainerName?.trim() || '';
  const trainer = isPlaceholderTrainerName(trainerRaw) ? '' : trainerRaw;
  const place =
    session.locationName?.trim() || studio.locationName || studio.name;
  const address = studio.address?.trim() || '';
  const classTitle = session.trainingName || t('classDetail.title');
  const price =
    session.price != null && session.price > 0
      ? formatMoney(session.price, studio.currency)
      : t('classDetail.free');

  const dateLine = starts.toLocaleDateString(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const headerDate = `${starts
    .toLocaleDateString(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
    .toUpperCase()} · ${formatOwnerTime24h(session.startsAt)}`;

  const mapsUrl = (() => {
    if (
      typeof studio.latitude === 'number' &&
      typeof studio.longitude === 'number'
    ) {
      return `https://www.google.com/maps/dir/?api=1&destination=${studio.latitude},${studio.longitude}`;
    }
    if (address) {
      return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
    }
    return null;
  })();

  const calendarUrl = (() => {
    const fmt = (d: Date) =>
      d
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d{3}/, '');
    const details = [
      trainer ? trainer : '',
      [place, address].filter(Boolean).join(', '),
    ]
      .filter(Boolean)
      .join(' · ');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(classTitle)}&dates=${fmt(starts)}/${fmt(ends)}&details=${encodeURIComponent(details)}&location=${encodeURIComponent([place, address].filter(Boolean).join(', '))}`;
  })();

  const share = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const text = [
      t('classDetail.shareForClass').replace('{class}', classTitle),
      headerDate,
      trainer ? trainer : '',
      place,
      url,
    ]
      .filter(Boolean)
      .join('\n');
    try {
      if (navigator.share) {
        await navigator.share({ title: classTitle, text, url });
        return;
      }
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  };

  const copyAddress = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F4F0] font-wix-madefor-display text-[#3F3F3F]">
      <div className="mx-auto max-w-xl px-4 pb-16 pt-4 sm:px-6 lg:max-w-2xl">
        <div className="relative flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#3F3F3F]"
            aria-label={t('common.close')}
          >
            <X className="h-5 w-5" />
          </button>
          <p className="text-sm font-semibold">{t('classDetail.confirmed')}</p>
          <button
            type="button"
            onClick={() => void share()}
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#E86D4F] px-3 text-sm font-semibold text-white"
          >
            <Share2 className="h-3.5 w-3.5" />
            {t('classDetail.share')}
          </button>
        </div>

        <div className="mt-8 text-center">
          <h1 className="text-[36px] font-semibold tracking-tight text-[#1A1A1A] sm:text-[39px]">
            {t('classDetail.youreIn')}
          </h1>
          <p className="mt-2 text-sm font-medium text-[#3F3F3F]">
            {headerDate}
          </p>
        </div>

        <div className="relative mt-8 overflow-hidden rounded-[20px] bg-white shadow-sm">
          <div
            className="h-1.5 w-full"
            style={{ backgroundColor: accent }}
            aria-hidden
          />
          <div className="px-5 pb-5 pt-4">
            <h2 className="text-xl font-semibold tracking-tight">
              {classTitle}
            </h2>
            <div
              className="my-4 border-t border-dashed border-[#E8E0DA]"
              aria-hidden
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-[#A4A4A4]">
                  {t('classDetail.date')}
                </p>
                <p className="mt-1 text-sm font-medium">{dateLine}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-[#A4A4A4]">
                  {t('classDetail.time')}
                </p>
                <p className="mt-1 text-sm font-medium">
                  {formatOwnerTime24h(session.startsAt)}
                  <span className="text-[#A4A4A4]">
                    {' '}
                    ·{' '}
                    {t('classDetail.durationMin').replace(
                      '{min}',
                      String(duration),
                    )}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-[#A4A4A4]">
                  {t('classDetail.trainer')}
                </p>
                <p className="mt-1 text-sm font-medium">{trainer || '—'}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-[#A4A4A4]">
                  {t('classDetail.price')}
                </p>
                <p className="mt-1 text-sm font-medium">{price}</p>
              </div>
            </div>
            <div
              className="my-4 border-t border-dashed border-[#E8E0DA]"
              aria-hidden
            />
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#4D39A8]" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{place}</p>
                {address ? (
                  <p className="mt-0.5 text-sm text-[#878787]">{address}</p>
                ) : null}
              </div>
              {address ? (
                <button
                  type="button"
                  onClick={() => void copyAddress()}
                  className="rounded-lg p-1.5 text-[#878787] hover:bg-[#F9F4F0]"
                  aria-label={t('classDetail.copyAddress')}
                >
                  <Copy className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <a
                href={calendarUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-[12px] border border-[#E8E0DA] text-sm font-semibold text-[#3F3F3F]"
              >
                <CalendarDays className="h-4 w-4 text-[#E86D4F]" />
                {t('classDetail.calendar')}
              </a>
              {mapsUrl ? (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center justify-center gap-1.5 rounded-[12px] border border-[#E8E0DA] text-sm font-semibold text-[#3F3F3F]"
                >
                  <Navigation className="h-4 w-4 text-[#E86D4F]" />
                  {t('classDetail.directions')}
                </a>
              ) : (
                <span className="inline-flex h-11 items-center justify-center rounded-[12px] border border-[#E8E0DA] text-sm font-semibold text-[#A4A4A4]">
                  {t('classDetail.directions')}
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void share()}
          className="mt-4 flex h-12 w-full items-center justify-center rounded-[12px] bg-[#E86D4F] text-[15px] font-semibold text-white hover:bg-[#d85e42]"
        >
          {t('classDetail.inviteFriends')}
        </button>
      </div>
    </div>
  );
}

export function PublicClassDetailView({
  studioId,
  sessionId,
  startsAtHint,
  locale,
}: Props) {
  const t = useTranslation();
  const [studio, setStudio] = useState<PublicStudioDetail | null>(null);
  const [session, setSession] = useState<PublicScheduleSession | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrollment, setEnrollment] = useState<MyEnrollmentStatus | null>(null);
  const [hasAuth, setHasAuth] = useState(false);
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [booking, setBooking] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingDialog, setPendingDialog] = useState(false);
  const [view, setView] = useState<ViewMode>('detail');

  const returnPath = useMemo(() => {
    const q = new URLSearchParams({
      studioId,
      sessionId,
      startsAt: startsAtHint,
    });
    return `/${locale}/class?${q.toString()}`;
  }, [locale, studioId, sessionId, startsAtHint]);

  const refreshEnrollment = useCallback(async () => {
    const sessionAuth = (await getPublicSupabase().auth.getSession()).data
      .session;
    setHasAuth(Boolean(sessionAuth?.access_token));
    if (!sessionAuth?.access_token) {
      setEnrollment(null);
      return;
    }
    try {
      const mine = await fetchMyEnrollment(sessionId);
      setEnrollment(mine);
    } catch {
      setEnrollment(null);
    }
  }, [sessionId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const { from, to } = dayWindow(
          startsAtHint || new Date().toISOString(),
        );
        const [studioData, sessions] = await Promise.all([
          fetchPublicStudioById(studioId),
          fetchPublicStudioScheduleClient(studioId, {
            from,
            to,
            limit: 200,
          }),
        ]);
        if (cancelled) return;
        if (!studioData) {
          setLoadError('studioNotFound');
          setLoading(false);
          return;
        }
        const found =
          sessions.find((s) => s.id === sessionId) ??
          sessions.find(
            (s) =>
              startsAtHint &&
              Math.abs(
                new Date(s.startsAt).getTime() -
                  new Date(startsAtHint).getTime(),
              ) < 60_000,
          ) ??
          null;
        setStudio(studioData);
        setSession(found);
        if (!found) setLoadError('notFound');
        await refreshEnrollment();
      } catch {
        if (!cancelled) setLoadError('loadFailed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [studioId, sessionId, startsAtHint, refreshEnrollment]);

  const accent = session?.displayColor || '#E86D4F';
  const capacity = session?.capacity ?? 0;
  const enrolled = session?.enrolledCount ?? 0;
  const isFull = capacity > 0 && enrolled >= capacity;
  const started = session
    ? new Date(session.startsAt).getTime() < Date.now()
    : false;
  const isBooked = Boolean(
    enrollment?.enrolled && enrollment.status === 'ACTIVE',
  );
  const isPending = Boolean(enrollment?.status === 'PENDING');
  const isWaitlisted = Boolean(enrollment?.waitlisted);
  const canBook =
    !started && !isFull && !isBooked && !isPending && !isWaitlisted;

  const studioSlug = studio
    ? resolveStudioPublicSlug({
        id: studio.id,
        name: studio.name,
        slug: studio.slug,
      })
    : '';
  const studioHref = studioSlug
    ? `/${locale}/studio/${encodeURIComponent(studioSlug)}`
    : `/${locale}`;

  const onBook = async () => {
    setActionError(null);
    if (!hasAuth) {
      setAuthGateOpen(true);
      return;
    }
    if (booking || !session) return;
    setBooking(true);
    try {
      const result = await bookPublicSession(sessionId);
      const status = String(result.booking?.status ?? 'ACTIVE').toUpperCase();
      if (status === 'PENDING') {
        setPendingDialog(true);
        await refreshEnrollment();
        return;
      }
      if (result.booking?.bookedCount != null) {
        setSession((prev) =>
          prev ? { ...prev, enrolledCount: result.booking!.bookedCount } : prev,
        );
      }
      await refreshEnrollment();
      setView('confirmed');
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Could not book this class';
      if (/already booked/i.test(msg)) {
        await refreshEnrollment();
        setActionError(t('classDetail.alreadyBooked'));
      } else {
        setActionError(msg || t('classDetail.bookingFailed'));
      }
    } finally {
      setBooking(false);
    }
  };

  const onCancel = async () => {
    if (!enrollment?.enrollmentId || canceling) return;
    setCanceling(true);
    setActionError(null);
    try {
      await cancelClientEnrollment(enrollment.enrollmentId);
      await refreshEnrollment();
      setSession((prev) =>
        prev
          ? {
              ...prev,
              enrolledCount: Math.max(0, (prev.enrolledCount ?? 1) - 1),
            }
          : prev,
      );
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : t('classDetail.cancelFailed'),
      );
    } finally {
      setCanceling(false);
    }
  };

  const onWaitlist = async () => {
    if (!hasAuth) {
      setAuthGateOpen(true);
      return;
    }
    setWaitlistLoading(true);
    setActionError(null);
    try {
      if (isWaitlisted) await leaveSessionWaitlist(sessionId);
      else await joinSessionWaitlist(sessionId);
      await refreshEnrollment();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : t('classDetail.waitlistError'),
      );
    } finally {
      setWaitlistLoading(false);
    }
  };

  if (view === 'confirmed' && session && studio) {
    return (
      <ConfirmationTicket
        session={session}
        studio={studio}
        locale={locale}
        onClose={() => setView('detail')}
        t={t}
      />
    );
  }

  const trainerRaw = session?.trainerName?.trim() || '';
  const trainer = isPlaceholderTrainerName(trainerRaw) ? '' : trainerRaw;
  const place = session
    ? session.locationName?.trim() || studio?.locationName || studio?.name || ''
    : '';
  const address = studio?.address?.trim() || '';
  const showCapacity = capacity > 0 || enrolled > 0;
  const fillLabel = capacity > 0 ? `${enrolled}/${capacity}` : String(enrolled);
  const priceLabel =
    session?.price != null && session.price > 0 && studio
      ? formatMoney(session.price, studio.currency)
      : t('classDetail.free');
  const trainingDescription = (() => {
    if (!session) return '';
    if (locale === 'ru') {
      return (
        session.descriptionRu ||
        session.description ||
        session.descriptionEn ||
        session.descriptionVi ||
        ''
      );
    }
    if (locale === 'vi') {
      return (
        session.descriptionVi ||
        session.description ||
        session.descriptionEn ||
        session.descriptionRu ||
        ''
      );
    }
    return (
      session.descriptionEn ||
      session.description ||
      session.descriptionRu ||
      session.descriptionVi ||
      ''
    );
  })();
  const mapsUrl = (() => {
    if (!studio) return null;
    if (
      typeof studio.latitude === 'number' &&
      typeof studio.longitude === 'number'
    ) {
      return `https://www.google.com/maps/dir/?api=1&destination=${studio.latitude},${studio.longitude}`;
    }
    if (address) {
      return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
    }
    return null;
  })();
  const shareClass = async () => {
    if (!session) return;
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const title = session.trainingName || t('classDetail.title');
    const text = [
      t('classDetail.shareForClass').replace('{class}', title),
      url,
    ].join('\n');
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        return;
      }
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  };

  const bookPanel =
    session && studio && !started ? (
      <div className="space-y-3">
        <div className="rounded-[16px] bg-white p-5">
          <p className="text-[13px] font-medium uppercase tracking-wide text-[#A4A4A4]">
            {t('classDetail.price')}
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-[#1A1A1A]">
            {priceLabel}
          </p>
          {showCapacity ? (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium tabular-nums text-[#3F3F3F]">
                  {fillLabel}
                </span>
                <span className="text-[#878787]">
                  {t('classDetail.spotsLeft').replace(
                    '{spots}',
                    String(Math.max(0, capacity - enrolled)),
                  )}
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#E5E7EB]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.round(
                      (capacity > 0 ? Math.min(1, enrolled / capacity) : 0) *
                        100,
                    )}%`,
                    backgroundColor: accent,
                  }}
                />
              </div>
            </div>
          ) : null}

          <div className="mt-5">
            {isBooked ? (
              <div className="space-y-2.5">
                <p className="text-center text-sm text-[#878787]">
                  {t('classDetail.youAreBooked')}
                </p>
                <button
                  type="button"
                  onClick={() => setView('confirmed')}
                  className="flex h-12 w-full items-center justify-center rounded-[12px] bg-[#E86D4F] text-[15px] font-semibold text-white hover:bg-[#d85e42]"
                >
                  {t('classDetail.viewTicket')}
                </button>
                <button
                  type="button"
                  disabled={!enrollment?.enrollmentId || canceling}
                  onClick={() => void onCancel()}
                  className="flex h-12 w-full items-center justify-center rounded-[12px] border border-red-500 text-[15px] font-semibold text-red-500 disabled:opacity-45"
                >
                  {canceling
                    ? t('classDetail.canceling')
                    : t('classDetail.cancelBooking')}
                </button>
              </div>
            ) : isPending ? (
              <p className="py-2 text-center text-sm text-[#878787]">
                {t('classDetail.waitingForAccept')}
              </p>
            ) : isFull ? (
              <button
                type="button"
                disabled={waitlistLoading}
                onClick={() => void onWaitlist()}
                className="flex h-12 w-full items-center justify-center rounded-[12px] bg-[#E86D4F] text-[15px] font-semibold text-white hover:bg-[#d85e42] disabled:opacity-45"
              >
                {waitlistLoading
                  ? t('classDetail.pleaseWait')
                  : isWaitlisted
                    ? t('classDetail.leaveWaitlist')
                    : t('classDetail.joinWaitlist')}
              </button>
            ) : (
              <button
                type="button"
                disabled={!canBook || booking}
                onClick={() => void onBook()}
                className="flex h-12 w-full items-center justify-center rounded-[12px] bg-[#E86D4F] text-[15px] font-semibold text-white hover:bg-[#d85e42] disabled:opacity-45"
              >
                {booking
                  ? t('classDetail.booking')
                  : t('classDetail.bookClass')}
              </button>
            )}
          </div>
          {actionError ? (
            <p className="mt-3 text-sm text-red-600">{actionError}</p>
          ) : null}
        </div>

        <div className="hidden gap-2 lg:grid lg:grid-cols-2">
          {mapsUrl ? (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center justify-center gap-1.5 rounded-[12px] bg-white text-sm font-semibold text-[#3F3F3F]"
            >
              <Navigation className="h-4 w-4 text-[#E86D4F]" />
              {t('classDetail.getDirections')}
            </a>
          ) : null}
          <button
            type="button"
            onClick={() => void shareClass()}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-[12px] bg-white text-sm font-semibold text-[#3F3F3F]"
          >
            <Share2 className="h-4 w-4 text-[#E86D4F]" />
            {t('classDetail.share')}
          </button>
        </div>
      </div>
    ) : null;

  return (
    <div className="min-h-screen bg-[#F9F4F0] font-wix-madefor-display text-[#3F3F3F]">
      <ClientHomeHeader />
      <div className="mx-auto max-w-6xl px-4 pb-28 pt-4 sm:px-6 sm:pt-6 lg:pb-12">
        <div className="mb-5 flex items-center justify-between gap-3">
          <Link
            href={studioHref}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#E86D4F]"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('classDetail.back')}
          </Link>
          <p className="text-sm font-semibold">{t('classDetail.title')}</p>
          <button
            type="button"
            onClick={() => void shareClass()}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#E86D4F] px-3 text-sm font-semibold text-white hover:bg-[#d85e42]"
          >
            <Share2 className="h-3.5 w-3.5" />
            {t('classDetail.share')}
          </button>
        </div>

        {loading ? (
          <p className="rounded-[14px] bg-white p-5 text-sm text-[#878787]">
            {t('classDetail.loading')}
          </p>
        ) : loadError || !session || !studio ? (
          <div className="rounded-[14px] bg-white p-5">
            <p className="text-sm text-[#878787]">
              {loadError
                ? t(`classDetail.${loadError}`)
                : t('classDetail.notFound')}
            </p>
            <Link
              href={`/${locale}`}
              className="mt-3 inline-block text-sm font-semibold text-[#E86D4F]"
            >
              {t('classDetail.goHome')}
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-8">
            <div className="min-w-0 space-y-4">
              <Link
                href={studioHref}
                className="relative flex min-h-[120px] items-end overflow-hidden rounded-[18px] px-5 py-4 text-white sm:min-h-[160px] lg:min-h-[200px]"
                style={{ backgroundColor: accent }}
              >
                {studio.photoUrl ? (
                  <img
                    src={studio.photoUrl}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/20 to-black/10" />
                <div className="relative z-10 flex w-full items-end gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/95 text-lg font-bold text-[#3F3F3F]">
                    {studio.photoUrl ? (
                      <img
                        src={studio.photoUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      studio.name.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1 pb-0.5">
                    <p className="truncate text-xl font-semibold sm:text-2xl">
                      {studio.name}
                    </p>
                    {studio.avgRating || studio.reviewCount ? (
                      <p className="mt-1 text-sm text-white/90">
                        {t('classDetail.reviewsLabel')
                          .replace(
                            '{rating}',
                            studio.avgRating
                              ? studio.avgRating.toFixed(1)
                              : '—',
                          )
                          .replace('{count}', String(studio.reviewCount || 0))}
                      </p>
                    ) : null}
                  </div>
                </div>
              </Link>

              <div className="rounded-[18px] bg-white px-5 py-5 sm:px-6 sm:py-6">
                <div className="flex flex-wrap items-center gap-2">
                  {session.categoryName ? (
                    <span
                      className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide"
                      style={{
                        backgroundColor: accent,
                        color: '#3F3F3F',
                      }}
                    >
                      {session.categoryName}
                    </span>
                  ) : null}
                  <p className="text-sm font-medium uppercase tracking-wide text-[#878787]">
                    {new Date(session.startsAt).toLocaleDateString(locale, {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>

                <h1 className="mt-3 text-[28px] font-semibold leading-tight tracking-tight text-[#1A1A1A] sm:text-[34px]">
                  {session.trainingName || t('classDetail.title')}
                </h1>

                <p className="mt-3 text-lg tabular-nums text-[#3F3F3F]">
                  {formatOwnerTime24h(session.startsAt)}
                  {session.durationMinutes
                    ? ` · ${t('classDetail.durationMin').replace('{min}', String(session.durationMinutes))}`
                    : ''}
                </p>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {trainer ? (
                    <div className="flex items-start gap-2.5 rounded-[14px] bg-[#F9F4F0] px-3.5 py-3">
                      <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-[#4D39A8]" />
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-[#A4A4A4]">
                          {t('classDetail.trainer')}
                        </p>
                        <p className="mt-0.5 text-sm font-medium">{trainer}</p>
                      </div>
                    </div>
                  ) : null}
                  <div className="flex items-start gap-2.5 rounded-[14px] bg-[#F9F4F0] px-3.5 py-3 sm:col-span-2 sm:col-start-1">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#4D39A8]" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-[#A4A4A4]">
                        {place}
                      </p>
                      {address ? (
                        <p className="mt-0.5 text-sm text-[#3F3F3F]">
                          {address}
                        </p>
                      ) : null}
                      {mapsUrl ? (
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-[#1A73E8]"
                        >
                          <Navigation className="h-3.5 w-3.5" />
                          {t('classDetail.getDirections')}
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <CapacityRing
                enrolled={enrolled}
                capacity={capacity}
                accent={accent}
                t={t}
              />

              {trainingDescription ? (
                <div className="rounded-[18px] bg-white px-5 py-5 sm:px-6">
                  <h2 className="text-base font-semibold tracking-tight">
                    {t('classDetail.description')}
                  </h2>
                  <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-[#3F3F3F]">
                    {trainingDescription}
                  </p>
                </div>
              ) : null}

              {studio.description?.trim() ? (
                <div className="rounded-[18px] bg-white px-5 py-5 sm:px-6">
                  <h2 className="text-base font-semibold tracking-tight">
                    {t('classDetail.aboutStudio')}
                  </h2>
                  <p className="mt-3 line-clamp-6 whitespace-pre-wrap text-[15px] leading-relaxed text-[#3F3F3F]">
                    {studio.description.trim()}
                  </p>
                  <Link
                    href={studioHref}
                    className="mt-3 inline-block text-sm font-semibold text-[#E86D4F]"
                  >
                    {studio.name}
                  </Link>
                </div>
              ) : null}

              <div className="lg:hidden">{bookPanel}</div>
            </div>

            <aside className="hidden lg:sticky lg:top-24 lg:block">
              {bookPanel}
            </aside>
          </div>
        )}
      </div>

      {session && studio && !started ? (
        <div className="fixed inset-x-0 bottom-0 border-t border-[#F1E4DB] bg-[#F9F4F0]/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="mx-auto max-w-lg">
            {isBooked ? (
              <button
                type="button"
                onClick={() => setView('confirmed')}
                className="flex h-12 w-full items-center justify-center rounded-[12px] bg-[#E86D4F] text-[15px] font-semibold text-white"
              >
                {t('classDetail.viewTicket')}
              </button>
            ) : isPending ? (
              <p className="py-2 text-center text-sm text-[#878787]">
                {t('classDetail.waitingForAccept')}
              </p>
            ) : isFull ? (
              <button
                type="button"
                disabled={waitlistLoading}
                onClick={() => void onWaitlist()}
                className="flex h-12 w-full items-center justify-center rounded-[12px] bg-[#E86D4F] text-[15px] font-semibold text-white disabled:opacity-45"
              >
                {waitlistLoading
                  ? t('classDetail.pleaseWait')
                  : isWaitlisted
                    ? t('classDetail.leaveWaitlist')
                    : t('classDetail.joinWaitlist')}
              </button>
            ) : (
              <button
                type="button"
                disabled={!canBook || booking}
                onClick={() => void onBook()}
                className="flex h-12 w-full items-center justify-center rounded-[12px] bg-[#E86D4F] text-[15px] font-semibold text-white disabled:opacity-45"
              >
                {booking
                  ? t('classDetail.booking')
                  : t('classDetail.bookClass')}
              </button>
            )}
          </div>
        </div>
      ) : null}

      <AuthGateModal
        open={authGateOpen}
        locale={locale}
        returnPath={returnPath}
        onClose={() => setAuthGateOpen(false)}
        t={t}
      />

      {pendingDialog ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label={t('common.close')}
            onClick={() => setPendingDialog(false)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-[16px] bg-white p-5 shadow-xl">
            <h2 className="text-lg font-bold text-[#3F3F3F]">
              {t('classDetail.pendingTitle')}
            </h2>
            <p className="mt-2 text-sm text-[#878787]">
              {t('classDetail.pendingBody')}
            </p>
            <button
              type="button"
              onClick={() => setPendingDialog(false)}
              className="mt-4 flex h-11 w-full items-center justify-center rounded-[12px] bg-[#E86D4F] text-sm font-semibold text-white"
            >
              {t('classDetail.ok')}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
