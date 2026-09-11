'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { extractLocaleFromPath, withLocale, type Locale } from '@/i18n/routing';
import { useOwnerStudio } from '@/contexts/OwnerStudioContext';
import { fetchTrainingCategories } from '@/lib/client/fetch-training-categories';
import type { PublicTrainingCategory } from '@/lib/client/training-category';
import {
  fetchTrainings,
  updateTraining,
  updateTrainingSchedule,
  updateTrainingSessionDefaults,
} from '@/lib/owner/fetch-trainings';
import { fetchOwnerSessions } from '@/lib/owner/fetch-owner-sessions';
import {
  extraLocationsToJson,
  listTrainingLocations,
} from '@/lib/owner/training-locations';
import { normalizeHm, todayInputValue } from '@/lib/owner/add-training-date';
import { ownerTheme } from '@/lib/owner/owner-theme';
import {
  OwnerDateField,
  OwnerTimeField,
} from '@/components/owner/ownerSchedulePickers';
import { ToggleSwitch } from '@/components/owner/ownerSettingsStudioModals';
import { OwnerLocationField } from '@/components/owner/ownerLocationField';
import { OwnerSelect } from '@/components/owner/ownerSelect';
import { OwnerTrainingLocationsModal } from '@/components/owner/ownerTrainingLocationsModal';
import type { OwnerTraining } from '@/lib/owner/types';
import {
  formatPriceInput,
  parsePriceInput,
  parseStudioCurrency,
  priceInputPlaceholder,
} from '@/lib/format-money';

const MAX_DURATION = 480;
const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'ru', label: 'Русский' },
  { code: 'vi', label: 'Tiếng Việt' },
] as const;

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;
const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEKDAY_FULL = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

function categoryLabel(c: PublicTrainingCategory, locale: Locale): string {
  if (locale === 'ru' && c.nameRu) return c.nameRu;
  if (locale === 'vi' && c.nameVn) return c.nameVn;
  return c.nameEn;
}

function isoWeekday(d: Date): number {
  const wd = d.getDay();
  return wd === 0 ? 7 : wd;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="mb-1.5 block text-[13px] font-medium"
      style={{ color: ownerTheme.textSecondary }}
    >
      {children}
    </span>
  );
}

const inputClass =
  'w-full rounded-xl border-0 bg-white px-3.5 py-3 text-[15px] outline-none';

export function EditTrainingForm({ trainingId }: { trainingId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = (extractLocaleFromPath(pathname) ?? 'en') as Locale;
  const { studio, patchStudio } = useOwnerStudio();
  const currency = parseStudioCurrency(studio?.currency);

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [locationId, setLocationId] = useState('default');
  const [locationsOpen, setLocationsOpen] = useState(false);
  const [localLocations, setLocalLocations] = useState(() =>
    listTrainingLocations(studio),
  );
  const [duration, setDuration] = useState('60');
  const [capacity, setCapacity] = useState('10');
  const [price, setPrice] = useState('');
  const [language, setLanguage] = useState('en');
  const [description, setDescription] = useState('');
  const [applySchedule, setApplySchedule] = useState(false);
  const [recurringDays, setRecurringDays] = useState<number[]>([]);
  const [dayTimes, setDayTimes] = useState<Record<number, string>>({});
  const [applyFromToday, setApplyFromToday] = useState(true);
  const [effectiveFrom, setEffectiveFrom] = useState(todayInputValue);
  const [initialCapacity, setInitialCapacity] = useState(10);
  const [initialLocationId, setInitialLocationId] = useState('default');
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [scheduleNote, setScheduleNote] = useState<string | null>(null);

  const categoriesQuery = useQuery({
    queryKey: ['training-categories'],
    queryFn: fetchTrainingCategories,
  });

  const trainingsQuery = useQuery({
    queryKey: ['owner-trainings', studio?.id],
    queryFn: () => fetchTrainings(studio!.id),
    enabled: Boolean(studio?.id),
  });

  const sessionsQuery = useQuery({
    queryKey: ['owner-sessions-edit-defaults', trainingId],
    queryFn: () => {
      const from = new Date();
      const to = new Date();
      to.setMonth(to.getMonth() + 3);
      return fetchOwnerSessions({
        from: from.toISOString(),
        to: to.toISOString(),
      });
    },
    enabled: Boolean(trainingId),
  });

  const categories = categoriesQuery.data ?? [];

  useEffect(() => {
    setLocalLocations(listTrainingLocations(studio));
  }, [studio]);

  const selectedLocation =
    localLocations.find((l) => l.id === locationId) ??
    localLocations[0] ??
    null;
  const existing = useMemo(
    () => trainingsQuery.data?.find((t) => t.id === trainingId) ?? null,
    [trainingsQuery.data, trainingId],
  );

  useEffect(() => {
    if (!existing || hydrated) return;
    seedFromTraining(existing);
    setHydrated(true);
  }, [existing, hydrated]);

  useEffect(() => {
    if (!sessionsQuery.data || !hydrated) return;
    const mine = sessionsQuery.data
      .filter((s) => s.trainingId === trainingId)
      .sort(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      );
    if (mine.length === 0) return;

    const first = mine[0]!;
    const cap = first.capacity || 10;
    setCapacity(String(cap));
    setInitialCapacity(cap);

    const loc = first.locationId?.trim();
    if (loc) {
      setLocationId(loc);
      setInitialLocationId(loc);
    }

    const days = new Set<number>();
    const times: Record<number, string> = {};
    for (const s of mine) {
      const d = new Date(s.startsAt);
      const wd = isoWeekday(d);
      days.add(wd);
      if (!times[wd]) {
        times[wd] =
          `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      }
    }
    if (days.size > 0) {
      const sorted = [...days].sort((a, b) => a - b);
      setRecurringDays(sorted);
      setDayTimes(times);
    }
  }, [sessionsQuery.data, trainingId, hydrated]);

  function seedFromTraining(t: OwnerTraining) {
    setName(t.name);
    setDuration(String(t.duration > 0 ? t.duration : 60));
    const amount = Number(t.price) || 0;
    setPrice(
      currency === 'VND'
        ? formatPriceInput(String(Math.round(amount)), currency)
        : formatPriceInput(String(amount), currency),
    );
    setDescription((t.description ?? '').trim());
    setLanguage(t.language || 'en');
    if (t.trainingCategoryId != null) {
      setCategoryId(String(t.trainingCategoryId));
    }
  }

  const toggleDay = (day: number) => {
    setRecurringDays((prev) => {
      const next = prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day].sort((a, b) => a - b);
      setDayTimes((times) => {
        const copy = { ...times };
        if (next.includes(day) && !copy[day]) {
          copy[day] = '09:00';
        }
        if (!next.includes(day)) delete copy[day];
        return copy;
      });
      return next;
    });
  };

  const onSave = async () => {
    if (!studio?.id || !trainingId) return;

    const d = Number(duration) || 0;
    const c = Number(capacity) || 0;
    const p = parsePriceInput(price, currency);
    if (!name.trim()) {
      setError('Enter a training name');
      return;
    }
    if (d < 1 || d > MAX_DURATION || c < 1 || c > 30 || p <= 0) {
      setError('Check duration, capacity and price');
      return;
    }
    if (categories.length > 0 && !categoryId) {
      setError('Pick a category');
      return;
    }
    if (applySchedule && recurringDays.length === 0) {
      setError('Select at least one weekday');
      return;
    }

    setSaving(true);
    setError(null);
    setScheduleNote(null);
    try {
      await updateTraining(trainingId, {
        name: name.trim(),
        duration: d,
        price: p,
        description: description.trim() || undefined,
        language: language || undefined,
        trainingCategoryId: categoryId ? Number(categoryId) : null,
      });

      const loc =
        locationId && locationId !== 'default' ? locationId : undefined;
      const capacityChanged = initialCapacity !== c;
      const locationChanged = initialLocationId !== locationId;

      if (applySchedule) {
        const effective = applyFromToday
          ? new Date().toISOString()
          : new Date(`${effectiveFrom}T00:00:00`).toISOString();
        const res = await updateTrainingSchedule(trainingId, {
          slots: recurringDays.map((day) => ({
            day,
            startTime: normalizeHm(dayTimes[day] || '09:00'),
          })),
          effectiveFrom: effective,
          capacity: c,
          locationId: loc,
        });
        const created = res.createdCount ?? 0;
        const skipped =
          (res.skippedBookedCount ?? 0) +
          (res.skippedConflicts ?? 0) +
          (res.removedCount ?? 0);
        setScheduleNote(
          `Schedule updated · ${created} created · ${skipped} skipped/removed`,
        );
      } else if (capacityChanged || locationChanged) {
        await updateTrainingSessionDefaults(trainingId, {
          capacity: capacityChanged ? c : undefined,
          locationId: locationChanged ? loc : undefined,
        });
      }

      router.push(withLocale('/trainings', locale));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const fieldStyle = { color: ownerTheme.text };

  if (trainingsQuery.isLoading) {
    return (
      <p className="text-sm" style={{ color: ownerTheme.textSecondary }}>
        Loading…
      </p>
    );
  }

  if (!existing) {
    return <p className="text-sm text-red-600">Training not found</p>;
  }

  return (
    <div className="mx-auto max-w-xl space-y-5 pb-10">
      <div>
        <h1
          className="text-2xl font-semibold"
          style={{ color: ownerTheme.text }}
        >
          Edit training
        </h1>
      </div>

      <div className="space-y-5">
        <label className="block">
          <FieldLabel>Training name *</FieldLabel>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            style={fieldStyle}
          />
        </label>

        {categories.length > 0 ? (
          <label className="block">
            <FieldLabel>Category *</FieldLabel>
            <OwnerSelect
              value={categoryId}
              onChange={setCategoryId}
              placeholder="Pick category"
              options={categories.map((c) => ({
                value: String(c.id),
                label: categoryLabel(c, locale),
              }))}
            />
          </label>
        ) : null}

        {selectedLocation ? (
          <>
            <OwnerLocationField
              label="Address"
              name={selectedLocation.name}
              address={selectedLocation.address}
              onClick={() => setLocationsOpen(true)}
            />
            <OwnerTrainingLocationsModal
              open={locationsOpen}
              mode="pick"
              selectedId={locationId}
              locations={localLocations}
              mainStudioName={studio?.name?.trim() || 'Main studio'}
              onClose={() => setLocationsOpen(false)}
              onSelect={(id) => {
                setLocationId(id);
                setLocationsOpen(false);
              }}
              onChange={(next) => {
                setLocalLocations(next.locations);
                void patchStudio({
                  address: next.address,
                  latitude: next.lat,
                  longitude: next.lon,
                  reminderSettings: {
                    ...(studio?.reminderSettings ?? {}),
                    defaultLocationName: next.locationName,
                    trainingLocations: extraLocationsToJson(next.locations),
                  },
                });
              }}
            />
          </>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <FieldLabel>Duration (min) *</FieldLabel>
            <input
              type="number"
              min={1}
              max={MAX_DURATION}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className={inputClass}
              style={fieldStyle}
            />
          </label>
          <label className="block">
            <FieldLabel>Capacity *</FieldLabel>
            <input
              type="number"
              min={1}
              max={30}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              className={inputClass}
              style={fieldStyle}
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <FieldLabel>Price ({currency}) *</FieldLabel>
            <input
              inputMode={currency === 'VND' ? 'numeric' : 'decimal'}
              value={price}
              onChange={(e) =>
                setPrice(formatPriceInput(e.target.value, currency))
              }
              placeholder={priceInputPlaceholder(currency)}
              className={inputClass}
              style={fieldStyle}
            />
          </label>
          <label className="block">
            <FieldLabel>Language</FieldLabel>
            <OwnerSelect
              value={language}
              onChange={setLanguage}
              options={LANGS.map((l) => ({
                value: l.code,
                label: l.label,
              }))}
            />
          </label>
        </div>

        <label className="block">
          <FieldLabel>Description (optional)</FieldLabel>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="What clients should expect…"
            className={inputClass}
            style={fieldStyle}
          />
        </label>

        <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-3.5 py-3">
          <span
            className="text-[15px] font-medium"
            style={{ color: ownerTheme.text }}
          >
            Edit all future sessions
          </span>
          <ToggleSwitch checked={applySchedule} onChange={setApplySchedule} />
        </div>

        {applySchedule ? (
          <div className="space-y-4">
            <div>
              <FieldLabel>Repeat on</FieldLabel>
              <div className="mt-1.5 flex gap-1.5">
                {WEEKDAYS.map((day, i) => {
                  const on = recurringDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className="flex h-10 flex-1 items-center justify-center rounded-xl text-xs font-semibold"
                      style={{
                        backgroundColor: on ? ownerTheme.accent : '#fff',
                        color: on ? '#fff' : ownerTheme.text,
                      }}
                    >
                      {WEEKDAY_SHORT[i]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <FieldLabel>Schedule</FieldLabel>
              <p
                className="mb-2 text-xs"
                style={{ color: ownerTheme.textSecondary }}
              >
                Set a start time for each selected day
              </p>
              <div className="space-y-2">
                {[...recurringDays]
                  .sort((a, b) => a - b)
                  .map((day) => (
                    <div
                      key={day}
                      className="flex items-center gap-3 rounded-xl bg-white px-3 py-2"
                    >
                      <span
                        className="w-[110px] shrink-0 text-sm font-bold"
                        style={{ color: ownerTheme.text }}
                      >
                        {WEEKDAY_FULL[day - 1]}
                      </span>
                      <div className="min-w-0 flex-1">
                        <OwnerTimeField
                          value={dayTimes[day] || '09:00'}
                          onChange={(v) =>
                            setDayTimes((prev) => ({ ...prev, [day]: v }))
                          }
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-3.5 py-3">
              <span
                className="text-[15px] font-medium"
                style={{ color: ownerTheme.text }}
              >
                Apply from today
              </span>
              <ToggleSwitch
                checked={applyFromToday}
                onChange={setApplyFromToday}
              />
            </div>

            {!applyFromToday ? (
              <div>
                <FieldLabel>Change start date</FieldLabel>
                <OwnerDateField
                  value={effectiveFrom}
                  onChange={setEffectiveFrom}
                  locale={locale}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {scheduleNote ? (
          <p className="text-sm" style={{ color: ownerTheme.textSecondary }}>
            {scheduleNote}
          </p>
        ) : null}

        <div className="flex gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => router.push(withLocale('/trainings', locale))}
            className="flex-1 rounded-[14px] bg-white py-3.5 text-[15px] font-semibold"
            style={{ color: ownerTheme.text }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || sessionsQuery.isLoading}
            onClick={() => void onSave()}
            className="flex-1 rounded-[14px] py-3.5 text-[15px] font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: ownerTheme.accent }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
