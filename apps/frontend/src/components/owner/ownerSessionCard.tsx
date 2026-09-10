'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Globe, Link2, MapPin, UserRound } from 'lucide-react';
import type { OwnerTrainingSession } from '@/lib/owner/types';
import { ownerTheme } from '@/lib/owner/owner-theme';
import {
  formatOwnerTime24h,
  isPlaceholderTrainerName,
  trainingLanguageLabel,
} from '@/lib/owner/format-time';
import { copyTextToClipboard } from '@/lib/owner/booking-link';

function progressColor(ratio: number, accent: string) {
  if (ratio < 0.5) return '#E26152';
  if (ratio < 1) return '#B7D356';
  return accent;
}

export type OwnerSessionCardProps = {
  session: OwnerTrainingSession;
  href: string;
  /** Left column under time. Default: duration (`60 min`). */
  secondaryTimeLabel?: string;
  /** Show capacity fill on the right. Default true. */
  showCapacity?: boolean;
  /** Dim past/completed sessions. Default true. */
  dimPast?: boolean;
  className?: string;
};

/** Mobile `OwnerDailyScheduleSessionCard` parity — reuse across owner web. */
export function OwnerSessionCard({
  session,
  href,
  secondaryTimeLabel,
  showCapacity = true,
  dimPast = true,
  className = '',
}: OwnerSessionCardProps) {
  const accent = session.training?.displayColor || ownerTheme.accent;
  const capacity = session.capacity || 0;
  const enrolled = session.enrolledCount || 0;
  const ratio = capacity > 0 ? Math.min(1, enrolled / capacity) : 0;
  const fillLabel = capacity > 0 ? `${enrolled}/${capacity}` : String(enrolled);

  const starts = new Date(session.startsAt);
  const ends = new Date(session.endsAt);
  const durationMin = Math.max(
    0,
    Math.round((ends.getTime() - starts.getTime()) / 60000),
  );

  const isCompleted = session.status === 'COMPLETED';
  const isPast = ends.getTime() < Date.now() || isCompleted;
  const opacity = dimPast && isPast ? (isCompleted ? 0.5 : 0.65) : 1;

  const language = trainingLanguageLabel(session.training?.language);
  const trainerRaw = session.trainer?.name?.trim() || '';
  const trainer = isPlaceholderTrainerName(trainerRaw) ? '' : trainerRaw;
  const location = session.locationName?.trim() || '';
  const underTime = secondaryTimeLabel ?? `${durationMin} min`;

  return (
    <Link
      href={href}
      className={`flex overflow-hidden rounded-[14px] bg-white ${className}`}
      style={{ opacity }}
    >
      <span
        className="w-1 shrink-0 self-stretch"
        style={{ backgroundColor: accent }}
        aria-hidden
      />

      <div className="flex w-[72px] shrink-0 flex-col items-start justify-center py-3 pl-3 pr-3">
        <span
          className="text-[17px] font-semibold leading-none tracking-tight tabular-nums"
          style={{ color: ownerTheme.text }}
        >
          {formatOwnerTime24h(session.startsAt)}
        </span>
        <span className="mt-2 text-[11px] font-semibold leading-none text-[#A4A4A4]">
          {underTime}
        </span>
      </div>

      <span
        className="w-px shrink-0 self-stretch"
        style={{ backgroundColor: accent }}
        aria-hidden
      />

      <div className="flex min-w-0 flex-1 items-center gap-2 py-2.5 pl-3.5 pr-3">
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-[17px] font-bold leading-snug tracking-tight"
            style={{ color: ownerTheme.text }}
          >
            {session.training?.name || 'Class'}
          </p>

          {language ? (
            <p
              className="mt-2 flex items-center gap-1.5 text-sm"
              style={{ color: ownerTheme.text }}
            >
              <Globe
                className="h-[13px] w-[13px] shrink-0"
                style={{ color: '#4D39A8' }}
              />
              <span className="truncate">{language}</span>
            </p>
          ) : null}

          {trainer ? (
            <p
              className={`flex items-center gap-1.5 text-sm ${language ? 'mt-1.5' : 'mt-2'}`}
              style={{ color: ownerTheme.text }}
            >
              <UserRound
                className="h-[14px] w-[14px] shrink-0"
                style={{ color: '#4D39A8' }}
              />
              <span className="truncate">{trainer}</span>
            </p>
          ) : null}

          {location ? (
            <p
              className="mt-2 flex items-center gap-1.5 text-sm"
              style={{ color: ownerTheme.text }}
            >
              <MapPin className="h-[14px] w-[14px] shrink-0 text-[#4D39A8]" />
              <span className="truncate">{location}</span>
            </p>
          ) : null}
        </div>

        {showCapacity ? (
          <div className="flex w-[55px] shrink-0 flex-col items-center justify-center">
            <span
              className="text-[15px] font-medium tabular-nums"
              style={{ color: ownerTheme.text }}
            >
              {fillLabel}
            </span>
            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-[#E5E7EB]">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.round(ratio * 100)}%`,
                  backgroundColor: progressColor(ratio, accent),
                }}
              />
            </div>
          </div>
        ) : null}
      </div>
    </Link>
  );
}

/** Mobile `ScheduleDayEmptyCard` parity (+ optional booking-link CTA). */
export function OwnerScheduleEmptyCard({
  title = 'No trainings scheduled today',
  subtitle,
  bookingLink,
}: {
  title?: string;
  subtitle?: string;
  /** When set, shows a compact “Copy booking link” action. */
  bookingLink?: string;
}) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    if (!bookingLink) return;
    const ok = await copyTextToClipboard(bookingLink);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="flex w-full flex-col gap-3 rounded-[14px] bg-white px-[15px] py-4">
      <div className="flex items-start gap-[19px]">
        <svg
          width="18"
          height="17"
          viewBox="0 0 15 14"
          fill="none"
          className="mt-0.5 shrink-0"
          aria-hidden
        >
          <path
            d="M0.5 5.55556H14.5M3.61111 0.5V1.94444M11.3889 0.5V1.94444M8.21204 13.5H2.98889C2.11769 13.5 1.6821 13.5 1.34935 13.3426C1.05665 13.2041 0.818679 12.9831 0.669548 12.7113C0.5 12.4024 0.5 11.9978 0.5 11.1889V4.25556C0.5 3.44659 0.5 3.04211 0.669548 2.73313C0.818679 2.46133 1.05665 2.24036 1.34935 2.10188C1.6821 1.94444 2.1177 1.94444 2.98889 1.94444H12.0111C12.8823 1.94444 13.3179 1.94444 13.6507 2.10188C13.9433 2.24036 14.1813 2.46133 14.3304 2.73313C14.5 3.04211 14.5 3.44659 14.5 4.25556V7.72222"
            stroke={ownerTheme.accent}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M14.5 13.5L10.5002 9.5"
            stroke={ownerTheme.accent}
            strokeLinecap="round"
          />
          <path
            d="M10.5 13.5L14.4998 9.5"
            stroke={ownerTheme.accent}
            strokeLinecap="round"
          />
        </svg>
        <div className="min-w-0 flex-1">
          <p
            className="text-base font-medium leading-tight tracking-tight"
            style={{ color: ownerTheme.text }}
          >
            {title}
          </p>
          {subtitle ? (
            <p
              className="mt-1 text-sm leading-snug"
              style={{ color: ownerTheme.textSecondary }}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>

      {bookingLink ? (
        <button
          type="button"
          onClick={() => void onCopy()}
          className="inline-flex w-fit items-center justify-center gap-2 self-start rounded-[12px] px-3.5 py-2 text-sm font-semibold transition hover:bg-[#FFF8F4]"
          style={{
            color: ownerTheme.accent,
            boxShadow: `inset 0 0 0 1.5px ${ownerTheme.accent}`,
          }}
        >
          <Link2 className="h-4 w-4" strokeWidth={2.25} />
          {copied ? 'Copied!' : 'Copy booking link'}
        </button>
      ) : null}
    </div>
  );
}
