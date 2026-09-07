'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ClientPanelShell from '@/components/clientPanel/clientPanelShell';
import {
  cancelClientEnrollment,
  cancelTargetId,
  fetchClientSchedule,
  splitSchedule,
  type ClientScheduleItem,
} from '@/lib/client-panel/fetch-schedule';
import { submitStudioReview } from '@/lib/client-panel/fetch-profile';
import { extractLocaleFromPath, withLocale, type Locale } from '@/i18n/routing';
import { resolveStudioPublicSlug } from '@/utils/slug';

function formatWhen(iso: string) {
  try {
    return new Intl.DateTimeFormat('en', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleString();
  }
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

  const studioHref = item.studio
    ? withLocale(
        `/studio/${resolveStudioPublicSlug({
          id: item.studio.id,
          name: item.studio.name,
          slug: item.studio.slug,
        })}`,
        locale,
      )
    : null;

  return (
    <article className="rounded-[14px] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">
            {item.training?.name || 'Class'}
          </p>
          <p className="mt-0.5 text-sm text-[#878787]">
            {formatWhen(item.startsAt)}
            {item.trainer?.name ? ` · ${item.trainer.name}` : ''}
          </p>
          {item.studio ? (
            studioHref ? (
              <Link
                href={studioHref}
                className="mt-1 inline-block text-sm font-medium text-[#E86D4F] hover:underline"
              >
                {item.studio.name}
              </Link>
            ) : (
              <p className="mt-1 text-sm text-[#878787]">{item.studio.name}</p>
            )
          ) : null}
          {item.waitlisted || item.bookingStatus === 'WAITLISTED' ? (
            <span className="mt-2 inline-block rounded-full bg-[#FFF3CD] px-2 py-0.5 text-[11px] font-semibold text-[#8A6D00]">
              Waitlisted
            </span>
          ) : null}
        </div>
        {item.capacity ? (
          <span className="shrink-0 text-xs text-[#878787]">
            {item.bookedCount ?? 0}/{item.capacity}
          </span>
        ) : null}
      </div>

      {mode === 'upcoming' && onCancel ? (
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="mt-3 w-full rounded-xl border border-[#E8E0D8] py-2 text-sm font-semibold text-[#E86D4F] disabled:opacity-50"
        >
          Cancel booking
        </button>
      ) : null}

      {mode === 'past' &&
      onReview &&
      item.studio &&
      !item.hasReview &&
      !item.waitlisted ? (
        <div className="mt-3">
          {!reviewOpen ? (
            <button
              type="button"
              onClick={() => setReviewOpen(true)}
              className="w-full rounded-xl bg-[#E86D4F] py-2 text-sm font-semibold text-white"
            >
              Leave review
            </button>
          ) : (
            <div className="space-y-2 rounded-xl bg-[#F9F4F0] p-3">
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
              <button
                type="button"
                disabled={busy}
                onClick={() => onReview(rating, comment.trim())}
                className="w-full rounded-xl bg-[#E86D4F] py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Submit
              </button>
            </div>
          )}
        </div>
      ) : null}
    </article>
  );
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
    <ClientPanelShell title="Activity">
      <div className="mb-4 flex rounded-full bg-white p-1">
        {(['upcoming', 'past'] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex-1 rounded-full py-2 text-sm font-semibold capitalize ${
              tab === key
                ? 'bg-[#E86D4F] text-white'
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
          {list.map((item) => (
            <li key={`${item.sessionId}-${item.enrollmentId ?? item.id}`}>
              <ScheduleCard
                item={item}
                locale={locale}
                mode={tab === 'upcoming' ? 'upcoming' : 'past'}
                busy={cancelMutation.isPending || reviewMutation.isPending}
                onCancel={
                  tab === 'upcoming'
                    ? () => {
                        const id = cancelTargetId(item);
                        if (id) cancelMutation.mutate(id);
                      }
                    : undefined
                }
                onReview={
                  tab === 'past' && item.studio
                    ? (rating, comment) =>
                        reviewMutation.mutate({
                          studioId: item.studio!.id,
                          enrollmentId: item.enrollmentId ?? undefined,
                          rating,
                          comment: comment || undefined,
                        })
                    : undefined
                }
              />
            </li>
          ))}
        </ul>
      )}
    </ClientPanelShell>
  );
}
