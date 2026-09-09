'use client';

import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Globe, MapPin, UserRound } from 'lucide-react';
import {
  cancelClientEnrollment,
  cancelTargetId,
  fetchClientSchedule,
  splitSchedule,
  type ClientScheduleItem,
} from '@/lib/client-panel/fetch-schedule';
import { submitStudioReview } from '@/lib/client-panel/fetch-profile';
import { clientTheme } from '@/lib/client-panel/client-theme';
import {
  formatOwnerTime24h,
  isPlaceholderTrainerName,
  trainingLanguageLabel,
} from '@/lib/owner/format-time';
import { extractLocaleFromPath, withLocale, type Locale } from '@/i18n/routing';
import { resolveStudioPublicSlug } from '@/utils/slug';

const META_ICON = '#4D39A8';
const ACCENT_FALLBACK = '#C2F600';

function formatPassDayMonth(iso: string, locale: Locale) {
  try {
    // Mobile parity: `15 Jun` / `7 авг` (day first)
    const tag = locale === 'ru' ? 'ru-RU' : locale === 'vi' ? 'vi-VN' : 'en-GB';
    return new Intl.DateTimeFormat(tag, {
      day: 'numeric',
      month: 'short',
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleDateString();
  }
}

function studioHrefFor(
  item: ClientScheduleItem,
  locale: Locale,
): string | null {
  if (!item.studio) return null;
  return withLocale(
    `/studio/${resolveStudioPublicSlug({
      id: item.studio.id,
      name: item.studio.name,
      slug: item.studio.slug,
    })}`,
    locale,
  );
}

function MetaRow({
  icon,
  children,
  className = 'mt-2',
}: {
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`flex items-center gap-1.5 text-[14px] leading-snug ${className}`}
    >
      <span className="mt-px shrink-0" style={{ color: META_ICON }}>
        {icon}
      </span>
      <span className="min-w-0 truncate" style={{ color: clientTheme.text }}>
        {children}
      </span>
    </p>
  );
}

function OutlineActionButton({
  children,
  onClick,
  disabled,
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="w-full whitespace-nowrap rounded-full border border-[#F15942] px-3.5 py-2 text-xs font-bold leading-tight text-[#F15942] disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function FilledActionButton({
  children,
  href,
  onClick,
  disabled,
}: {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const className =
    'inline-flex w-full items-center justify-center whitespace-nowrap rounded-full bg-[#F15942] px-3.5 py-2 text-xs font-bold leading-tight text-white disabled:opacity-50';
  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={className}
    >
      {children}
    </button>
  );
}

function ScheduleCard({
  item,
  locale,
  mode,
  onCancel,
  onReview,
  busy,
}: {
  item: ClientScheduleItem;
  locale: Locale;
  mode: 'upcoming' | 'past';
  onCancel?: () => void;
  onReview?: (rating: number, comment: string) => void;
  busy?: boolean;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewOpen, setReviewOpen] = useState(false);

  const accent = item.training?.displayColor?.trim() || ACCENT_FALLBACK;
  const language = trainingLanguageLabel(item.training?.language);
  const trainerRaw = item.trainer?.name?.trim() || '';
  const trainer = isPlaceholderTrainerName(trainerRaw) ? '' : trainerRaw;
  const location = item.locationName?.trim() || item.studio?.name?.trim() || '';
  const studioHref = studioHrefFor(item, locale);
  const isWaitlisted = item.waitlisted || item.bookingStatus === 'WAITLISTED';
  const isPending = item.bookingStatus === 'PENDING';
  const canReview =
    mode === 'past' &&
    Boolean(onReview) &&
    Boolean(item.studio) &&
    !item.hasReview &&
    !isWaitlisted;
  const showBookAgain = mode === 'past' && Boolean(studioHref);

  const submitReview = (e: FormEvent) => {
    e.preventDefault();
    onReview?.(rating, comment.trim());
  };

  return (
    <article className="overflow-hidden rounded-[14px] bg-white">
      <div className="flex items-stretch">
        <span
          className="w-1 shrink-0"
          style={{ backgroundColor: accent }}
          aria-hidden
        />

        <div className="flex w-[72px] shrink-0 flex-col items-start justify-center py-3 pl-3 pr-3">
          <span
            className="text-[17px] font-semibold leading-none tracking-tight tabular-nums"
            style={{ color: clientTheme.text }}
          >
            {formatOwnerTime24h(item.startsAt)}
          </span>
          <span className="mt-2 text-[11px] font-semibold leading-none text-[#A4A4A4]">
            {formatPassDayMonth(item.startsAt, locale)}
          </span>
        </div>

        <span
          className="w-px shrink-0"
          style={{ backgroundColor: accent }}
          aria-hidden
        />

        <div className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-3.5 pr-3.5 sm:gap-4 sm:pr-4">
          <div className="min-w-0 flex-1">
            <p
              className="truncate text-[17px] font-bold leading-snug tracking-tight"
              style={{ color: clientTheme.text }}
            >
              {item.training?.name || 'Class'}
            </p>

            {language ? (
              <MetaRow
                icon={<Globe className="h-[13px] w-[13px]" strokeWidth={2} />}
              >
                {language}
              </MetaRow>
            ) : null}

            {trainer ? (
              <MetaRow
                className={language ? 'mt-1.5' : 'mt-2'}
                icon={
                  <UserRound className="h-[14px] w-[14px]" strokeWidth={2} />
                }
              >
                {trainer}
              </MetaRow>
            ) : null}

            {location ? (
              <MetaRow
                icon={<MapPin className="h-[14px] w-[14px]" strokeWidth={2} />}
              >
                {studioHref ? (
                  <Link
                    href={studioHref}
                    className="truncate hover:underline"
                    style={{ color: clientTheme.text }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {location}
                  </Link>
                ) : (
                  location
                )}
              </MetaRow>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-col items-stretch justify-center gap-1.5">
            {mode === 'upcoming' ? (
              isWaitlisted || isPending ? (
                <span className="rounded-lg border border-[#EF6C00]/66 bg-[#FFF3E0] px-2.5 py-1.5 text-center text-[12px] font-bold text-[#EF6C00]">
                  {isWaitlisted ? 'Waitlist' : 'Waiting'}
                </span>
              ) : onCancel ? (
                <OutlineActionButton disabled={busy} onClick={onCancel}>
                  Cancel
                </OutlineActionButton>
              ) : null
            ) : null}

            {showBookAgain ? (
              <div className="hidden sm:block">
                <FilledActionButton href={studioHref!}>
                  Book again
                </FilledActionButton>
              </div>
            ) : null}

            {mode === 'past' && item.hasReview ? (
              <span className="text-center text-[12px] font-semibold text-[#A4A4A4]">
                Reviewed
              </span>
            ) : null}

            {canReview && !reviewOpen ? (
              <OutlineActionButton onClick={() => setReviewOpen(true)}>
                Leave review
              </OutlineActionButton>
            ) : null}
          </div>
        </div>
      </div>

      {canReview && reviewOpen ? (
        <form
          onSubmit={submitReview}
          className="space-y-2 border-t border-[#F1E4DB] bg-[#F9F4F0] px-4 py-3"
        >
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                className={`h-8 w-8 rounded-full text-sm font-bold ${
                  n <= rating
                    ? 'bg-[#FFB800] text-white'
                    : 'bg-white text-[#878787]'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            placeholder="Optional comment"
            className="w-full rounded-lg border border-[#E8E0D8] bg-white px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setReviewOpen(false)}
              className="flex-1 rounded-full border border-[#E8E0D8] py-2 text-sm font-semibold text-[#878787]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-1 rounded-full bg-[#F15942] py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Submit
            </button>
          </div>
        </form>
      ) : null}
    </article>
  );
}

type ListEntry =
  | { kind: 'year'; year: number }
  | { kind: 'item'; item: ClientScheduleItem };

function groupByYear(items: ClientScheduleItem[]): ListEntry[] {
  const out: ListEntry[] = [];
  let lastYear: number | null = null;
  for (const item of items) {
    const year = new Date(item.startsAt).getFullYear();
    if (!Number.isFinite(year)) continue;
    if (year !== lastYear) {
      out.push({ kind: 'year', year });
      lastYear = year;
    }
    out.push({ kind: 'item', item });
  }
  return out;
}

export default function ClientActivityPage() {
  const pathname = usePathname();
  const locale = (extractLocaleFromPath(pathname) ?? 'en') as Locale;
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const queryClient = useQueryClient();

  const range = useMemo(() => {
    const from = new Date();
    from.setMonth(from.getMonth() - 3);
    const to = new Date();
    to.setMonth(to.getMonth() + 2);
    return { from: from.toISOString(), to: to.toISOString() };
  }, []);

  const scheduleQuery = useQuery({
    queryKey: ['client-schedule', range.from, range.to],
    queryFn: () => fetchClientSchedule(range),
  });

  const { upcoming, past } = splitSchedule(scheduleQuery.data ?? []);
  const list = tab === 'upcoming' ? upcoming : past;
  const entries = useMemo(() => groupByYear(list), [list]);

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelClientEnrollment(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['client-schedule'] }),
  });

  const reviewMutation = useMutation({
    mutationFn: (args: {
      studioId: string;
      enrollmentId?: string;
      rating: number;
      comment?: string;
    }) =>
      submitStudioReview(args.studioId, {
        rating: args.rating,
        comment: args.comment,
        enrollmentId: args.enrollmentId,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['client-schedule'] }),
  });

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold tracking-tight sm:text-[1.75rem]">
        Activity
      </h1>
      <div className="mb-4 flex rounded-full bg-white p-1">
        {(['upcoming', 'past'] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex-1 rounded-full py-2 text-sm font-semibold capitalize ${
              tab === key
                ? 'bg-[#F15942] text-white'
                : 'text-[#878787] hover:text-[#3F3F3F]'
            }`}
          >
            {key === 'upcoming' ? 'Upcoming' : 'Passes'}
          </button>
        ))}
      </div>

      {scheduleQuery.isLoading ? (
        <p className="text-sm text-[#878787]">Loading…</p>
      ) : scheduleQuery.isError ? (
        <p className="text-sm text-red-600">Failed to load schedule</p>
      ) : list.length === 0 ? (
        <div className="rounded-[14px] bg-white p-6 text-center">
          <p className="text-sm text-[#878787]">
            {tab === 'upcoming' ? 'No upcoming classes' : 'No past visits yet'}
          </p>
          <Link
            href={withLocale('/studios', locale)}
            className="mt-3 inline-block text-sm font-semibold text-[#E86D4F]"
          >
            Browse studios →
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {entries.map((entry, index) =>
            entry.kind === 'year' ? (
              <li
                key={`year-${entry.year}`}
                className={index === 0 ? 'pt-0' : 'pt-3'}
              >
                <p
                  className="text-lg font-bold leading-none"
                  style={{ color: clientTheme.text }}
                >
                  {entry.year}
                </p>
              </li>
            ) : (
              <li
                key={`${entry.item.sessionId}-${entry.item.enrollmentId ?? entry.item.id}`}
              >
                <ScheduleCard
                  item={entry.item}
                  locale={locale}
                  mode={tab === 'upcoming' ? 'upcoming' : 'past'}
                  busy={cancelMutation.isPending || reviewMutation.isPending}
                  onCancel={
                    tab === 'upcoming'
                      ? () => {
                          const id = cancelTargetId(entry.item);
                          if (id) cancelMutation.mutate(id);
                        }
                      : undefined
                  }
                  onReview={
                    tab === 'past' && entry.item.studio
                      ? (rating, comment) =>
                          reviewMutation.mutate({
                            studioId: entry.item.studio!.id,
                            enrollmentId: entry.item.enrollmentId ?? undefined,
                            rating,
                            comment: comment || undefined,
                          })
                      : undefined
                  }
                />
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}
