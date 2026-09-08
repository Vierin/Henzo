'use client';

import Link from 'next/link';
import { Globe, MapPin, UserRound } from 'lucide-react';
import type { OwnerTrainingSession } from '@/lib/owner/types';
import { ownerTheme } from '@/lib/owner/owner-theme';
import {
  formatOwnerTime24h,
  isPlaceholderTrainerName,
  trainingLanguageLabel,
} from '@/lib/owner/format-time';

function progressColor(ratio: number, accent: string) {
  if (ratio < 0.5) return '#E26152';
  if (ratio < 1) return '#B7D356';
  return accent;
}

type Props = {
  session: OwnerTrainingSession;
  href: string;
};

/** Mobile `OwnerDailyScheduleSessionCard` parity for owner web. */
export function OwnerSessionCard({ session, href }: Props) {
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
  const opacity = isPast ? (isCompleted ? 0.5 : 0.65) : 1;

  const language = trainingLanguageLabel(session.training?.language);
  const trainerRaw = session.trainer?.name?.trim() || '';
  const trainer = isPlaceholderTrainerName(trainerRaw) ? '' : trainerRaw;
  const location = session.locationName?.trim() || '';

  return (
    <Link
      href={href}
      className="flex overflow-hidden rounded-[14px] bg-white"
      style={{ opacity }}
    >
      <span
        className="w-1 shrink-0 self-stretch"
        style={{ backgroundColor: accent }}
        aria-hidden
      />

      <div className="flex w-14 shrink-0 flex-col items-start py-2.5 pl-3 pr-0">
        <span
          className="text-[17px] font-semibold leading-none tracking-tight tabular-nums"
          style={{ color: ownerTheme.text }}
        >
          {formatOwnerTime24h(session.startsAt)}
        </span>
        <span className="mt-2 text-[11px] font-semibold text-[#A4A4A4]">
          {durationMin} min
        </span>
      </div>

      <span
        className="mx-0 w-px shrink-0 self-stretch"
        style={{ backgroundColor: accent }}
        aria-hidden
      />

      <div className="flex min-w-0 flex-1 items-center gap-2 py-2 pl-3 pr-2">
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-[17px] font-bold leading-snug tracking-tight"
            style={{ color: ownerTheme.text }}
          >
            {session.training?.name || 'Class'}
          </p>

          {language ? (
            <p
              className="mt-2 flex items-center gap-1 text-sm"
              style={{ color: ownerTheme.text }}
            >
              <Globe
                className="h-3.5 w-3.5 shrink-0"
                style={{ color: '#4D39A8' }}
              />
              <span className="truncate">{language}</span>
            </p>
          ) : null}

          {trainer ? (
            <p
              className={`flex items-center gap-1 text-sm ${language ? 'mt-1.5' : 'mt-2'}`}
              style={{ color: ownerTheme.text }}
            >
              <UserRound
                className="h-3.5 w-3.5 shrink-0"
                style={{ color: '#4D39A8' }}
              />
              <span className="truncate">{trainer}</span>
            </p>
          ) : null}

          {location ? (
            <p
              className={`flex items-center gap-1 text-sm ${trainer || language ? 'mt-2' : 'mt-2'}`}
              style={{ color: ownerTheme.text }}
            >
              <MapPin className="h-3.5 w-3.5 shrink-0 text-[#4D39A8]" />
              <span className="truncate">{location}</span>
            </p>
          ) : null}
        </div>

        <div className="flex w-[55px] shrink-0 flex-col items-center justify-center pr-2">
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
      </div>
    </Link>
  );
}
