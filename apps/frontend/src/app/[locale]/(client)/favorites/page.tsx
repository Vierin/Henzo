'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart } from 'lucide-react';
import { StudioCard } from '@/components/studios/studioCard';
import {
  fetchClientFavorites,
  removeFavoriteStudio,
} from '@/lib/client-panel/fetch-favorites';
import { extractLocaleFromPath, withLocale, type Locale } from '@/i18n/routing';

export default function ClientFavoritesPage() {
  const pathname = usePathname();
  const locale = (extractLocaleFromPath(pathname) ?? 'en') as Locale;
  const queryClient = useQueryClient();

  const favoritesQuery = useQuery({
    queryKey: ['client-favorites'],
    queryFn: fetchClientFavorites,
  });

  const removeMutation = useMutation({
    mutationFn: (studioId: string) => removeFavoriteStudio(studioId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['client-favorites'] }),
  });

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold tracking-tight sm:text-[1.75rem]">
        Favorites
      </h1>
      {favoritesQuery.isLoading ? (
        <p className="text-sm text-[#878787]">Loading…</p>
      ) : favoritesQuery.isError ? (
        <p className="text-sm text-red-600">Failed to load favorites</p>
      ) : (favoritesQuery.data?.length ?? 0) === 0 ? (
        <div className="rounded-[14px] bg-white p-6 text-center">
          <Heart className="mx-auto h-8 w-8 text-[#E8E0D8]" aria-hidden />
          <p className="mt-3 text-sm text-[#878787]">No favorite studios yet</p>
          <Link
            href={withLocale('/studios', locale)}
            className="mt-4 inline-block text-sm font-semibold text-[#F15942]"
          >
            Browse studios
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {favoritesQuery.data!.map((studio) => (
            <li key={studio.id} className="relative">
              <StudioCard studio={studio} locale={locale} />
              <button
                type="button"
                disabled={removeMutation.isPending}
                onClick={() => removeMutation.mutate(studio.id)}
                className="absolute right-3 top-3 z-10 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-[#F15942] shadow-sm disabled:opacity-50"
                aria-label={`Remove ${studio.studioName} from favorites`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
