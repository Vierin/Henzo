'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  Languages,
  MapPin,
  SlidersHorizontal,
  Clock3,
  ArrowUpDown,
} from 'lucide-react';
import {
  BROWSE_DISTANCE_OPTIONS,
  BROWSE_LANGUAGES,
  BROWSE_SORT_OPTIONS,
  BROWSE_TIME_PERIODS,
  type BrowseDistanceFilter,
  type BrowseSortBy,
  type BrowseTimePeriod,
} from '@/lib/client/browse-filters';
import {
  trainingCategoryLabel,
  type PublicTrainingCategory,
} from '@/lib/client/training-category';
import type { Locale } from '@/i18n/routing';

type OpenPanel = 'types' | 'language' | 'time' | 'distance' | 'sort' | null;

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

  return (
    <div className="relative flex flex-wrap items-center gap-2">
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
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#878787]">
                Filter by type
              </p>
              <ul className="max-h-64 space-y-0.5 overflow-y-auto">
                <li>
                  <button
                    type="button"
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                      selectedCategoryId == null
                        ? 'bg-[#FFF1ED] font-semibold text-[#E86D4F]'
                        : 'hover:bg-[#F9F4F0]'
                    }`}
                    onClick={() => {
                      onCategoryChange(null);
                      setOpen(null);
                    }}
                  >
                    All types
                  </button>
                </li>
                {categories.map((cat) => (
                  <li key={cat.id}>
                    <button
                      type="button"
                      className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                        selectedCategoryId === cat.id
                          ? 'bg-[#FFF1ED] font-semibold text-[#E86D4F]'
                          : 'hover:bg-[#F9F4F0]'
                      }`}
                      onClick={() => {
                        onCategoryChange(cat.id);
                        setOpen(null);
                      }}
                    >
                      {trainingCategoryLabel(cat, locale)}
                    </button>
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
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#878787]">
              Training language
            </p>
            <ul className="space-y-0.5">
              {BROWSE_LANGUAGES.map((lang) => (
                <li key={lang.value}>
                  <button
                    type="button"
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                      languages.has(lang.value)
                        ? 'bg-[#FFF1ED] font-semibold text-[#E86D4F]'
                        : 'hover:bg-[#F9F4F0]'
                    }`}
                    onClick={() => toggleLang(lang.value)}
                  >
                    {lang.label}
                  </button>
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
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#878787]">
              Activities by time period
            </p>
            <ul className="space-y-0.5">
              {BROWSE_TIME_PERIODS.map((period) => (
                <li key={period.value}>
                  <button
                    type="button"
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                      timePeriods.has(period.value)
                        ? 'bg-[#FFF1ED] font-semibold text-[#E86D4F]'
                        : 'hover:bg-[#F9F4F0]'
                    }`}
                    onClick={() => togglePeriod(period.value)}
                  >
                    {period.label}
                  </button>
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
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#878787]">
              Distance from your location
            </p>
            <ul className="space-y-0.5">
              {BROWSE_DISTANCE_OPTIONS.map((opt) => (
                <li key={opt.value}>
                  <button
                    type="button"
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                      distance === opt.value
                        ? 'bg-[#FFF1ED] font-semibold text-[#E86D4F]'
                        : 'hover:bg-[#F9F4F0]'
                    }`}
                    onClick={() => {
                      onDistanceChange(opt.value);
                      setOpen(null);
                    }}
                  >
                    {opt.label}
                  </button>
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
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#878787]">
              Sort by
            </p>
            <ul className="space-y-0.5">
              {BROWSE_SORT_OPTIONS.map((opt) => (
                <li key={opt.value}>
                  <button
                    type="button"
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                      sortBy === opt.value
                        ? 'bg-[#FFF1ED] font-semibold text-[#E86D4F]'
                        : 'hover:bg-[#F9F4F0]'
                    }`}
                    onClick={() => {
                      onSortByChange(opt.value);
                      setOpen(null);
                    }}
                  >
                    {opt.label}
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
        ) : null}
      </div>
    </div>
  );
}
