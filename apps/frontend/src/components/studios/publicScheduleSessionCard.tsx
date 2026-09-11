'use client';

import Link from 'next/link';
import { MapPin, UserRound } from 'lucide-react';
import type { PublicScheduleSession } from '@/lib/client/fetch-studio-detail';
import { formatMoney, type StudioCurrency } from '@/lib/format-money';
import {
  formatOwnerTime24h,
  isPlaceholderTrainerName,
} from '@/lib/owner/format-time';
import type { Locale } from '@/i18n/routing';

function formatDayMonth(iso: string, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
    }).format(new Date(iso));
  } catch {
    return '';
  }
}

export function PublicScheduleSessionCard({
  session,
  locale,
  currency,
  studioId,
  timeSubLabel = 'date',
}: {
  session: PublicScheduleSession;
  locale: Locale;
  currency: StudioCurrency;
  studioId: string;
  /** @deprecated unused — do not fall back to studio name as location */
  studioName?: string;
  /** Under the start time: calendar date (list) or duration (day calendar). */
  timeSubLabel?: 'date' | 'duration';
}) {
  const accent = session.displayColor || '#E86D4F';
  const capacity = session.capacity ?? 0;
  const enrolled = session.enrolledCount ?? 0;
  const ratio = capacity > 0 ? Math.min(1, enrolled / capacity) : 0;
  const fillLabel = capacity > 0 ? `${enrolled}/${capacity}` : String(enrolled);
  const showCapacity = capacity > 0 || enrolled > 0;
  const price =
    session.price != null && Number.isFinite(session.price) && session.price > 0
      ? formatMoney(session.price, currency)
      : null;
  const dayLabel = formatDayMonth(session.startsAt, locale);
  const trainerRaw = session.trainerName?.trim() || '';
  const trainer = isPlaceholderTrainerName(trainerRaw) ? '' : trainerRaw;
  const place = session.locationName?.trim() || '';
  const subLabel =
    timeSubLabel === 'duration'
      ? session.durationMinutes
        ? `${session.durationMinutes} min`
        : '—'
      : dayLabel ||
        (session.durationMinutes ? `${session.durationMinutes} min` : '—');
  const bookHref = `/${locale}/class?${new URLSearchParams({
    studioId,
    sessionId: session.id,
    startsAt: session.startsAt,
  }).toString()}`;

  return (
    <article className="flex overflow-hidden rounded-[14px] bg-white">
      <span
        className="w-1 shrink-0 self-stretch"
        style={{ backgroundColor: accent }}
        aria-hidden
      />

      <div className="flex w-[56px] shrink-0 flex-col items-start justify-center py-3 pl-3 pr-2 sm:w-[72px] sm:pl-3 sm:pr-3">
        <span className="text-[17px] font-semibold leading-none tracking-tight tabular-nums text-[#3F3F3F]">
          {formatOwnerTime24h(session.startsAt)}
        </span>
        <span className="mt-2 text-[11px] font-semibold leading-none text-[#A4A4A4]">
          {subLabel}
        </span>
      </div>

      <span
        className="w-px shrink-0 self-stretch"
        style={{ backgroundColor: accent }}
        aria-hidden
      />

      {/* Mobile: title + meta get the width; capacity under title; price/book on the right — app parity */}
      <div className="flex min-w-0 flex-1 items-stretch gap-2 py-2.5 pl-3 pr-2.5 sm:hidden">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight text-[#3F3F3F]">
            {session.trainingName || 'Class'}
          </p>

          {place ? (
            <p className="mt-1.5 flex items-center gap-1 text-[13px] text-[#3F3F3F]">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-[#4D39A8]" />
              <span className="min-w-0 truncate">{place}</span>
            </p>
          ) : null}

          {trainer ? (
            <p
              className={`flex items-center gap-1 text-[13px] text-[#3F3F3F] ${place ? 'mt-1' : 'mt-1.5'}`}
            >
              <UserRound className="h-3.5 w-3.5 shrink-0 text-[#4D39A8]" />
              <span className="min-w-0 truncate">{trainer}</span>
            </p>
          ) : null}

          {showCapacity ? (
            <div className="mt-2 max-w-[120px]">
              <span className="text-[12px] font-medium tabular-nums text-[#878787]">
                {fillLabel} spots
              </span>
              <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-[#E5E7EB]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.round(ratio * 100)}%`,
                    backgroundColor: accent,
                  }}
                />
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col items-end justify-center gap-2 pl-1">
          {price ? (
            <span className="max-w-[5.5rem] text-right text-[13px] font-semibold leading-tight tabular-nums text-[#3F3F3F]">
              {price}
            </span>
          ) : null}
          <Link
            href={bookHref}
            className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[#E86D4F] px-3 py-2 text-[12px] font-medium text-white hover:bg-[#d85e42]"
          >
            Book
          </Link>
        </div>
      </div>

      {/* Desktop: denser single row */}
      <div className="hidden min-w-0 flex-1 items-center gap-3 py-2.5 pl-3.5 pr-3 sm:flex">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[17px] font-medium leading-snug tracking-tight text-[#3F3F3F]">
            {session.trainingName || 'Class'}
          </p>

          {place ? (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-[#3F3F3F]">
              <MapPin className="h-[14px] w-[14px] shrink-0 text-[#4D39A8]" />
              <span className="truncate">{place}</span>
            </p>
          ) : null}

          {trainer ? (
            <p
              className={`flex items-center gap-1.5 text-sm text-[#3F3F3F] ${place ? 'mt-1.5' : 'mt-2'}`}
            >
              <UserRound
                className="h-[14px] w-[14px] shrink-0"
                style={{ color: '#4D39A8' }}
              />
              <span className="truncate">{trainer}</span>
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-5">
          {showCapacity ? (
            <div className="flex w-[72px] flex-col items-center gap-1">
              <span className="text-[15px] font-medium tabular-nums text-[#3F3F3F]">
                {fillLabel}
              </span>
              <div className="h-1 w-full overflow-hidden rounded-full bg-[#E5E7EB]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.round(ratio * 100)}%`,
                    backgroundColor: accent,
                  }}
                />
              </div>
            </div>
          ) : null}

          <div className="flex flex-col items-center gap-1.5">
            {price ? (
              <span className="text-[13px] font-medium tabular-nums text-[#3F3F3F]">
                {price}
              </span>
            ) : null}
            <Link
              href={bookHref}
              className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[#E86D4F] px-3.5 py-2 text-[12px] font-medium text-white hover:bg-[#d85e42]"
            >
              Book
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
