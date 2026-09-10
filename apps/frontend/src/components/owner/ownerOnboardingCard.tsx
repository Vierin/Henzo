'use client';

import Link from 'next/link';
import { ChevronRight, Building2, CalendarPlus, ImagePlus } from 'lucide-react';
import { ownerTheme } from '@/lib/owner/owner-theme';

type Props = {
  studioDetailsCompleted: boolean;
  hasTraining: boolean;
  hasPhoto: boolean;
  canPublish: boolean;
  isPublishing: boolean;
  studioName?: string;
  detailsHref: string;
  trainingHref: string;
  photoHref: string;
  previewHref?: string | null;
  onPublish: () => void;
};

export function OwnerOnboardingCard({
  studioDetailsCompleted,
  hasTraining,
  hasPhoto,
  canPublish,
  isPublishing,
  detailsHref,
  trainingHref,
  photoHref,
  previewHref,
  onPublish,
}: Props) {
  const done = [studioDetailsCompleted, hasTraining, hasPhoto].filter(
    Boolean,
  ).length;
  const stepsLeft = 3 - done;
  const percent = Math.round((done * 100) / 3);
  const showPreview = Boolean(previewHref);
  const showActivate = canPublish;

  return (
    <section
      className="rounded-[18px] p-4 sm:p-[13px] sm:py-4"
      style={{ backgroundColor: 'rgba(194, 246, 0, 0.4)' }}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p
            className="text-[11px] font-medium tracking-[0.06em]"
            style={{ color: ownerTheme.textSecondary }}
          >
            ✧ LET&apos;S GET YOUR STUDIO LIVE!
          </p>
          <p
            className="mt-2 text-2xl leading-tight"
            style={{ color: ownerTheme.text }}
          >
            Your studio is
          </p>
          <p
            className="text-2xl leading-tight"
            style={{ color: ownerTheme.text }}
          >
            <span className="font-semibold">{percent}%</span> ready
          </p>
          <p
            className="mt-1.5 text-xs"
            style={{ color: ownerTheme.textSecondary }}
          >
            {stepsLeft === 1
              ? '1 step left'
              : stepsLeft === 0
                ? 'Ready to activate'
                : `${stepsLeft} steps left`}
          </p>
        </div>

        <div className="relative h-[88px] w-[88px] shrink-0 sm:h-[106px] sm:w-[106px]">
          <svg viewBox="0 0 106 106" className="h-full w-full -rotate-90">
            <circle
              cx="53"
              cy="53"
              r="42"
              fill="none"
              stroke="#FFF3F1"
              strokeWidth="8"
            />
            <circle
              cx="53"
              cy="53"
              r="42"
              fill="none"
              stroke={ownerTheme.accent}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 42}`}
              strokeDashoffset={`${2 * Math.PI * 42 * (1 - percent / 100)}`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="text-lg font-semibold sm:text-xl"
              style={{ color: ownerTheme.text }}
            >
              {percent}%
            </span>
            <span
              className="text-[10px]"
              style={{ color: ownerTheme.textSecondary }}
            >
              done
            </span>
          </div>
        </div>
      </div>

      {(showPreview || showActivate) && (
        <div className="mt-3.5 flex flex-wrap gap-2">
          {showPreview && previewHref ? (
            <Link
              href={previewHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold text-white"
              style={{ backgroundColor: ownerTheme.accent }}
            >
              Preview
            </Link>
          ) : null}
          {showActivate ? (
            <button
              type="button"
              onClick={onPublish}
              disabled={isPublishing}
              className="inline-flex items-center rounded-full border bg-white px-4 py-2 text-sm font-semibold disabled:opacity-60"
              style={{
                borderColor: ownerTheme.accent,
                color: ownerTheme.accent,
              }}
            >
              {isPublishing ? 'Activating…' : 'Activate studio'}
            </button>
          ) : null}
        </div>
      )}

      {stepsLeft > 0 ? (
        <ul className="mt-5 space-y-2.5">
          {!studioDetailsCompleted ? (
            <TaskRow
              href={detailsHref}
              icon={<Building2 className="h-4 w-4 text-white" />}
              title="Add studio details"
              subtitle="Add your studio name and address"
            />
          ) : null}
          {!hasTraining ? (
            <TaskRow
              href={trainingHref}
              icon={<CalendarPlus className="h-4 w-4 text-white" />}
              title="Create your first class"
              subtitle="Add a class clients can book"
            />
          ) : null}
          {!hasPhoto ? (
            <TaskRow
              href={photoHref}
              icon={<ImagePlus className="h-4 w-4 text-white" />}
              title="Add at least 1 photo"
              subtitle="Show clients what your studio looks like"
            />
          ) : null}
        </ul>
      ) : null}
    </section>
  );
}

function TaskRow({
  href,
  icon,
  title,
  subtitle,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-3 rounded-[14px] bg-white px-3 py-3"
      >
        <span
          className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: ownerTheme.accent }}
        >
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className="block text-sm font-semibold"
            style={{ color: ownerTheme.text }}
          >
            {title}
          </span>
          <span
            className="block text-xs"
            style={{ color: ownerTheme.textSecondary }}
          >
            {subtitle}
          </span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-[#3B5BDB]" />
      </Link>
    </li>
  );
}
