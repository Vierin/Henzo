'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Copy, MapPin, Navigation, Share2, X } from 'lucide-react';
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
import { startClientGoogleOAuth } from '@/utils/oauth';
import { GoogleLogo } from '@/components/auth/authSocialIcons';

type Translate = (key: string) => string;

type Props = {
  studioId: string;
  sessionId: string;
  startsAtHint: string;
  locale: Locale;
};

type ViewMode = 'detail' | 'confirmed';

function IconCalendar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 13 12" fill="none" className={className} aria-hidden>
      <path
        d="M0.5 4.77778H12.5M3.16667 0.5V1.72222M9.83333 0.5V1.72222M2.63333 11.5H10.3667C11.1134 11.5 11.4868 11.5 11.772 11.3668C12.0229 11.2496 12.2269 11.0626 12.3547 10.8327C12.5 10.5712 12.5 10.2289 12.5 9.54444V3.67778C12.5 2.99327 12.5 2.65101 12.3547 2.38957C12.2269 2.15959 12.0229 1.97261 11.772 1.85544C11.4868 1.72222 11.1134 1.72222 10.3667 1.72222H2.63333C1.8866 1.72222 1.51323 1.72222 1.22801 1.85544C0.977127 1.97261 0.773153 2.15959 0.645327 2.38957C0.5 2.65101 0.5 2.99327 0.5 3.67778V9.54444C0.5 10.2289 0.5 10.5712 0.645327 10.8327C0.773153 11.0626 0.977127 11.2496 1.22801 11.3668C1.51323 11.5 1.88659 11.5 2.63333 11.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconClock({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M12 8V12L14.5 13.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconProfile({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 20" fill="none" className={className} aria-hidden>
      <path
        d="M16.5399 18.5433V16.7382C16.5399 15.7807 16.124 14.8624 15.3837 14.1853C14.6434 13.5083 13.6393 13.1279 12.5924 13.1279H4.69747C3.65054 13.1279 2.64648 13.5083 1.90619 14.1853C1.16589 14.8624 0.75 15.7807 0.75 16.7382V18.5433"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.64474 8.48625C10.8249 8.48625 12.5922 6.75443 12.5922 4.61812C12.5922 2.48182 10.8249 0.75 8.64474 0.75C6.46461 0.75 4.69727 2.48182 4.69727 4.61812C4.69727 6.75443 6.46461 8.48625 8.64474 8.48625Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClassMetaItem({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-[13px] text-[#3F3F3F] sm:text-sm">
      <span className="shrink-0 text-[#E86D4F]">{icon}</span>
      <span className="min-w-0 truncate">{children}</span>
    </span>
  );
}

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
    <div className="flex items-center gap-3">
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
        <p className="text-[12px] font-medium uppercase tracking-wide text-[#3F3F3F]">
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
  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);

  if (!open) return null;
  const next = encodeURIComponent(returnPath);

  const onGoogle = async () => {
    if (oauthLoading) return;
    setOauthLoading(true);
    setOauthError(null);
    try {
      const { error } = await startClientGoogleOAuth({
        provider: 'google',
        next: returnPath,
      });
      if (error) {
        setOauthError(t('classDetail.googleSignInFailed'));
        setOauthLoading(false);
      }
    } catch {
      setOauthError(t('classDetail.googleSignInFailed'));
      setOauthLoading(false);
    }
  };

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
          <button
            type="button"
            disabled={oauthLoading}
            onClick={() => void onGoogle()}
            className="flex h-12 items-center justify-center gap-2.5 rounded-[12px] border border-[#E8E0DA] bg-white text-[15px] font-semibold text-[#3F3F3F] transition hover:bg-[#FFF8F4] disabled:opacity-60"
          >
            <GoogleLogo className="h-5 w-5" />
            {oauthLoading
              ? t('classDetail.pleaseWait')
              : t('classDetail.continueWithGoogle')}
          </button>

          <Link
            href={`/${locale}/login?next=${next}`}
            className="flex h-12 items-center justify-center rounded-[12px] bg-[#E86D4F] text-[15px] font-semibold text-white hover:bg-[#d85e42]"
          >
            {t('classDetail.signIn')}
          </Link>

          {oauthError ? (
            <p className="text-sm text-red-600" role="alert">
              {oauthError}
            </p>
          ) : null}

          <p className="pt-1 text-center text-sm text-[#878787]">
            {t('classDetail.noAccountYet')}{' '}
            <Link
              href={`/${locale}/register?next=${next}`}
              className="font-semibold text-[#E86D4F] hover:text-[#d85e42]"
            >
              {t('classDetail.createAccount')}
            </Link>
          </p>
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
  const accent = session.displayColor || '#FFEB3B';
  const starts = new Date(session.startsAt);
  const ends = new Date(endsAtIso(session));
  const duration = session.durationMinutes || 60;
  const trainerRaw = session.trainerName?.trim() || '';
  const trainer = isPlaceholderTrainerName(trainerRaw) ? '' : trainerRaw;
  const place =
    session.locationName?.trim() || studio.locationName?.trim() || '';
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

  const timeLabel = (
    <>
      {formatOwnerTime24h(session.startsAt)}
      <span className="text-[#3F3F3F]/40">
        {' '}
        · {t('classDetail.durationMin').replace('{min}', String(duration))}
      </span>
    </>
  );

  return (
    <div className="min-h-screen bg-[#FCF3EC] font-wix-madefor-display text-[#3F3F3F]">
      <ClientHomeHeader />
      <div className="mx-auto max-w-2xl px-4 pb-16 pt-6 sm:px-6 lg:max-w-3xl lg:pt-10">
        <div className="relative mx-auto max-w-xl text-center">
          <div className="relative inline-block pt-10 sm:pt-12">
            <div className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-[18%] sm:-translate-x-[10%]">
              <div className="relative h-[52px] w-[96px] sm:h-[60px] sm:w-[110px]">
                <img
                  src="/images/cloud.webp"
                  alt=""
                  className="absolute inset-0 h-full w-full object-contain"
                />
                <img
                  src="/images/icon-rocket.png"
                  alt=""
                  className="absolute left-1/2 top-[42%] h-8 w-8 -translate-x-1/2 -translate-y-1/2 object-contain sm:h-9 sm:w-9"
                />
              </div>
            </div>
            <h1 className="relative z-0 text-[36px] font-semibold tracking-tight text-[#1A1A1A] sm:text-[42px] lg:text-[48px]">
              {t('classDetail.youreIn')}
            </h1>
          </div>
          <p className="mt-2 text-sm font-medium uppercase tracking-wide text-[#6B7280] sm:text-[15px]">
            {headerDate}
          </p>
        </div>

        <div className="relative mx-auto mt-8 max-w-xl overflow-visible rounded-[22px] bg-white px-5 py-5 shadow-[0_8px_24px_rgba(0,0,0,0.08)] sm:mt-10 sm:px-7 sm:py-6 lg:max-w-2xl">
          <h2 className="text-xl font-medium tracking-tight text-[#3F3F3F] sm:text-2xl">
            {classTitle}
          </h2>

          <div
            className="my-4 border-t border-dashed border-[#F4DCBA] sm:my-5"
            aria-hidden
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-5">
            <TicketMetaCell
              accent={accent}
              icon={<IconCalendar className="h-3.5 w-3.5" />}
              label={dateLine}
            />
            <TicketMetaCell
              accent={accent}
              icon={<IconClock className="h-4 w-4" />}
              label={timeLabel}
            />
            <TicketMetaCell
              accent={accent}
              icon={<IconProfile className="h-3.5 w-3.5" />}
              label={trainer || '—'}
            />
            <TicketMetaCell
              accent={accent}
              icon={
                <span className="text-[13px] font-semibold leading-none">
                  $
                </span>
              }
              label={price}
            />
          </div>

          {/* Ticket side notches */}
          <div
            className="pointer-events-none absolute left-0 top-[46%] h-6 w-3 -translate-x-1/2 -translate-y-1/2 rounded-r-full bg-[#FCF3EC] sm:h-7 sm:w-3.5"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute right-0 top-[46%] h-6 w-3 translate-x-1/2 -translate-y-1/2 rounded-l-full bg-[#FCF3EC] sm:h-7 sm:w-3.5"
            aria-hidden
          />

          <div
            className="my-4 border-t border-dashed border-[#F4DCBA] sm:my-5"
            aria-hidden
          />

          <div className="flex items-start gap-3">
            <span
              className="mt-0.5 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: accent }}
            >
              <IconPin className="h-3.5 w-3.5 text-[#3F3F3F]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[#3F3F3F] sm:text-[15px]">
                {place}
              </p>
              {address ? (
                <div className="mt-0.5 flex items-start gap-2">
                  <p className="min-w-0 flex-1 text-[13px] leading-snug text-[#6B7280] sm:text-sm">
                    {address}
                  </p>
                  <button
                    type="button"
                    onClick={() => void copyAddress()}
                    className="shrink-0 rounded-md p-1 text-[#9CA3AF] hover:bg-[#F9F4F0] hover:text-[#3F3F3F]"
                    aria-label={t('classDetail.copyAddress')}
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <div
            className="my-4 border-t border-dashed border-[#F4DCBA] sm:my-5"
            aria-hidden
          />

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
            <a
              href={calendarUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#E86D4F] px-4 text-sm font-semibold text-white transition hover:bg-[#d85e42] sm:h-[52px] sm:text-[15px]"
            >
              <IconCalendar className="h-4 w-4" />
              {t('classDetail.addToCalendar')}
            </a>
            {mapsUrl ? (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#E86D4F] px-4 text-sm font-semibold text-white transition hover:bg-[#d85e42] sm:h-[52px] sm:text-[15px]"
              >
                <IconPin className="h-4 w-4" />
                {t('classDetail.getDirections')}
              </a>
            ) : (
              <span className="inline-flex h-12 items-center justify-center rounded-full bg-[#E86D4F]/40 px-4 text-sm font-semibold text-white sm:h-[52px] sm:text-[15px]">
                {t('classDetail.getDirections')}
              </span>
            )}
          </div>
        </div>

        <div className="mx-auto mt-4 max-w-xl lg:max-w-2xl">
          <button
            type="button"
            onClick={() => void share()}
            className="flex h-12 w-full items-center justify-center rounded-[14px] bg-[#E86D4F] text-[15px] font-semibold text-white transition hover:bg-[#d85e42] sm:h-[52px] sm:text-base"
          >
            {t('classDetail.inviteFriends')}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="mt-3 w-full py-2 text-sm font-medium text-[#6B7280] transition hover:text-[#3F3F3F]"
          >
            {t('classDetail.back')}
          </button>
        </div>
      </div>
    </div>
  );
}

function TicketMetaCell({
  accent,
  icon,
  label,
}: {
  accent: string;
  icon: React.ReactNode;
  label: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span
        className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-[#3F3F3F]"
        style={{ backgroundColor: accent }}
      >
        {icon}
      </span>
      <p className="min-w-0 truncate text-[13px] font-medium text-[#3F3F3F] sm:text-sm">
        {label}
      </p>
    </div>
  );
}

function IconPin({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 11 14"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M5.1123 0C7.92274 0 10.2026 2.26897 10.2227 5.07422H10.2236C10.2236 5.07963 10.2227 5.08543 10.2227 5.09082C10.2227 5.09765 10.2236 5.10449 10.2236 5.11133H10.2227C10.2227 5.20961 10.2184 5.30741 10.2129 5.4043C10.2118 5.42463 10.2102 5.44478 10.209 5.46484C10.2056 5.51387 10.202 5.5627 10.1973 5.61133C10.1167 6.54759 9.844 7.18219 9.47266 7.77734C9.46109 7.79621 9.44833 7.81431 9.43652 7.83301C9.18974 8.22075 8.90363 8.59547 8.60352 9.0293H8.60254L7.16211 11.0801L5.1123 14L5.11133 13.999V14L1.61914 9.03027V9.02832L1.01562 8.16895L1.00977 8.16211C0.376049 7.31037 0 6.25534 0 5.11133C0.000140426 2.28905 2.28954 6.59144e-05 5.1123 0ZM5.1123 2.72656C3.795 2.72656 2.72681 3.79408 2.72656 5.11133C2.72656 6.42878 3.79485 7.49707 5.1123 7.49707C6.42963 7.49692 7.49707 6.42869 7.49707 5.11133C7.49683 3.79418 6.42948 2.72671 5.1123 2.72656Z" />
    </svg>
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
    ? session.locationName?.trim() || studio?.locationName?.trim() || ''
    : '';
  const address = studio?.address?.trim() || '';
  const showCapacity = capacity > 0 || enrolled > 0;
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
        <div className="rounded-[16px] bg-white px-3 py-5 sm:px-4">
          <p className="text-[13px] font-medium uppercase tracking-wide text-[#3F3F3F]">
            {t('classDetail.price')}
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-[#1A1A1A]">
            {priceLabel}
          </p>
          {showCapacity ? (
            <div className="mt-4">
              <CapacityRing
                enrolled={enrolled}
                capacity={capacity}
                accent={accent}
                t={t}
              />
            </div>
          ) : null}

          <div className="mt-5 hidden lg:block">
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
        <div className="relative mb-5 flex h-10 items-center gap-3">
          <Link
            href={studioHref}
            aria-label={t('classDetail.back')}
            className="relative z-10 inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-white text-[#3F3F3F] transition hover:bg-white/90"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2.25} />
          </Link>
          <p className="pointer-events-none absolute inset-x-0 text-center text-lg font-semibold tracking-tight text-[#3F3F3F] sm:text-xl">
            {t('classDetail.title')}
          </p>
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
                className="relative flex min-h-[180px] items-end overflow-hidden rounded-[18px] px-5 py-4 text-white sm:min-h-[200px] lg:min-h-[240px]"
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
                  {studio.logoUrl ? (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-white/95 sm:h-14 sm:w-14 sm:rounded-2xl">
                      <img
                        src={studio.logoUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : null}
                  <div className="min-w-0 flex-1 pb-0.5">
                    <p className="truncate text-xl font-medium sm:text-2xl">
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
                {session.categoryName ? (
                  <span
                    className="inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide"
                    style={{
                      backgroundColor: accent,
                      color: '#3F3F3F',
                    }}
                  >
                    {session.categoryName}
                  </span>
                ) : null}

                <h1
                  className={`text-[28px] font-semibold leading-tight tracking-tight text-[#1A1A1A] sm:text-[34px] ${
                    session.categoryName ? 'mt-3' : ''
                  }`}
                >
                  {session.trainingName || t('classDetail.title')}
                </h1>

                <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-2">
                  <ClassMetaItem icon={<IconCalendar className="h-4 w-4" />}>
                    {new Date(session.startsAt).toLocaleDateString(locale, {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </ClassMetaItem>
                  <span className="text-[#D6D0C8]" aria-hidden>
                    |
                  </span>
                  <ClassMetaItem icon={<IconClock className="h-4 w-4" />}>
                    {formatOwnerTime24h(session.startsAt)}
                    {session.durationMinutes
                      ? ` ${t('classDetail.durationMin').replace(
                          '{min}',
                          String(session.durationMinutes),
                        )}`
                      : null}
                  </ClassMetaItem>
                  {trainer ? (
                    <>
                      <span className="text-[#D6D0C8]" aria-hidden>
                        |
                      </span>
                      <ClassMetaItem icon={<IconProfile className="h-4 w-4" />}>
                        {trainer}
                      </ClassMetaItem>
                    </>
                  ) : null}
                </div>

                <div className="mt-5">
                  <div className="flex items-start gap-2.5 rounded-[14px] bg-[#F9F4F0] px-3.5 py-3">
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
