'use client';

import { FormEvent, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { extractLocaleFromPath, withLocale, type Locale } from '@/i18n/routing';
import { useOwnerStudio } from '@/contexts/OwnerStudioContext';
import { createTraining } from '@/lib/owner/fetch-trainings';

export default function NewTrainingPage() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = (extractLocaleFromPath(pathname) ?? 'en') as Locale;
  const { studio } = useOwnerStudio();
  const [name, setName] = useState('');
  const [duration, setDuration] = useState('60');
  const [price, setPrice] = useState('1');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!studio?.id) {
      setError('Studio not loaded');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createTraining({
        name: name.trim(),
        duration: Number(duration),
        price: Number(price),
        studioId: studio.id,
        description: description.trim() || undefined,
      });
      router.push(withLocale('/trainings', locale));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg space-y-5">
      <h1 className="text-2xl font-semibold">New training</h1>
      <form
        onSubmit={onSubmit}
        className="bg-white rounded-xl border border-gray-100 p-5 space-y-4"
      >
        <label className="block text-sm">
          <span className="font-medium text-gray-700">Name *</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-gray-700">Duration (min) *</span>
          <input
            required
            type="number"
            min={1}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-gray-700">Price *</span>
          <input
            required
            type="number"
            min={0}
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-gray-700">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-[#ea4b4b] text-white px-4 py-2 text-sm font-medium disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Create'}
          </button>
          <button
            type="button"
            onClick={() => router.push(withLocale('/trainings', locale))}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
