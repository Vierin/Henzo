'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { extractLocaleFromPath, withLocale, type Locale } from '@/i18n/routing';
import { useOwnerStudio } from '@/contexts/OwnerStudioContext';
import { fetchTrainings } from '@/lib/owner/fetch-trainings';

export default function TrainingsPage() {
  const pathname = usePathname();
  const locale = (extractLocaleFromPath(pathname) ?? 'en') as Locale;
  const { studio } = useOwnerStudio();

  const trainingsQuery = useQuery({
    queryKey: ['owner-trainings', studio?.id],
    queryFn: () => fetchTrainings(studio!.id),
    enabled: Boolean(studio?.id),
  });

  const trainings = trainingsQuery.data ?? [];

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Trainings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Catalog of classes clients can book
          </p>
        </div>
        <Link
          href={withLocale('/trainings/new', locale)}
          className="rounded-lg bg-[#ea4b4b] text-white text-sm font-medium px-4 py-2"
        >
          Add training
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-100">
        {trainingsQuery.isLoading ? (
          <p className="p-5 text-sm text-gray-500">Loading…</p>
        ) : trainingsQuery.isError ? (
          <p className="p-5 text-sm text-red-600">Failed to load trainings</p>
        ) : trainings.length === 0 ? (
          <p className="p-5 text-sm text-gray-500">No trainings yet</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {trainings.map((item) => (
              <li key={item.id}>
                <Link
                  href={withLocale(`/trainings/${item.id}/edit`, locale)}
                  className="flex items-center justify-between px-5 py-4 hover:bg-gray-50"
                >
                  <div>
                    <div className="font-medium text-gray-900">{item.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {item.duration} min · {item.price}
                    </div>
                  </div>
                  <span className="text-xs text-[#ea4b4b]">Edit</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
