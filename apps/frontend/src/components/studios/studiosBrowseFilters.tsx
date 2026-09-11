'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  Languages,
  MapPin,
  SlidersHorizontal,
  Clock3,
  ArrowUpDown,
  X,
} from 'lucide-react';
import {
  BROWSE_DISTANCE_OPTIONS,
  BROWSE_LANGUAGES,
  BROWSE_SORT_OPTIONS,
  BROWSE_TIME_PERIODS,
  countActiveBrowseFilters,
  type BrowseDistanceFilter,
  type BrowseSortBy,
  type BrowseTimePeriod,
} from '@/lib/client/browse-filters';
import {
  trainingCategoryLabel,
  type PublicTrainingCategory,
} from '@/lib/client/training-category';
import type { Locale } from '@/i18n/routing';

type OpenPanel =
  | 'all'
  | 'types'
  | 'language'
  | 'time'
  | 'distance'
  | 'sort'
  | null;

type Props = {
  locale: Locale;
  categories: PublicTrainingCategory[];
  selectedCategoryId: number | null;
  onCategoryChange: (id: number | null) => void;
  languages: Set<string>;
  onLanguagesChange: (next: Set<string>) => void;
  timePeriods: Set<BrowseTimePeriod>;
  onTimePeriodsChange: (next: Set<BrowseTimePeriod>) => void;
  distance: BrowseDistanceFilter;
  onDistanceChange: (next: BrowseDistanceFilter) => void;
  sortBy: BrowseSortBy;
  onSortByChange: (next: BrowseSortBy) => void;
  /** When true, Types chip is hidden (category page already scoped). */
  hideTypes?: boolean;
};

function Chip({
  label,
  active,
  onClick,
  icon,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium transition ${
        active
          ? 'border-[#E86D4F] bg-[#E86D4F] text-white'
          : 'border-transparent bg-white text-[#3F3F3F] hover:border-[#E86D4F]'
      }`}
    >
      {icon}
      <span>{label}</span>
      <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden />
    </button>
  );
}

function Panel({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full z-30 mt-2 min-w-[220px] rounded-2xl border border-[#E8E0D8] bg-white p-3 shadow-lg"
    >
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#878787]">
      {children}
    </p>
  );
}

function OptionButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`w-full rounded-lg px-3 py-2.5 text-left text-sm ${
        selected
          ? 'bg-[#FFF1ED] font-semibold text-[#E86D4F]'
          : 'hover:bg-[#F9F4F0]'
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function StudiosBrowseFilters({
  locale,
  categories,
  selectedCategoryId,
  onCategoryChange,
  languages,
  onLanguagesChange,
  timePeriods,
  onTimePeriodsChange,
  distance,
  onDistanceChange,
  sortBy,
  onSortByChange,
  hideTypes = false,
}: Props) {
  const [open, setOpen] = useState<OpenPanel>(null);

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
  const typesLabel = selectedCategory
    ? trainingCategoryLabel(selectedCategory, locale)
    : 'Types';

  const langLabel =
    languages.size === 0
      ? 'Language'
      : languages.size === 1
        ? BROWSE_LANGUAGES.find((l) => languages.has(l.value))?.label ||
          'Language'
        : `Language (${languages.size})`;

  const timeLabel =
    timePeriods.size === 0
      ? 'Time'
      : timePeriods.size === 1
        ? BROWSE_TIME_PERIODS.find((t) => timePeriods.has(t.value))?.label ||
          'Time'
        : `Time (${timePeriods.size})`;

  const distanceLabel =
    BROWSE_DISTANCE_OPTIONS.find((d) => d.value === distance)?.label ||
    'Distance';

  const sortLabel =
    BROWSE_SORT_OPTIONS.find((s) => s.value === sortBy)?.label || 'Sort';

  const activeCount = countActiveBrowseFilters({
    selectedCategoryId,
    languages,
    timePeriods,
    distance,
    sortBy,
    ignoreCategory: hideTypes,
  });

  const allFiltersLabel =
    activeCount > 0 ? `Filters (${activeCount})` : 'All filters';

  const toggleLang = (code: string) => {
    const next = new Set(languages);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    onLanguagesChange(next);
  };

  const togglePeriod = (period: BrowseTimePeriod) => {
    const next = new Set(timePeriods);
    if (next.has(period)) next.delete(period);
    else next.add(period);
    onTimePeriodsChange(next);
  };

  const clearAll = () => {
    if (!hideTypes) onCategoryChange(null);
    onLanguagesChange(new Set());
    onTimePeriodsChange(new Set());
    onDistanceChange('auto');
    onSortByChange('recommended');
  };

  useEffect(() => {
    if (open !== 'all') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <div className="relative flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => setOpen(open === 'all' ? null : 'all')}
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-semibold transition ${
          activeCount > 0
            ? 'border-[#E86D4F] bg-[#FFF1ED] text-[#E86D4F]'
            : 'border-transparent bg-white text-[#3F3F3F] hover:border-[#E86D4F]'
        }`}
        aria-expanded={open === 'all'}
      >
        <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
        <span>{allFiltersLabel}</span>
        {activeCount > 0 ? (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#E86D4F] px-1.5 text-[11px] font-bold text-white">
            {activeCount}
          </span>
        ) : null}
      </button>

      {!hideTypes ? (
        <div className="relative">
          <Chip
            label={typesLabel}
            active={selectedCategoryId != null}
            icon={<SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />}
            onClick={() => setOpen(open === 'types' ? null : 'types')}
          />
          {open === 'types' ? (
            <Panel onClose={() => setOpen(null)}>
              <SectionTitle>Filter by type</SectionTitle>
              <ul className="max-h-64 space-y-0.5 overflow-y-auto">
                <li>
                  <OptionButton
                    selected={selectedCategoryId == null}
                    onClick={() => {
                      onCategoryChange(null);
                      setOpen(null);
                    }}
                  >
                    All types
                  </OptionButton>
                </li>
                {categories.map((cat) => (
                  <li key={cat.id}>
                    <OptionButton
                      selected={selectedCategoryId === cat.id}
                      onClick={() => {
                        onCategoryChange(cat.id);
                        setOpen(null);
                      }}
                    >
                      {trainingCategoryLabel(cat, locale)}
                    </OptionButton>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </div>
      ) : null}

      <div className="relative">
        <Chip
          label={langLabel}
          active={languages.size > 0}
          icon={<Languages className="h-3.5 w-3.5" aria-hidden />}
          onClick={() => setOpen(open === 'language' ? null : 'language')}
        />
        {open === 'language' ? (
          <Panel onClose={() => setOpen(null)}>
            <SectionTitle>Training language</SectionTitle>
            <ul className="space-y-0.5">
              {BROWSE_LANGUAGES.map((lang) => (
                <li key={lang.value}>
                  <OptionButton
                    selected={languages.has(lang.value)}
                    onClick={() => toggleLang(lang.value)}
                  >
                    {lang.label}
                  </OptionButton>
                </li>
              ))}
            </ul>
            {languages.size > 0 ? (
              <button
                type="button"
                className="mt-2 w-full rounded-lg px-3 py-2 text-sm text-[#878787] hover:bg-[#F9F4F0]"
                onClick={() => onLanguagesChange(new Set())}
              >
                Clear
              </button>
            ) : null}
          </Panel>
        ) : null}
      </div>

      <div className="relative">
        <Chip
          label={timeLabel}
          active={timePeriods.size > 0}
          icon={<Clock3 className="h-3.5 w-3.5" aria-hidden />}
          onClick={() => setOpen(open === 'time' ? null : 'time')}
        />
        {open === 'time' ? (
          <Panel onClose={() => setOpen(null)}>
            <SectionTitle>Activities by time period</SectionTitle>
            <ul className="space-y-0.5">
              {BROWSE_TIME_PERIODS.map((period) => (
                <li key={period.value}>
                  <OptionButton
                    selected={timePeriods.has(period.value)}
                    onClick={() => togglePeriod(period.value)}
                  >
                    {period.label}
                  </OptionButton>
                </li>
              ))}
            </ul>
            {timePeriods.size > 0 ? (
              <button
                type="button"
                className="mt-2 w-full rounded-lg px-3 py-2 text-sm text-[#878787] hover:bg-[#F9F4F0]"
                onClick={() => onTimePeriodsChange(new Set())}
              >
                Clear
              </button>
            ) : null}
          </Panel>
        ) : null}
      </div>

      <div className="relative">
        <Chip
          label={distanceLabel}
          active={distance !== 'auto'}
          icon={<MapPin className="h-3.5 w-3.5" aria-hidden />}
          onClick={() => setOpen(open === 'distance' ? null : 'distance')}
        />
        {open === 'distance' ? (
          <Panel onClose={() => setOpen(null)}>
            <SectionTitle>Distance from your location</SectionTitle>
            <ul className="space-y-0.5">
              {BROWSE_DISTANCE_OPTIONS.map((opt) => (
                <li key={opt.value}>
                  <OptionButton
                    selected={distance === opt.value}
                    onClick={() => {
                      onDistanceChange(opt.value);
                      setOpen(null);
                    }}
                  >
                    {opt.label}
                  </OptionButton>
                </li>
              ))}
            </ul>
          </Panel>
        ) : null}
      </div>

      <div className="relative ml-auto">
        <Chip
          label={
            sortBy === 'recommended'
              ? 'Sort: Recommended'
              : `Sort: ${sortLabel}`
          }
          active={sortBy !== 'recommended'}
          icon={<ArrowUpDown className="h-3.5 w-3.5" aria-hidden />}
          onClick={() => setOpen(open === 'sort' ? null : 'sort')}
        />
        {open === 'sort' ? (
          <Panel onClose={() => setOpen(null)}>
            <SectionTitle>Sort by</SectionTitle>
            <ul className="space-y-0.5">
              {BROWSE_SORT_OPTIONS.map((opt) => (
                <li key={opt.value}>
                  <OptionButton
                    selected={sortBy === opt.value}
                    onClick={() => {
                      onSortByChange(opt.value);
                      setOpen(null);
                    }}
                  >
                    {opt.label}
                  </OptionButton>
                </li>
              ))}
            </ul>
          </Panel>
        ) : null}
      </div>

      {open === 'all' ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close filters"
            onClick={() => setOpen(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="All filters"
            className="relative z-10 flex max-h-[88svh] w-full max-w-lg flex-col rounded-t-3xl bg-white shadow-2xl sm:mx-4 sm:max-h-[85vh] sm:rounded-3xl"
          >
            <div className="flex items-center justify-between border-b border-[#F0EAE4] px-5 py-4">
              <h2 className="text-lg font-bold text-[#3F3F3F]">Filters</h2>
              <button
                type="button"
                onClick={() => setOpen(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F9F4F0] text-[#3F3F3F] hover:bg-[#EDE8E3]"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-4">
              {!hideTypes ? (
                <div className="mb-5">
                  <SectionTitle>Type</SectionTitle>
                  <ul className="space-y-0.5">
                    <li>
                      <OptionButton
                        selected={selectedCategoryId == null}
                        onClick={() => onCategoryChange(null)}
                      >
                        All types
                      </OptionButton>
                    </li>
                    {categories.map((cat) => (
                      <li key={cat.id}>
                        <OptionButton
                          selected={selectedCategoryId === cat.id}
                          onClick={() => onCategoryChange(cat.id)}
                        >
                          {trainingCategoryLabel(cat, locale)}
                        </OptionButton>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="mb-5">
                <SectionTitle>Sort by</SectionTitle>
                <ul className="space-y-0.5">
                  {BROWSE_SORT_OPTIONS.map((opt) => (
                    <li key={opt.value}>
                      <OptionButton
                        selected={sortBy === opt.value}
                        onClick={() => onSortByChange(opt.value)}
                      >
                        {opt.label}
                      </OptionButton>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mb-5">
                <SectionTitle>Distance from your location</SectionTitle>
                <ul className="space-y-0.5">
                  {BROWSE_DISTANCE_OPTIONS.map((opt) => (
                    <li key={opt.value}>
                      <OptionButton
                        selected={distance === opt.value}
                        onClick={() => onDistanceChange(opt.value)}
                      >
                        {opt.label}
                      </OptionButton>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mb-5">
                <SectionTitle>Training language</SectionTitle>
                <ul className="space-y-0.5">
                  {BROWSE_LANGUAGES.map((lang) => (
                    <li key={lang.value}>
                      <OptionButton
                        selected={languages.has(lang.value)}
                        onClick={() => toggleLang(lang.value)}
                      >
                        {lang.label}
                      </OptionButton>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mb-2">
                <SectionTitle>Activities by time period</SectionTitle>
                <ul className="space-y-0.5">
                  {BROWSE_TIME_PERIODS.map((period) => (
                    <li key={period.value}>
                      <OptionButton
                        selected={timePeriods.has(period.value)}
                        onClick={() => togglePeriod(period.value)}
                      >
                        {period.label}
                      </OptionButton>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex gap-2 border-t border-[#F0EAE4] px-5 py-4">
              <button
                type="button"
                onClick={clearAll}
                className="flex-1 rounded-full border border-[#E8E0D8] bg-white px-4 py-3 text-sm font-semibold text-[#3F3F3F] hover:bg-[#F9F4F0]"
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={() => setOpen(null)}
                className="flex-1 rounded-full bg-[#E86D4F] px-4 py-3 text-sm font-semibold text-white hover:bg-[#d85e42]"
              >
                Show results
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
