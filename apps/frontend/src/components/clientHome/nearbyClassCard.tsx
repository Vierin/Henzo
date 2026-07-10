'use client';

import Link from 'next/link';
import { Heart, MapPin, User } from 'lucide-react';
import {
  formatClassStartTime,
  getCapacityProgress,
  parseHexColor,
  type NearbyClassSession,
} from '@/lib/client/nearby-class-session';
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
  const progress = getCapacityProgress(session.bookedCount, session.capacity);

  const href = `${withLocale('/class', locale)}?${new URLSearchParams({
    studioId: session.studioId,
    sessionId: session.sessionId,
    startsAt: session.startsAt,
  }).toString()}`;

  return (
    <Link
      href={href}
      className="group block w-[min(100%,260px)] shrink-0 snap-start sm:w-[272px]"
    >
      <article className="flex overflow-hidden rounded-[14px] bg-white shadow-[0_4px_20px_-8px_rgba(63,50,135,0.12)] transition group-hover:shadow-[0_8px_28px_-8px_rgba(63,50,135,0.18)]">
        <div className="w-1 shrink-0" style={{ backgroundColor: accent }} />

        <div
          className="flex w-[56px] shrink-0 flex-col border-r px-3 py-2.5"
          style={{ borderColor: accent }}
        >
          <span className="text-[17px] font-semibold leading-none tracking-tight text-[#3F3F3F]">
            {timeLabel}
          </span>
          <span className="mt-2 text-[11px] font-semibold text-[#A4A4A4]">
            {durationLabel}
          </span>
        </div>

        <div className="min-w-0 flex-1 px-3 py-2.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-[15px] font-bold leading-tight text-[#3F3F3F] sm:text-[17px]">
              {session.className}
            </h3>
            <Heart
              className="h-4 w-4 shrink-0 text-[#C8C8C8] transition group-hover:text-[#E86D4F]"
              aria-hidden
            />
          </div>

          <div className="mt-2 flex items-center gap-1 text-sm text-[#3F3F3F]">
            <MapPin
              className="h-3.5 w-3.5 shrink-0 text-[#4D39A8]"
              aria-hidden
            />
            <span className="truncate">{session.locationName}</span>
          </div>

          {session.trainerName ? (
            <div className="mt-1.5 flex items-center gap-1 text-sm text-[#3F3F3F]">
              <User
                className="h-3.5 w-3.5 shrink-0 text-[#4D39A8]"
                aria-hidden
              />
              <span className="truncate">{session.trainerName}</span>
            </div>
          ) : null}
        </div>

        <div className="flex w-[58px] shrink-0 flex-col items-center justify-center px-1.5 py-3">
          <span className="text-[15px] font-medium text-[#3F3F3F]">
            {progress.label}
          </span>
          <div className="mt-1 h-1 w-[55px] overflow-hidden rounded-full bg-[#E8E0D8]">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.max(progress.ratio * 100, session.capacity > 0 ? 8 : 0)}%`,
                backgroundColor: progress.barColor,
              }}
            />
          </div>
        </div>
      </article>
    </Link>
  );
}
