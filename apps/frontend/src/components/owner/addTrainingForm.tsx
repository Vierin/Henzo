'use client';

import { useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { extractLocaleFromPath, withLocale, type Locale } from '@/i18n/routing';
import { useOwnerStudio } from '@/contexts/OwnerStudioContext';
import { fetchTrainingCategories } from '@/lib/client/fetch-training-categories';
import type { PublicTrainingCategory } from '@/lib/client/training-category';
import { createTraining, fetchTrainings } from '@/lib/owner/fetch-trainings';
import { createRecurringTrainingSessions } from '@/lib/owner/fetch-recurring-sessions';
import { fetchStaff } from '@/lib/owner/fetch-staff';
import {
  fetchOwnerSubscription,
  planBadgeLabel,
} from '@/lib/owner/fetch-subscription';
import { studioTrainingLocations } from '@/lib/owner/training-locations';
import {
  addMonthsInputValue,
  dateInputToApiDay,
  isoWeekdayFromDateInput,
  normalizeHm,
  todayInputValue,
  weeksCountInclusive,
} from '@/lib/owner/add-training-date';
import { ownerTheme } from '@/lib/owner/owner-theme';
import {
  OwnerDateField,
  OwnerTimeField,
} from '@/components/owner/ownerSchedulePickers';
import { formatPriceDots, parsePriceDots } from '@/lib/owner/format-price';

const MAX_DURATION = 480;
const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'ru', label: 'Русский' },
  { code: 'vi', label: 'Tiếng Việt' },
] as const;

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;
const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function categoryLabel(c: PublicTrainingCategory, locale: Locale): string {
  if (locale === 'ru' && c.nameRu) return c.nameRu;
  if (locale === 'vi' && c.nameVn) return c.nameVn;
  return c.nameEn;
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

export function AddTrainingForm() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = (extractLocaleFromPath(pathname) ?? 'en') as Locale;
  const { studio } = useOwnerStudio();

  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [locationId, setLocationId] = useState('default');
  const [duration, setDuration] = useState('60');
  const [capacity, setCapacity] = useState('10');
  const [price, setPrice] = useState('');
  const [language, setLanguage] = useState('en');
  const [description, setDescription] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [sessionDate, setSessionDate] = useState(todayInputValue);
  const [sessionTime, setSessionTime] = useState('09:00');
  const [endDate, setEndDate] = useState(() =>
    addMonthsInputValue(todayInputValue(), 2),
  );
  const [recurringDays, setRecurringDays] = useState<number[]>([1, 3, 5]);
  const [dayTimes, setDayTimes] = useState<Record<number, string>>({
    1: '09:00',
    3: '09:00',
    5: '09:00',
  });
  const [trainerId, setTrainerId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);

  const categoriesQuery = useQuery({
    queryKey: ['training-categories'],
    queryFn: fetchTrainingCategories,
  });

  const trainingsQuery = useQuery({
    queryKey: ['owner-trainings', studio?.id],
    queryFn: () => fetchTrainings(studio!.id),
    enabled: Boolean(studio?.id),
  });

  const staffQuery = useQuery({
    queryKey: ['owner-staff', studio?.id],
    queryFn: () => fetchStaff(studio!.id),
    enabled: Boolean(studio?.id),
  });

  const subQuery = useQuery({
    queryKey: ['owner-subscription'],
    queryFn: fetchOwnerSubscription,
  });

  const categories = categoriesQuery.data ?? [];
  const existing = trainingsQuery.data ?? [];
  const trainers = staffQuery.data ?? [];
  const locations = useMemo(() => studioTrainingLocations(studio), [studio]);
  const isPro = planBadgeLabel(subQuery.data ?? null) !== 'Solo';

  const nameSuggestions = useMemo(() => {
    const q = name.trim().toLowerCase();
    const sorted = [...existing].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
    );
    // Mobile RawAutocomplete: empty query → first 8; typed → filter take 8
    if (!q) return sorted.slice(0, 8);
    return sorted.filter((t) => t.name.toLowerCase().includes(q)).slice(0, 8);
  }, [existing, name]);

  const applyExisting = (id: string) => {
    const found = existing.find((t) => t.id === id);
    if (!found) return;
    setName(found.name);
    if (found.duration > 0) setDuration(String(found.duration));
    if (found.price > 0)
      setPrice(formatPriceDots(Math.round(Number(found.price))));
    if (found.trainingCategoryId != null) {
      setCategoryId(String(found.trainingCategoryId));
    }
    if (found.language) setLanguage(found.language);
    setDescription((found.description ?? '').trim());
    setNameFocused(false);
    setError(null);
  };

  const toggleDay = (day: number) => {
    setRecurringDays((prev) => {
      const next = prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day].sort((a, b) => a - b);
      setDayTimes((times) => {
        const copy = { ...times };
        if (next.includes(day) && !copy[day]) {
          copy[day] = sessionTime || '09:00';
        }
        if (!next.includes(day)) delete copy[day];
        return copy;
      });
      return next;
    });
  };

  const validateStep1 = (): boolean => {
    const d = Number(duration) || 0;
    const c = Number(capacity) || 0;
    const p = parsePriceDots(price);
    if (!name.trim()) {
      setError('Enter a training name');
      return false;
    }
    if (d < 1 || d > MAX_DURATION) {
      setError('Duration must be 1–480 minutes');
      return false;
    }
    if (c < 1 || c > 30) {
      setError('Capacity must be 1–30');
      return false;
    }
    if (p <= 0) {
      setError('Enter a price');
      return false;
    }
    if (categories.length > 0 && !categoryId) {
      setError('Pick a category');
      return false;
    }
    setError(null);
    return true;
  };

  const onNext = () => {
    if (!validateStep1()) return;
    setStep(2);
  };

  const onSave = async () => {
    if (!studio?.id) {
      setError('Studio not loaded');
      return;
    }
    if (!validateStep1()) {
      setStep(1);
      return;
    }
    if (isRecurring) {
      if (recurringDays.length === 0) {
        setError('Select at least one weekday');
        return;
      }
      if (!endDate || endDate < sessionDate) {
        setError('End date must be on or after start date');
        return;
      }
      const maxEnd = addMonthsInputValue(sessionDate, 2);
      if (endDate > maxEnd) {
        setError('Range max is 2 months');
        return;
      }
    } else if (!sessionTime) {
      setError('Pick a time');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const trimmedName = name.trim();
      let trainingId =
        existing.find((t) => t.name.trim() === trimmedName)?.id ?? null;

      if (!trainingId) {
        const created = await createTraining({
          name: trimmedName,
          duration: Number(duration),
          price: parsePriceDots(price),
          studioId: studio.id,
          description: description.trim() || undefined,
          language: language || undefined,
          trainingCategoryId: categoryId ? Number(categoryId) : undefined,
          trainerIds: isPro && trainerId ? [trainerId] : [],
        });
        trainingId = created.id;
      }

      const capacityN = Number(capacity) || 10;
      const loc =
        locationId && locationId !== 'default' ? locationId : undefined;

      const result = isRecurring
        ? await createRecurringTrainingSessions({
            studioId: studio.id,
            trainingId,
            capacity: capacityN,
            trainerId: isPro && trainerId ? trainerId : undefined,
            locationId: loc,
            slots: recurringDays.map((day) => ({
              day,
              startTime: normalizeHm(dayTimes[day] || sessionTime || '09:00'),
            })),
            weeksCount: weeksCountInclusive(sessionDate, endDate),
            startsFromDate: dateInputToApiDay(sessionDate),
            endsOnDate: dateInputToApiDay(endDate),
          })
        : await createRecurringTrainingSessions({
            studioId: studio.id,
            trainingId,
            capacity: capacityN,
            trainerId: isPro && trainerId ? trainerId : undefined,
            locationId: loc,
            daysOfWeek: [isoWeekdayFromDateInput(sessionDate)],
            startTime: normalizeHm(sessionTime),
            weeksCount: 1,
            startsFromDate: dateInputToApiDay(sessionDate),
            endsOnDate: dateInputToApiDay(sessionDate),
          });

      void result;
      router.push(withLocale('/calendar', locale));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  const fieldStyle = { color: ownerTheme.text };

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1
            className="text-2xl font-semibold"
            style={{ color: ownerTheme.text }}
          >
            {step === 1 ? 'New class' : 'Schedule'}
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: ownerTheme.textSecondary }}
          >
            Step {step} of 2
          </p>
        </div>
        {step === 2 ? (
          <button
            type="button"
            onClick={() => setStep(1)}
            className="text-sm font-medium"
            style={{ color: ownerTheme.accent }}
          >
            Back
          </button>
        ) : null}
      </div>

      {step === 1 ? (
        <div className="space-y-5">
          <div className="relative">
            <FieldLabel>Training name *</FieldLabel>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameFocused(true);
              }}
              onFocus={() => setNameFocused(true)}
              onClick={() => setNameFocused(true)}
              onBlur={() => {
                // Delay so suggestion mousedown/click can fire first
                window.setTimeout(() => setNameFocused(false), 200);
              }}
              autoComplete="off"
              placeholder="e.g. Morning Yoga"
              className={inputClass}
              style={fieldStyle}
            />
            {nameFocused &&
            existing.length > 0 &&
            nameSuggestions.length > 0 ? (
              <ul
                className="absolute left-0 right-0 z-30 mt-1 max-h-[40vh] overflow-auto rounded-xl border bg-white py-1 shadow-lg"
                style={{ borderColor: ownerTheme.borderSoft }}
                role="listbox"
              >
                {nameSuggestions.map((t) => (
                  <li key={t.id} role="option">
                    <button
                      type="button"
                      className="flex w-full flex-col px-3.5 py-2.5 text-left hover:bg-[#FCF3EC]"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyExisting(t.id);
                      }}
                    >
                      <span
                        className="text-sm font-medium"
                        style={{ color: ownerTheme.text }}
                      >
                        {t.name}
                      </span>
                      <span
                        className="text-xs font-medium"
                        style={{ color: ownerTheme.textSecondary }}
                      >
                        {t.duration > 0 ? `${t.duration} min` : '—'}
                        {t.price > 0
                          ? ` · ${formatPriceDots(Math.round(Number(t.price)))}`
                          : ''}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {!trainingsQuery.isLoading && existing.length === 0 ? (
              <p
                className="mt-1.5 text-xs"
                style={{ color: ownerTheme.textSecondary }}
              >
                No existing trainings yet — type a new name
              </p>
            ) : null}
          </div>

          {categories.length > 0 ? (
            <label className="block">
              <FieldLabel>Category *</FieldLabel>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={inputClass}
                style={fieldStyle}
              >
                <option value="">Pick category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {categoryLabel(c, locale)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {locations.length > 0 ? (
            <label className="block">
              <FieldLabel>Address</FieldLabel>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className={inputClass}
                style={fieldStyle}
              >
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
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
              <FieldLabel>Price *</FieldLabel>
              <input
                inputMode="numeric"
                value={price}
                onChange={(e) => setPrice(formatPriceDots(e.target.value))}
                placeholder="150.000"
                className={inputClass}
                style={fieldStyle}
              />
            </label>
            <label className="block">
              <FieldLabel>Language</FieldLabel>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className={inputClass}
                style={fieldStyle}
              >
                {LANGS.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
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

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button
            type="button"
            onClick={onNext}
            className="w-full rounded-[14px] py-3.5 text-[15px] font-semibold text-white"
            style={{ backgroundColor: ownerTheme.accent }}
          >
            Next
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setIsRecurring(false)}
              className="flex h-full items-start gap-2.5 rounded-xl bg-white px-3 py-3 text-left sm:gap-3 sm:px-3.5"
            >
              <span
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2"
                style={{
                  borderColor: !isRecurring
                    ? ownerTheme.accent
                    : ownerTheme.border,
                }}
              >
                {!isRecurring ? (
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: ownerTheme.accent }}
                  />
                ) : null}
              </span>
              <span className="text-[12px] font-semibold uppercase leading-snug tracking-wide sm:text-sm">
                One training
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRecurring(true);
                const today = todayInputValue();
                setSessionDate(today);
                setEndDate(addMonthsInputValue(today, 2));
              }}
              className="flex h-full items-start gap-2.5 rounded-xl bg-white px-3 py-3 text-left sm:gap-3 sm:px-3.5"
            >
              <span
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2"
                style={{
                  borderColor: isRecurring
                    ? ownerTheme.accent
                    : ownerTheme.border,
                }}
              >
                {isRecurring ? (
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: ownerTheme.accent }}
                  />
                ) : null}
              </span>
              <span className="min-w-0">
                <span className="block text-[12px] font-semibold uppercase leading-snug tracking-wide sm:text-sm">
                  Repeated training
                </span>
                <span
                  className="mt-1 block text-[11px] leading-snug sm:text-xs"
                  style={{ color: ownerTheme.textSecondary }}
                >
                  Up to 2 months on selected weekdays
                </span>
              </span>
            </button>
          </div>

          {!isRecurring ? (
            <div className="grid grid-cols-2 gap-3">
              <OwnerDateField
                label="Date"
                value={sessionDate}
                onChange={setSessionDate}
                locale={locale}
                min={todayInputValue()}
              />
              <OwnerTimeField
                label="Time"
                value={sessionTime}
                onChange={setSessionTime}
              />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <OwnerDateField
                  label="Start date"
                  value={sessionDate}
                  locale={locale}
                  min={todayInputValue()}
                  onChange={(next) => {
                    setSessionDate(next);
                    const maxEnd = addMonthsInputValue(next, 2);
                    if (endDate > maxEnd) setEndDate(maxEnd);
                    if (endDate < next) setEndDate(next);
                  }}
                />
                <OwnerDateField
                  label="End date"
                  value={endDate}
                  locale={locale}
                  min={sessionDate}
                  max={addMonthsInputValue(sessionDate, 2)}
                  onChange={setEndDate}
                />
              </div>

              <div>
                <FieldLabel>Repeat on</FieldLabel>
                <div className="mt-1 flex gap-1.5">
                  {WEEKDAYS.map((day) => {
                    const on = recurringDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className="flex h-10 flex-1 items-center justify-center rounded-lg text-xs font-semibold"
                        style={{
                          backgroundColor: on ? ownerTheme.accent : '#FFFFFF',
                          color: on ? '#FFFFFF' : ownerTheme.text,
                        }}
                      >
                        {WEEKDAY_SHORT[day - 1]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {recurringDays.length > 0 ? (
                <div className="space-y-2">
                  <FieldLabel>Schedule</FieldLabel>
                  {recurringDays.map((day) => (
                    <div
                      key={day}
                      className="flex items-center justify-between gap-3 rounded-xl bg-white px-3.5 py-2.5"
                    >
                      <span className="shrink-0 text-sm font-medium">
                        {WEEKDAY_SHORT[day - 1]}
                      </span>
                      <div className="w-[140px]">
                        <OwnerTimeField
                          value={dayTimes[day] || sessionTime}
                          onChange={(hm) =>
                            setDayTimes((prev) => ({
                              ...prev,
                              [day]: hm,
                            }))
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          )}

          {isPro && trainers.length > 0 ? (
            <label className="block">
              <FieldLabel>Trainer</FieldLabel>
              <select
                value={trainerId}
                onChange={(e) => setTrainerId(e.target.value)}
                className={inputClass}
                style={fieldStyle}
              >
                <option value="">Any / unassigned</option>
                {trainers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          ) : !isPro ? (
            <p className="text-xs" style={{ color: ownerTheme.textSecondary }}>
              Trainer assignment is available on Studio plan.
            </p>
          ) : null}

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button
            type="button"
            disabled={saving}
            onClick={() => void onSave()}
            className="w-full rounded-[14px] py-3.5 text-[15px] font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: ownerTheme.accent }}
          >
            {saving ? 'Creating…' : 'Create class'}
          </button>
        </div>
      )}
    </div>
  );
}
