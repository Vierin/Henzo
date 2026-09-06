'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  Dumbbell,
  Globe,
  Instagram,
  Mail,
  MapPin,
  Phone,
  Star,
} from 'lucide-react';
import { ClientHomeHeader } from '@/components/clientHome/clientHomeHeader';
import {
  fetchPublicStudioScheduleClient,
  type PublicScheduleSession,
  type PublicStudioDetail,
} from '@/lib/client/fetch-studio-detail';
import { buildStudioDeepLink } from '@/lib/appOpenFallback';
import { appStoreUrl, playStoreUrl } from '@/constants/appStores';
import { withLocale, type Locale } from '@/i18n/routing';

type Props = {
  studio: PublicStudioDetail;
  initialSessions: PublicScheduleSession[];
  locale: Locale;
};

function formatSessionWhen(iso: string, timeZone?: string) {
  try {
    return new Intl.DateTimeFormat('en', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: timeZone || undefined,
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleString();
  }
}

export function StudioPublicView({ studio, initialSessions, locale }: Props) {
  const [sessions, setSessions] = useState(initialSessions);
  const deepLink = buildStudioDeepLink(studio.slug || studio.id);

  useEffect(() => {
    if (initialSessions.length > 0) return;
    let cancelled = false;
    fetchPublicStudioScheduleClient(studio.id).then((next) => {
      if (!cancelled) setSessions(next);
    });
    return () => {
      cancelled = true;
    };
  }, [initialSessions.length, studio.id]);

  const upcoming = useMemo(
    () =>
      [...sessions]
        .filter((s) => new Date(s.startsAt).getTime() >= Date.now() - 60_000)
        .slice(0, 40),
    [sessions],
  );

  return (
    <div className="min-h-screen bg-[#F9F4F0] font-wix-madefor-display text-[#3F3F3F]">
      <ClientHomeHeader />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <p className="mb-4 text-sm font-medium text-[#E86D4F]">
          <Link href={withLocale('/', locale)} className="hover:underline">
            Home
          </Link>
          {' / '}
          <Link
            href={withLocale('/studios', locale)}
            className="hover:underline"
          >
            Studios
          </Link>
          {' / '}
          {studio.name}
        </p>

        <div className="overflow-hidden rounded-[1.75rem] bg-white shadow-sm">
          <div className="relative aspect-[16/9] w-full bg-[#FFE5DC] sm:aspect-[21/9]">
            {studio.photoUrl ? (
              <Image
                src={studio.photoUrl}
                alt=""
                fill
                priority
                className="object-cover"
                sizes="100vw"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-[#E86D4F]">
                <Dumbbell className="h-16 w-16" />
              </div>
            )}
          </div>

          <div className="grid gap-8 p-5 sm:p-8 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  {studio.name}
                </h1>
                {studio.avgRating && studio.avgRating > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#F9F4F0] px-3 py-1.5 text-sm font-semibold">
                    <Star className="h-4 w-4 fill-[#FFB800] text-[#FFB800]" />
                    {studio.avgRating.toFixed(1)}
                    {studio.reviewCount ? (
                      <span className="font-normal text-[#878787]">
                        ({studio.reviewCount})
                      </span>
                    ) : null}
                  </span>
                ) : null}
              </div>

              {studio.description ? (
                <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-[#5C5C5C]">
                  {studio.description}
                </p>
              ) : null}

              <ul className="mt-6 space-y-3 text-sm text-[#5C5C5C]">
                {studio.address ? (
                  <li className="flex gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#E86D4F]" />
                    <span>{studio.address}</span>
                  </li>
                ) : null}
                {studio.phone ? (
                  <li className="flex gap-2">
                    <Phone className="mt-0.5 h-4 w-4 shrink-0 text-[#E86D4F]" />
                    <a href={`tel:${studio.phone}`} className="hover:underline">
                      {studio.phone}
                    </a>
                  </li>
                ) : null}
                {studio.email ? (
                  <li className="flex gap-2">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0 text-[#E86D4F]" />
                    <a
                      href={`mailto:${studio.email}`}
                      className="hover:underline"
                    >
                      {studio.email}
                    </a>
                  </li>
                ) : null}
                {studio.website ? (
                  <li className="flex gap-2">
                    <Globe className="mt-0.5 h-4 w-4 shrink-0 text-[#E86D4F]" />
                    <a
                      href={studio.website}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline"
                    >
                      Website
                    </a>
                  </li>
                ) : null}
                {studio.instagram ? (
                  <li className="flex gap-2">
                    <Instagram className="mt-0.5 h-4 w-4 shrink-0 text-[#E86D4F]" />
                    <a
                      href={
                        studio.instagram.startsWith('http')
                          ? studio.instagram
                          : `https://instagram.com/${studio.instagram.replace(/^@/, '')}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline"
                    >
                      Instagram
                    </a>
                  </li>
                ) : null}
              </ul>
            </div>

            <aside className="rounded-2xl bg-[#EDE8F5] p-5 sm:p-6">
              <h2 className="text-lg font-bold">Book in the Henzo app</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#5C5C5C]">
                Schedules stay in sync in the app. Open Henzo to reserve your
                spot.
              </p>
              <a
                href={deepLink}
                className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-[#E86D4F] px-4 py-3 text-sm font-semibold text-white hover:bg-[#d85e42]"
              >
                Open in Henzo
              </a>
              <div className="mt-3 flex gap-2">
                <a
                  href={appStoreUrl}
                  className="flex-1 rounded-full border border-[#3F3287]/20 bg-white px-3 py-2 text-center text-xs font-semibold"
                  target="_blank"
                  rel="noreferrer"
                >
                  App Store
                </a>
                <a
                  href={playStoreUrl}
                  className="flex-1 rounded-full border border-[#3F3287]/20 bg-white px-3 py-2 text-center text-xs font-semibold"
                  target="_blank"
                  rel="noreferrer"
                >
                  Google Play
                </a>
              </div>
            </aside>
          </div>
        </div>

        <section className="mt-8">
          <h2 className="text-xl font-bold sm:text-2xl">Upcoming classes</h2>
          <p className="mt-1 text-sm text-[#878787]">
            Read-only schedule. Book from the Henzo app.
          </p>

          {upcoming.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-white p-6 text-sm text-[#878787]">
              No upcoming classes published yet.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-[#EDE8E3] overflow-hidden rounded-2xl bg-white">
              {upcoming.map((session) => (
                <li
                  key={session.id}
                  className="flex flex-col gap-1 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[#3F3F3F]">
                      {session.trainingName || 'Class'}
                    </p>
                    <p className="text-sm text-[#878787]">
                      {formatSessionWhen(session.startsAt, studio.timezone)}
                      {session.trainerName ? ` · ${session.trainerName}` : ''}
                    </p>
                  </div>
                  {session.capacity ? (
                    <p className="shrink-0 text-sm text-[#878787]">
                      {session.enrolledCount ?? 0}/{session.capacity} spots
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
