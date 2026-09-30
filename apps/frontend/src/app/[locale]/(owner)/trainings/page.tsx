'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpDown, Plus, Search } from 'lucide-react';
import { extractLocaleFromPath, withLocale, type Locale } from '@/i18n/routing';
import { useOwnerStudio } from '@/contexts/OwnerStudioContext';
import { fetchTrainings } from '@/lib/owner/fetch-trainings';
import { fetchTrainingCategories } from '@/lib/client/fetch-training-categories';
import {
  isOtherTrainingCategory,
  trainingCategoryLabel,
  type PublicTrainingCategory,
} from '@/lib/client/training-category';
import type { OwnerTraining } from '@/lib/owner/types';
import { ownerTheme } from '@/lib/owner/owner-theme';
import { formatMoney, parseStudioCurrency } from '@/lib/format-money';
import {
  isPlaceholderTrainerName,
  trainingLanguageLabel,
} from '@/lib/owner/format-time';
import { OwnerSelect } from '@/components/owner/ownerSelect';

type SortKey =
  | 'nameAsc'
  | 'nameDesc'
  | 'priceDesc'
  | 'priceAsc'
  | 'durationDesc';

const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: 'nameAsc', label: 'Name · A–Z' },
  { id: 'nameDesc', label: 'Name · Z–A' },
  { id: 'priceDesc', label: 'Price · high–low' },
  { id: 'priceAsc', label: 'Price · low–high' },
  { id: 'durationDesc', label: 'Duration · long–short' },
];

function trainerName(t: OwnerTraining): string {
  const raw = t.Staff?.[0]?.name?.trim() || '';
  return isPlaceholderTrainerName(raw) ? '' : raw;
}

export default function TrainingsPage() {
  const pathname = usePathname();
  const locale = (extractLocaleFromPath(pathname) ?? 'en') as Locale;
  const { studio } = useOwnerStudio();
  const [q, setQ] = useState('');
  const [categoryId, setCategoryId] = useState<number | 'all'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('nameAsc');
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sortOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!sortRef.current?.contains(e.target as Node)) setSortOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [sortOpen]);

  const trainingsQuery = useQuery({
    queryKey: ['owner-trainings', studio?.id],
    queryFn: () => fetchTrainings(studio!.id),
    enabled: Boolean(studio?.id),
  });

  const categoriesQuery = useQuery({
    queryKey: ['training-categories'],
    queryFn: fetchTrainingCategories,
  });

  const trainings = trainingsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];

  const filterCategories = useMemo(() => {
    const used = new Set(
      trainings
        .map((t) => t.trainingCategoryId)
        .filter((id): id is number => id != null),
    );
    const list = categories.filter((c) => used.has(c.id));
    const rest = list.filter((c) => !isOtherTrainingCategory(c));
    const other = list.filter((c) => isOtherTrainingCategory(c));
    return [...rest, ...other];
  }, [categories, trainings]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    let list = trainings.filter((t) => {
      if (categoryId !== 'all' && t.trainingCategoryId !== categoryId) {
        return false;
      }
      if (!query) return true;
      return t.name.toLowerCase().includes(query);
    });

    list = [...list].sort((a, b) => {
      switch (sortKey) {
        case 'nameDesc':
          return b.name.localeCompare(a.name);
        case 'priceAsc':
          return Number(a.price) - Number(b.price);
        case 'priceDesc':
          return Number(b.price) - Number(a.price);
        case 'durationDesc':
          return b.duration - a.duration;
        default:
          return a.name.localeCompare(b.name);
      }
    });
    return list;
  }, [trainings, q, categoryId, sortKey]);

  const studioLabel = studio?.name?.trim() || 'Studio';

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1
            className="text-2xl font-semibold tracking-tight md:text-[28px]"
            style={{ color: ownerTheme.text }}
          >
            Trainings
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: ownerTheme.textSecondary }}
          >
            Create and manage the classes clients can book.
          </p>
        </div>
        <Link
          href={withLocale('/trainings/new', locale)}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-[12px] px-4 text-sm font-semibold text-white"
          style={{ backgroundColor: ownerTheme.accent }}
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Add training
        </Link>
      </div>

      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <label className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
              style={{ color: ownerTheme.textSecondary }}
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search trainings…"
              className="w-full rounded-[12px] bg-white py-2.5 pl-10 pr-3 text-sm outline-none"
              style={{ color: ownerTheme.text }}
            />
          </label>

          <div ref={sortRef} className="relative shrink-0 md:hidden">
            <button
              type="button"
              aria-label="Sort"
              aria-expanded={sortOpen}
              onClick={() => setSortOpen((open) => !open)}
              className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-white"
              style={{ color: ownerTheme.text }}
            >
              <ArrowUpDown className="h-4 w-4" />
            </button>
            {sortOpen ? (
              <ul
                className="absolute right-0 z-30 mt-2 w-max min-w-[240px] rounded-[16px] border bg-white p-1.5 shadow-[0_16px_40px_rgba(63,50,135,0.14)]"
                style={{ borderColor: ownerTheme.borderSoft }}
              >
                {SORT_OPTIONS.map((option) => {
                  const selected = sortKey === option.id;
                  return (
                    <li key={option.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSortKey(option.id);
                          setSortOpen(false);
                        }}
                        className="flex w-full whitespace-nowrap rounded-[12px] px-3 py-2.5 text-left text-sm font-medium"
                        style={{
                          color: ownerTheme.text,
                          backgroundColor: selected
                            ? 'rgba(241, 89, 66, 0.1)'
                            : undefined,
                          fontWeight: selected ? 600 : 500,
                        }}
                      >
                        {option.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          <CategoryPill
            label="All"
            selected={categoryId === 'all'}
            onClick={() => setCategoryId('all')}
            bg={ownerTheme.accent}
            fg="#fff"
            idle
          />
          {filterCategories.map((c) => {
            const selected = categoryId === c.id;
            return (
              <CategoryPill
                key={c.id}
                label={trainingCategoryLabel(c, locale)}
                selected={selected}
                onClick={() => setCategoryId(c.id)}
                bg={c.chipBgHex}
                fg={c.chipFgHex || '#171717'}
              />
            );
          })}
        </div>

        <OwnerSelect
          value={sortKey}
          onChange={(v) => setSortKey(v as SortKey)}
          size="compact"
          aria-label="Sort"
          className="hidden w-full shrink-0 md:block md:w-auto md:min-w-[150px]"
          options={SORT_OPTIONS.map((o) => ({
            value: o.id,
            label: o.label,
          }))}
        />
      </div>

      {trainingsQuery.isLoading ? (
        <p className="text-sm" style={{ color: ownerTheme.textSecondary }}>
          Loading…
        </p>
      ) : trainingsQuery.isError ? (
        <p className="text-sm text-red-600">Failed to load trainings</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-[16px] bg-white px-5 py-12 text-center">
          <p className="font-medium" style={{ color: ownerTheme.text }}>
            No trainings yet
          </p>
          <p
            className="mt-1 text-sm"
            style={{ color: ownerTheme.textSecondary }}
          >
            Add your first class to get bookings.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {filtered.map((item) => (
            <li key={item.id}>
              <TrainingCatalogCard
                item={item}
                studioLabel={studioLabel}
                currency={parseStudioCurrency(studio?.currency)}
                href={withLocale(`/trainings/${item.id}/edit`, locale)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CategoryPill({
  label,
  selected,
  onClick,
  bg,
  fg,
  idle,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  bg: string;
  fg: string;
  idle?: boolean;
}) {
  if (idle) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="rounded-[12px] px-3 py-2 text-sm font-semibold"
        style={
          selected
            ? { backgroundColor: bg, color: fg }
            : { backgroundColor: '#fff', color: ownerTheme.text }
        }
      >
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[12px] px-3 py-2 text-sm font-semibold transition"
      style={{
        backgroundColor: bg,
        color: fg,
        boxShadow: selected ? `inset 0 0 0 2px ${ownerTheme.text}` : undefined,
        opacity: selected ? 1 : 0.85,
      }}
    >
      {label}
    </button>
  );
}

function TrainingCatalogCard({
  item,
  studioLabel,
  currency,
  href,
}: {
  item: OwnerTraining;
  studioLabel: string;
  currency: ReturnType<typeof parseStudioCurrency>;
  href: string;
}) {
  const accent = item.displayColor || ownerTheme.accent;
  const trainer = trainerName(item);
  const language = trainingLanguageLabel(item.language);
  const price = Number(item.price) || 0;

  return (
    <Link
      href={href}
      className="group flex overflow-hidden rounded-[14px] bg-white transition hover:shadow-sm"
      aria-label={`Edit ${item.name}`}
    >
      <span
        className="w-1 shrink-0 self-stretch"
        style={{ backgroundColor: accent }}
        aria-hidden
      />

      <div className="flex min-w-0 flex-1 items-stretch gap-3 px-3.5 py-3.5">
        <div className="min-w-0 flex-1">
          <h2
            className="truncate text-[17px] font-bold leading-snug tracking-tight"
            style={{ color: ownerTheme.text }}
          >
            {item.name}
          </h2>

          <div className="mt-2.5 flex flex-col items-start gap-1.5">
            {language ? (
              <MetaItem icon={<IconGlobe />}>{language}</MetaItem>
            ) : null}
            {trainer ? (
              <MetaItem icon={<IconProfile />}>{trainer}</MetaItem>
            ) : null}
            <MetaItem icon={<IconPin />}>{studioLabel}</MetaItem>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end justify-between gap-2 self-stretch py-0.5">
          <p
            className="text-sm font-semibold tabular-nums"
            style={{ color: ownerTheme.textSecondary }}
          >
            {item.duration} min
          </p>
          <p
            className="text-xl font-bold tabular-nums"
            style={{ color: ownerTheme.text }}
          >
            {formatMoney(price, currency)}
          </p>
        </div>
      </div>
    </Link>
  );
}

function MetaItem({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span
      className="inline-flex max-w-full items-center gap-1 text-sm"
      style={{ color: ownerTheme.text }}
    >
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{children}</span>
    </span>
  );
}

function IconGlobe() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path
        d="M6 11C8.76142 11 11 8.76142 11 6C11 3.23858 8.76142 1 6 1C3.23858 1 1 3.23858 1 6C1 8.76142 3.23858 11 6 11Z"
        stroke="#4D39A8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 6C4 4.13837 4.71612 2.34808 6 1C7.28388 2.34808 8 4.13837 8 6C8 7.86163 7.28388 9.65192 6 11C4.71612 9.65192 4 7.86163 4 6Z"
        stroke="#4D39A8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M1 6H11"
        stroke="#4D39A8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconProfile() {
  return (
    <svg className="h-3.5 w-3" viewBox="0 0 10 12" fill="none" aria-hidden>
      <path
        d="M9.46645 10.7067V9.67127C9.46645 9.12203 9.23028 8.59528 8.8099 8.2069C8.38951 7.81853 7.81935 7.60034 7.22484 7.60034H2.74161C2.1471 7.60034 1.57694 7.81853 1.15655 8.2069C0.736169 8.59528 0.5 9.12203 0.5 9.67127V10.7067"
        stroke="#4D39A8"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.9838 4.93771C6.22181 4.93771 7.22541 3.9443 7.22541 2.71886C7.22541 1.49342 6.22181 0.5 4.9838 0.5C3.74579 0.5 2.74219 1.49342 2.74219 2.71886C2.74219 3.9443 3.74579 4.93771 4.9838 4.93771Z"
        stroke="#4D39A8"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconPin() {
  return (
    <svg className="h-3.5 w-2.5" viewBox="0 0 15 21" fill="none" aria-hidden>
      <path
        d="M7.50098 0C11.6428 0 15.001 3.35885 15.001 7.5H14.999C14.999 7.78403 14.9819 8.06415 14.9512 8.33984C14.8219 9.65259 14.4303 10.5574 13.9014 11.4062C13.845 11.4984 13.7868 11.5892 13.7266 11.6787C13.4206 12.1411 13.0789 12.5985 12.7217 13.1084L7.50098 20.541L7.5 20.54V20.541L7.49902 20.5391V20.541L2.37695 13.249V13.248L1.49023 11.9854L1.48242 11.9756C0.552621 10.7259 3.62617e-05 9.17848 0 7.5C0 3.35888 3.35919 4.78439e-05 7.50098 0Z"
        fill="#4D39A8"
      />
      <circle cx="7.5" cy="7.5" r="3.5" fill="white" />
    </svg>
  );
}
