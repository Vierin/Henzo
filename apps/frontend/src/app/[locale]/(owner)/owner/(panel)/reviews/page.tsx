'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchCurrentStudio, fetchStudioReviews } from '@/lib/owner/api';
import type { StudioReview } from '@/lib/owner/types';

export default function OwnerReviewsPage() {
  const [reviews, setReviews] = useState<StudioReview[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const studio = await fetchCurrentStudio();
      if (!studio?.id) {
        setReviews([]);
        return;
      }
      setReviews(await fetchStudioReviews(studio.id));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#3F3F3F]">Reviews</h1>
      <p className="mt-1 text-sm text-zinc-500">Client feedback</p>
      {loading ? (
        <p className="mt-6 text-sm text-zinc-500">Loading…</p>
      ) : reviews.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-500">No reviews yet.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {reviews.map((r) => (
            <li
              key={r.id}
              className="rounded-xl border border-zinc-100 bg-white p-4"
            >
              <div className="flex items-center justify-between">
                <p className="font-medium text-[#3F3F3F]">
                  {r.clientName ?? 'Client'}
                </p>
                <p className="text-sm text-[#FF6B4A]">{'★'.repeat(r.rating)}</p>
              </div>
              {r.comment ? (
                <p className="mt-2 text-sm text-zinc-600">{r.comment}</p>
              ) : null}
              <p className="mt-2 text-xs text-zinc-400">
                {new Date(r.createdAt).toLocaleDateString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
