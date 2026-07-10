'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  createRecurringSessions,
  createTraining,
  fetchCurrentStudio,
  fetchTrainingCategories,
  fetchTrainings,
  updateTraining,
  updateTrainingSchedule,
} from '@/lib/owner/api';
import type { TrainingCategory } from '@/lib/owner/types';

export default function OwnerNewServicePageClient() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = (params?.locale as string) ?? 'en';
  const editId = searchParams.get('edit');

  const [studioId, setStudioId] = useState('');
  const [categories, setCategories] = useState<TrainingCategory[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('60');
  const [categoryId, setCategoryId] = useState('');
  const [capacity, setCapacity] = useState('10');
  const [sessionDate, setSessionDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [sessionTime, setSessionTime] = useState('09:00');
  const [recurring, setRecurring] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const studio = await fetchCurrentStudio();
    if (!studio?.id) return;
    setStudioId(studio.id);
    const cats = await fetchTrainingCategories();
    setCategories(cats);
    if (editId) {
      const list = await fetchTrainings(studio.id);
      const t = list.find((x) => x.id === editId);
      if (t) {
        setName(t.name);
        setDescription(t.description ?? '');
        setPrice(t.price != null ? String(t.price) : '');
        setDuration(t.duration != null ? String(t.duration) : '60');
        setCategoryId(
          t.trainingCategoryId != null ? String(t.trainingCategoryId) : '',
        );
      }
    }
  }, [editId]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!studioId) {
      setError('Create your studio in Settings first.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        studioId,
        name: name.trim(),
        price: Number(price) || 0,
        duration: Number(duration) || 60,
        description: description.trim() || undefined,
        trainingCategoryId: categoryId ? Number(categoryId) : undefined,
        language: locale,
      };

      let trainingId = editId ?? '';
      if (editId) {
        await updateTraining(editId, payload);
      } else {
        const created = await createTraining(payload);
        trainingId = created.id;
      }

      if (!editId && sessionDate && sessionTime) {
        const effectiveFrom = new Date(`${sessionDate}T${sessionTime}:00`);
        if (recurring) {
          await createRecurringSessions({
            studioId,
            trainingId,
            capacity: Number(capacity) || 10,
            daysOfWeek: [1, 3, 5],
            startTime: sessionTime,
            weeksCount: 8,
            startsFromDate: effectiveFrom.toISOString(),
            timezone: 'Asia/Ho_Chi_Minh',
          });
        } else {
          await updateTrainingSchedule(trainingId, {
            slots: [
              {
                dayOfWeek: effectiveFrom.getDay(),
                startTime: sessionTime,
                durationMinutes: Number(duration) || 60,
              },
            ],
            effectiveFrom: effectiveFrom.toISOString(),
            capacity: Number(capacity) || 10,
          });
        }
      }

      router.push(`/${locale}/owner/services`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl">
      <Link
        href={`/${locale}/owner/services`}
        className="text-sm text-[#3F3287] hover:underline"
      >
        ← Back to services
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-[#3F3F3F]">
        {editId ? 'Edit class' : 'New class'}
      </h1>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block text-sm font-medium text-zinc-700">
          Name
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2.5"
          />
        </label>
        <label className="block text-sm font-medium text-zinc-700">
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2.5"
          />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="block text-sm font-medium text-zinc-700">
            Price (VND)
            <input
              type="number"
              min={0}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2.5"
            />
          </label>
          <label className="block text-sm font-medium text-zinc-700">
            Duration (min)
            <input
              type="number"
              min={15}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2.5"
            />
          </label>
        </div>
        <label className="block text-sm font-medium text-zinc-700">
          Category
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2.5"
          >
            <option value="">—</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nameEn}
              </option>
            ))}
          </select>
        </label>

        {!editId ? (
          <>
            <div className="border-t border-zinc-100 pt-4">
              <p className="text-sm font-semibold text-zinc-700">
                First session
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label className="block text-sm font-medium text-zinc-700">
                Date
                <input
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2.5"
                />
              </label>
              <label className="block text-sm font-medium text-zinc-700">
                Time
                <input
                  type="time"
                  value={sessionTime}
                  onChange={(e) => setSessionTime(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2.5"
                />
              </label>
            </div>
            <label className="block text-sm font-medium text-zinc-700">
              Capacity
              <input
                type="number"
                min={1}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2.5"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={recurring}
                onChange={(e) => setRecurring(e.target.checked)}
              />
              Recurring (Mon/Wed/Fri for 8 weeks)
            </label>
          </>
        ) : null}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-[#3F3287] px-6 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save class'}
        </button>
      </form>
    </div>
  );
}
