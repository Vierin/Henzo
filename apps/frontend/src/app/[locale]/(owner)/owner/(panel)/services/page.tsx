'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  deleteTraining,
  fetchCurrentStudio,
  fetchTrainings,
} from '@/lib/owner/api';
import type { Training } from '@/lib/owner/types';

export default function OwnerServicesPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) ?? 'en';
  const [studioId, setStudioId] = useState<string | null>(null);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const studio = await fetchCurrentStudio();
      if (!studio?.id) {
        setTrainings([]);
        return;
      }
      setStudioId(studio.id);
      setTrainings(await fetchTrainings(studio.id));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onDelete = async (id: string) => {
    if (!confirm('Delete this class?')) return;
    await deleteTraining(id);
    await load();
  };

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#3F3F3F]">Services</h1>
          <p className="text-sm text-zinc-500">Manage your classes</p>
        </div>
        <Link
          href={`/${locale}/owner/services/new`}
          className="rounded-full bg-[#3F3287] px-4 py-2 text-sm font-medium text-white"
        >
          Add class
        </Link>
      </div>

      {!studioId && !loading ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 p-8 text-center">
          <p className="text-sm text-zinc-500">
            Set up your studio first in Settings.
          </p>
          <Link
            href={`/${locale}/owner/studio`}
            className="mt-2 inline-block text-sm font-medium text-[#3F3287]"
          >
            Studio settings →
          </Link>
        </div>
      ) : loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : trainings.length === 0 ? (
        <p className="text-sm text-zinc-500">No classes yet.</p>
      ) : (
        <ul className="space-y-2">
          {trainings.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between rounded-xl border border-zinc-100 bg-white px-4 py-3"
            >
              <div>
                <p className="font-medium text-[#3F3F3F]">{t.name}</p>
                <p className="text-xs text-zinc-500">
                  {t.duration ?? '—'} min ·{' '}
                  {t.price != null ? `${t.price.toLocaleString()} VND` : '—'}
                  {t.categoryName ? ` · ${t.categoryName}` : ''}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    router.push(`/${locale}/owner/services/new?edit=${t.id}`)
                  }
                  className="text-sm text-[#3F3287]"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => void onDelete(t.id)}
                  className="text-sm text-red-600"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
