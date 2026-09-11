'use client';

import Link from 'next/link';
import { MapPin, User } from 'lucide-react';
import {
  formatClassStartTime,
  getCapacityProgress,
  parseHexColor,
  type NearbyClassSession,
} from '@/lib/client/nearby-class-session';
import { formatMoney } from '@/lib/format-money';
import { withLocale, type Locale } from '@/i18n/routing';
import { useTranslation } from '@/contexts/LanguageContext';

type Props = {
  session: NearbyClassSession;
  locale: Locale;
};

export function NearbyClassCard({ session, locale }: Props) {
  const t = useTranslation();
  const accent = parseHexColor(session.displayColorHex) ?? '#E86D4F';
  const timeLabel = formatClassStartTime(session.startsAt, locale);
  const durationLabel = String(
    t('homepage.client.nearbyClasses.durationMin'),
  ).replace('{value}', String(session.durationMin));
  const bookLabel = String(t('homepage.client.nearbyClasses.book') || 'Book');
  const progress = getCapacityProgress(session.bookedCount, session.capacity);
  const price =
    session.price != null ? formatMoney(session.price, session.currency) : null;

  const href = `${withLocale('/class', locale)}?${new URLSearchParams({
    studioId: session.studioId,
    sessionId: session.sessionId,
    startsAt: session.startsAt,
  }).toString()}`;

  return (
    <Link
      href={href}
      className="group block w-[min(100%,380px)] shrink-0 snap-start sm:w-[420px]"
    >
      <article className="flex min-h-[112px] overflow-hidden rounded-[16px] bg-white transition sm:min-h-[120px]">
        <div className="w-1.5 shrink-0" style={{ backgroundColor: accent }} />

        <div
          className="flex w-[70px] shrink-0 flex-col justify-center border-r px-3 py-3 sm:w-[76px]"
          style={{ borderColor: accent }}
        >
          <span className="text-[18px] font-semibold leading-none tracking-tight tabular-nums text-[#3F3F3F] sm:text-[19px]">
            {timeLabel}
          </span>
          <span className="mt-2 text-[11px] font-semibold text-[#A4A4A4]">
            {durationLabel}
          </span>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-3 px-3.5 py-3 sm:gap-4 sm:px-4">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[15px] font-bold leading-tight text-[#3F3F3F] sm:text-base">
              {session.className}
            </h3>

            {session.locationName ? (
              <div className="mt-2 flex items-center gap-1.5 text-sm text-[#3F3F3F]">
                <MapPin
                  className="h-3.5 w-3.5 shrink-0 text-[#4D39A8]"
                  aria-hidden
                />
                <span className="truncate">{session.locationName}</span>
              </div>
            ) : null}

            {session.trainerName ? (
              <div
                className={`flex items-center gap-1.5 text-sm text-[#3F3F3F] ${
                  session.locationName ? 'mt-1.5' : 'mt-2'
                }`}
              >
                <User
                  className="h-3.5 w-3.5 shrink-0 text-[#4D39A8]"
                  aria-hidden
                />
                <span className="truncate">{session.trainerName}</span>
              </div>
            ) : null}
          </div>

          <div className="flex w-[58px] shrink-0 flex-col items-center justify-center">
            <span className="text-[14px] font-medium tabular-nums text-[#3F3F3F] sm:text-[15px]">
              {progress.label}
            </span>
            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-[#E8E0D8]">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.round(progress.ratio * 100)}%`,
                  backgroundColor: progress.barColor,
                }}
              />
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-center gap-1.5">
            {price ? (
              <span className="text-[15px] font-semibold tabular-nums text-[#3F3F3F] sm:text-base">
                {price}
              </span>
            ) : null}
            <span className="inline-flex items-center justify-center rounded-lg bg-[#E86D4F] px-3.5 py-2 text-[12px] font-medium text-white transition group-hover:bg-[#d85e42]">
              {bookLabel}
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
