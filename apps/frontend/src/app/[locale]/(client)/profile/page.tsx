'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Heart, MapPin } from 'lucide-react';
import { PopularStudioCard } from '@/components/clientHome/popularStudioCard';
import {
  fetchClientProfileStats,
  fetchClientUser,
} from '@/lib/client-panel/fetch-profile';
import {
  addFavoriteStudio,
  fetchClientFavorites,
  removeFavoriteStudio,
} from '@/lib/client-panel/fetch-favorites';
import { clientTheme } from '@/lib/client-panel/client-theme';
import { extractLocaleFromPath, withLocale, type Locale } from '@/i18n/routing';

function formatCount(value: number | undefined | null): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return Math.floor(value).toLocaleString('en-US');
}

function StatSquare({
  value,
  label,
  background,
  icon,
}: {
  value: string;
  label: string;
  background: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      className="flex min-h-[128px] flex-col justify-between rounded-[14px] px-3 py-3 sm:min-h-[112px] sm:rounded-[16px] sm:px-3.5 sm:py-3.5"
      style={{ backgroundColor: background, color: clientTheme.text }}
    >
      <p className="text-[1.6rem] font-medium leading-none tracking-tight tabular-nums sm:text-[1.75rem]">
        {value}
      </p>
      <div className="flex items-end gap-1.5">
        <span className="mb-0.5 flex items-center justify-center">{icon}</span>
        <span className="text-sm leading-tight sm:text-base">{label}</span>
      </div>
    </div>
  );
}

export default function ClientProfilePage() {
  const pathname = usePathname();
  const locale = (extractLocaleFromPath(pathname) ?? 'en') as Locale;
  const queryClient = useQueryClient();
  const [favoriteBusyId, setFavoriteBusyId] = useState<string | null>(null);

  const userQuery = useQuery({
    queryKey: ['client-user'],
    queryFn: fetchClientUser,
  });

  const statsQuery = useQuery({
    queryKey: ['client-profile-stats'],
    queryFn: fetchClientProfileStats,
  });

  const favoritesQuery = useQuery({
    queryKey: ['client-favorites'],
    queryFn: fetchClientFavorites,
  });

  const toggleFavorite = async (studioId: string) => {
    if (favoriteBusyId) return;
    const list = favoritesQuery.data ?? [];
    const isFav = list.some((s) => s.id === studioId);
    setFavoriteBusyId(studioId);
    try {
      if (isFav) await removeFavoriteStudio(studioId);
      else await addFavoriteStudio(studioId);
      await queryClient.invalidateQueries({ queryKey: ['client-favorites'] });
    } finally {
      setFavoriteBusyId(null);
    }
  };

  const user = userQuery.data;
  const stats = statsQuery.data;
  const favorites = favoritesQuery.data ?? [];
  const displayName = user?.name?.trim() || 'Client';
  const initial = displayName.charAt(0).toUpperCase() || '?';
  const locationLabel =
    [user?.city, user?.country].filter(Boolean).join(', ') || null;

  return (
    <div>
      <h1 className="mb-5 text-[1.75rem] font-bold tracking-tight sm:text-[1.85rem]">
        Profile
      </h1>

      {userQuery.isLoading ? (
        <p className="text-sm text-[#878787]">Loading…</p>
      ) : userQuery.isError || !user ? (
        <p className="text-sm text-red-600">Failed to load profile</p>
      ) : (
        <div className="space-y-5">
          <Link
            href={withLocale('/profile/edit', locale)}
            className="flex w-full items-center gap-3.5 rounded-[18px] bg-white p-4 text-left transition hover:bg-[#FFFCF9]"
          >
            <span
              className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full text-[22px] font-semibold"
              style={{
                backgroundColor: 'rgba(241, 89, 66, 0.15)',
                color: clientTheme.text,
              }}
            >
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                initial
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span
                className="block truncate text-lg font-bold"
                style={{ color: clientTheme.text }}
              >
                {displayName}
              </span>
              {locationLabel ? (
                <span className="mt-1 flex items-center gap-1 text-[13px] text-[#878787]">
                  <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                  <span className="truncate">{locationLabel}</span>
                </span>
              ) : user.email ? (
                <span className="mt-0.5 block truncate text-[13px] text-[#878787]">
                  {user.email}
                </span>
              ) : null}
            </span>
            <ChevronRight
              className="h-5 w-5 shrink-0 text-[#878787]"
              aria-hidden
            />
          </Link>

          <section className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5">
            <StatSquare
              value={
                statsQuery.isLoading ? '—' : formatCount(stats?.classesVisited)
              }
              label="Classes booked"
              background="#C2F600"
              icon={
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src="/images/icons/icon-calendar.svg"
                  alt=""
                  width={20}
                  height={20}
                  aria-hidden
                />
              }
            />
            <StatSquare
              value={
                statsQuery.isLoading ? '—' : formatCount(stats?.activePasses)
              }
              label="Active passes"
              background="#FAD0C5"
              icon={
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src="/images/icons/icon-ticket.svg"
                  alt=""
                  width={18}
                  height={18}
                  className="mt-0.5"
                  aria-hidden
                />
              }
            />
            <StatSquare
              value={
                statsQuery.isLoading ? '—' : formatCount(stats?.upcomingClasses)
              }
              label="Upcoming"
              background="#FFFFFF"
              icon={
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src="/images/icons/icon-flame.svg"
                  alt=""
                  width={22}
                  height={22}
                  aria-hidden
                />
              }
            />
            <StatSquare
              value={
                statsQuery.isLoading ? '—' : formatCount(stats?.reviewsLeft)
              }
              label="Reviews left"
              background="#FFD0C2"
              icon={
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src="/images/icons/icon-star.svg"
                  alt=""
                  width={20}
                  height={20}
                  aria-hidden
                />
              }
            />
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold tracking-tight">Favorites</h2>
              {favorites.length > 0 ? (
                <Link
                  href={withLocale('/favorites', locale)}
                  className="text-sm font-semibold text-[#F15942] hover:underline"
                >
                  See all
                </Link>
              ) : null}
            </div>

            {favoritesQuery.isLoading ? (
              <p className="text-sm text-[#878787]">Loading…</p>
            ) : favorites.length === 0 ? (
              <div className="rounded-[18px] bg-white px-5 py-8 text-center">
                <p
                  className="font-semibold"
                  style={{ color: clientTheme.text }}
                >
                  No favorites yet
                </p>
                <p className="mt-1 text-sm text-[#878787]">
                  Save studios you like to find them faster
                </p>
                <Link
                  href={withLocale('/studios', locale)}
                  className="mt-4 inline-flex rounded-full bg-[#F15942] px-5 py-2.5 text-sm font-semibold text-white"
                >
                  Explore
                </Link>
              </div>
            ) : (
              <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {favorites.slice(0, 8).map((studio) => (
                  <div key={studio.id} className="relative shrink-0">
                    <PopularStudioCard studio={studio} locale={locale} />
                    <button
                      type="button"
                      disabled={favoriteBusyId === studio.id}
                      onClick={() => void toggleFavorite(studio.id)}
                      className="absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/55 shadow-sm backdrop-blur-[2px] disabled:opacity-50 sm:h-10 sm:w-10"
                      aria-label={`Remove ${studio.studioName} from favorites`}
                    >
                      <Heart
                        className="h-5 w-5 fill-[#F15942] text-[#F15942] sm:h-[22px] sm:w-[22px]"
                        aria-hidden
                      />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
