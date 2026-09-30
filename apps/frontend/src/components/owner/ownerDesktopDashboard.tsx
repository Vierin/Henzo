'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ChevronRight,
  Dumbbell,
  Link2,
  MapPin,
  Plus,
  Star,
  UserPlus,
} from 'lucide-react';
import type {
  OwnerSessionEnrollment,
  OwnerTrainingSession,
} from '@/lib/owner/types';
import { ownerTheme } from '@/lib/owner/owner-theme';
import { useTranslation } from '@/contexts/LanguageContext';
import { formatOwnerTime24h } from '@/lib/owner/format-time';
import { copyTextToClipboard } from '@/lib/owner/booking-link';
import {
  OwnerScheduleEmptyCard,
  OwnerSessionCard,
} from '@/components/owner/ownerSessionCard';
import { OwnerFeaturedSessionCard } from '@/components/owner/ownerDashboardCards';

export type DashboardNextBooking = {
  key: string;
  clientName: string;
  sessionId: string;
  startsAt: string;
  className: string;
  status: string;
};

function greetingPhrase(hour: number, t: (path: string) => string): string {
  if (hour < 12) return t('owner.dashboard.greetingMorning');
  if (hour < 18) return t('owner.dashboard.greetingAfternoon');
  return t('owner.dashboard.greetingEvening');
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}

function avatarTone(name: string): string {
  const tones = ['#FAD0C5', '#C2F600', '#F8EDE5', '#FEE2E2', '#E0E7FF'];
  let h = 0;
  for (let i = 0; i < name.length; i++)
    h = (h + name.charCodeAt(i)) % tones.length;
  return tones[h]!;
}

export function OwnerDashboardGreeting({
  locale,
  firstName,
}: {
  locale: string;
  firstName: string;
}) {
  const t = useTranslation();
  const hour = new Date().getHours();
  return (
    <div>
      <p
        className="text-sm font-medium"
        style={{ color: ownerTheme.textSecondary }}
      >
        {new Intl.DateTimeFormat(locale, {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        }).format(new Date())}
      </p>
      <h1
        className="mt-1.5 text-[28px] font-bold leading-tight tracking-tight md:text-[32px]"
        style={{ color: ownerTheme.text }}
      >
        {greetingPhrase(hour, t)}, {firstName}
      </h1>
      <p
        className="mt-1.5 hidden text-sm lg:block"
        style={{ color: ownerTheme.textSecondary }}
      >
        {t('owner.dashboard.todayAtStudio')}
      </p>
    </div>
  );
}

export function OwnerDashboardSchedulePanel({
  sessions,
  localePath,
  bookingLink,
}: {
  sessions: OwnerTrainingSession[];
  localePath: (path: string) => string;
  bookingLink?: string;
}) {
  const t = useTranslation();
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2
          className="text-[13px] font-semibold uppercase tracking-[0.06em]"
          style={{ color: ownerTheme.text }}
        >
          {t('owner.dashboard.dailySchedule')}
        </h2>
        <Link
          href={localePath('/calendar')}
          className="text-[11px] font-semibold uppercase tracking-wide"
          style={{ color: ownerTheme.accent }}
        >
          {t('owner.dashboard.seeAll')} ›
        </Link>
      </div>

      {sessions.length === 0 ? (
        <OwnerScheduleEmptyCard
          title={t('owner.dashboard.noBookingsYet')}
          subtitle={t('owner.dashboard.shareBookingLinkHint')}
          bookingLink={bookingLink}
        />
      ) : (
        <ul className="space-y-2.5">
          {sessions.map((s) => (
            <li key={s.sessionId}>
              <OwnerSessionCard
                session={s}
                href={localePath(`/calendar/session/${s.sessionId}`)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function OwnerDashboardStudioBanner({
  href,
  name,
  address,
  photoUrl,
  rating,
  reviewCount,
  categories = [],
}: {
  href: string;
  name: string;
  address?: string | null;
  photoUrl?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  categories?: {
    id: number;
    label: string;
    chipBgHex: string;
    chipFgHex: string;
  }[];
}) {
  const t = useTranslation();
  const visibleTags = categories.slice(0, 3);
  const moreCount = Math.max(0, categories.length - visibleTags.length);
  const hasRating = typeof rating === 'number' && rating > 0;
  const ratingText = hasRating ? rating!.toFixed(1) : null;

  return (
    <Link
      href={href}
      className="group relative flex min-h-[168px] overflow-hidden rounded-[18px] bg-white transition hover:bg-[#FFFCF9]"
    >
      <div className="relative w-[38%] max-w-[220px] shrink-0 self-stretch sm:w-[32%]">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ backgroundColor: ownerTheme.bgSoft }}
          />
        )}
        <div
          className="absolute inset-y-0 right-0 w-16 sm:w-20"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, #fff 92%)',
          }}
          aria-hidden
        />
      </div>

      <div className="relative flex min-w-0 flex-1 flex-col py-3 pl-1 pr-4 sm:py-5 sm:pl-2 sm:pr-5">
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <h3
            className="text-[1.25rem] font-bold leading-tight tracking-tight sm:text-[1.35rem]"
            style={{ color: ownerTheme.text }}
          >
            {name || 'Studio'}
          </h3>
          {hasRating && ratingText ? (
            <span className="inline-flex items-center gap-1 text-sm">
              <Star
                className="h-3.5 w-3.5 fill-[#B7D356] text-[#B7D356]"
                aria-hidden
              />
              <span className="font-semibold text-[#7BA01A]">{ratingText}</span>
              {(reviewCount ?? 0) > 0 ? (
                <span style={{ color: ownerTheme.textSecondary }}>
                  ({reviewCount}{' '}
                  {(reviewCount ?? 0) === 1
                    ? t('owner.dashboard.reviewOne')
                    : t('owner.dashboard.reviewMany')}
                  )
                </span>
              ) : null}
            </span>
          ) : null}
        </div>

        {address ? (
          <p
            className="mt-2 flex min-w-0 items-center gap-1.5 text-sm leading-snug"
            style={{ color: ownerTheme.textSecondary }}
          >
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="min-w-0 truncate">{address}</span>
          </p>
        ) : null}

        <div className="mt-3 flex flex-nowrap items-center gap-1.5">
          {visibleTags.map((tag) => (
            <span
              key={tag.id}
              className="shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-semibold"
              style={{
                backgroundColor: tag.chipBgHex,
                color: tag.chipFgHex,
              }}
            >
              {tag.label}
            </span>
          ))}
          {moreCount > 0 ? (
            <span
              className="shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-medium"
              style={{
                backgroundColor: ownerTheme.bgSoft,
                color: ownerTheme.textSecondary,
              }}
            >
              {t('owner.dashboard.moreTags').replace(
                '{count}',
                String(moreCount),
              )}
            </span>
          ) : null}
        </div>

        <div className="mt-4 flex justify-end pt-3 sm:mt-auto">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition group-hover:bg-[#FFF8F4]"
            style={{
              color: ownerTheme.accent,
              boxShadow: `inset 0 0 0 1.5px ${ownerTheme.accent}`,
            }}
          >
            {t('owner.dashboard.viewStudio')}
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
          </span>
        </div>
      </div>
    </Link>
  );
}

export function OwnerDashboardNewClassButton({ href }: { href: string }) {
  const t = useTranslation();
  return (
    <Link
      href={href}
      className="flex min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-[14px] px-2 py-3 text-[13px] font-semibold text-white transition hover:opacity-95 sm:gap-2 sm:px-3 sm:text-sm"
      style={{ backgroundColor: ownerTheme.accent }}
    >
      <Plus className="h-4 w-4" strokeWidth={2.5} />
      {t('owner.dashboard.newClass')}
    </Link>
  );
}

export function OwnerDashboardCopyBookingLinkButton({
  bookingLink,
}: {
  bookingLink: string;
}) {
  const t = useTranslation();
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    const ok = await copyTextToClipboard(bookingLink);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <button
      type="button"
      onClick={() => void onCopy()}
      className="flex min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-[14px] bg-transparent px-2 py-3 text-[13px] font-semibold transition hover:bg-[#FFF8F4] sm:gap-2 sm:px-3 sm:text-sm"
      style={{
        color: ownerTheme.accent,
        boxShadow: `inset 0 0 0 1.5px ${ownerTheme.accent}`,
      }}
    >
      <Link2 className="h-4 w-4" strokeWidth={2.25} />
      {copied
        ? t('owner.dashboard.copied')
        : t('owner.dashboard.copyBookingLink')}
    </button>
  );
}

export function OwnerDashboardSidebar({
  localePath,
  lastBookings,
  featuredSession,
}: {
  localePath: (path: string) => string;
  lastBookings: DashboardNextBooking[];
  featuredSession?: OwnerTrainingSession | null;
}) {
  const t = useTranslation();
  const actions = [
    {
      label: t('owner.dashboard.addNewClient'),
      href: localePath('/clients'),
      icon: <UserPlus className="h-4 w-4" />,
    },
    {
      label: t('owner.dashboard.createClass'),
      href: localePath('/trainings/new'),
      icon: <Dumbbell className="h-4 w-4" />,
    },
  ];

  return (
    <aside className="space-y-3">
      <div className="overflow-hidden rounded-[16px] bg-white">
        <h3
          className="px-4 pb-1 pt-3.5 text-base font-bold"
          style={{ color: ownerTheme.text }}
        >
          {t('owner.dashboard.quickActions')}
        </h3>
        <ul className="divide-y divide-[#F1E4DB]">
          {actions.map((a) => (
            <li key={a.label}>
              <Link
                href={a.href}
                className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-[#FFFCF9]"
              >
                <span style={{ color: ownerTheme.accent }}>{a.icon}</span>
                <span
                  className="min-w-0 flex-1 text-sm font-medium"
                  style={{ color: ownerTheme.text }}
                >
                  {a.label}
                </span>
                <ChevronRight
                  className="h-4 w-4"
                  style={{ color: ownerTheme.textSecondary }}
                />
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {featuredSession ? (
        <div className="hidden lg:block">
          <OwnerFeaturedSessionCard
            session={featuredSession}
            href={localePath(`/calendar/session/${featuredSession.sessionId}`)}
          />
        </div>
      ) : null}

      <div className="overflow-hidden rounded-[16px] bg-white">
        <div className="flex items-center justify-between gap-2 px-4 pb-1 pt-3.5">
          <h3
            className="text-base font-bold"
            style={{ color: ownerTheme.text }}
          >
            {t('owner.dashboard.lastBookings')}
          </h3>
          <Link
            href={localePath('/calendar')}
            className="text-sm font-semibold"
            style={{ color: ownerTheme.accent }}
          >
            {t('owner.dashboard.seeAll')} ›
          </Link>
        </div>
        {lastBookings.length === 0 ? (
          <p
            className="px-4 py-6 text-sm"
            style={{ color: ownerTheme.textSecondary }}
          >
            {t('owner.dashboard.noBookingsYetShort')}
          </p>
        ) : (
          <ul className="divide-y divide-[#F1E4DB]">
            {lastBookings.map((b) => (
              <li key={b.key}>
                <Link
                  href={localePath(`/calendar/session/${b.sessionId}`)}
                  className="flex items-center gap-3 px-4 py-3 transition hover:bg-[#FFFCF9]"
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                    style={{
                      backgroundColor: avatarTone(b.clientName),
                      color: ownerTheme.text,
                    }}
                  >
                    {initials(b.clientName)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className="block truncate text-sm font-bold"
                      style={{ color: ownerTheme.text }}
                    >
                      {b.clientName}
                    </span>
                    <span
                      className="mt-0.5 block truncate text-xs"
                      style={{ color: ownerTheme.textSecondary }}
                    >
                      {formatOwnerTime24h(b.startsAt)} · {b.className}
                    </span>
                  </span>
                  <span
                    className="shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold"
                    style={{
                      borderColor: '#86EFAC',
                      color: '#166534',
                      backgroundColor: '#F0FDF4',
                    }}
                  >
                    {t('owner.dashboard.confirmed')}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

/** Most recent enrollments by createdAt (last bookings). */
export function buildLastBookings(
  sessions: OwnerTrainingSession[],
  bySessionId: Record<string, OwnerSessionEnrollment[]>,
  limit = 4,
): DashboardNextBooking[] {
  const sessionById = new Map(sessions.map((s) => [s.sessionId, s]));
  const rows: (DashboardNextBooking & { createdAtMs: number })[] = [];

  for (const [sessionId, enrollments] of Object.entries(bySessionId)) {
    const s = sessionById.get(sessionId);
    if (!s) continue;
    for (const e of enrollments) {
      const st = String(e.status || '').toUpperCase();
      if (st === 'CANCELLED' || st === 'NO_SHOW') continue;
      const clientName =
        e.user?.name?.trim() || e.user?.email?.split('@')[0] || 'Client';
      const createdAtMs = new Date(e.createdAt).getTime();
      rows.push({
        key: e.enrollmentId,
        clientName,
        sessionId: s.sessionId,
        startsAt: s.startsAt,
        className: s.training?.name || 'Class',
        status: e.status,
        createdAtMs: Number.isFinite(createdAtMs) ? createdAtMs : 0,
      });
    }
  }

  rows.sort((a, b) => b.createdAtMs - a.createdAtMs);
  return rows.slice(0, limit).map(({ createdAtMs: _, ...rest }) => rest);
}
