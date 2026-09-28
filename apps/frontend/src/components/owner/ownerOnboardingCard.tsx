'use client';

import Link from 'next/link';
import { Building2, CalendarPlus, ChevronRight, ImagePlus } from 'lucide-react';
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

type StepCard = {
  key: string;
  index: number;
  done: boolean;
  href: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
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

  const steps: StepCard[] = [
    {
      key: 'details',
      index: 1,
      done: studioDetailsCompleted,
      href: detailsHref,
      title: 'Create your studio profile',
      subtitle: 'Add your studio name, location and a short description.',
      icon: <Building2 className="h-5 w-5" />,
    },
    {
      key: 'class',
      index: 2,
      done: hasTraining,
      href: trainingHref,
      title: 'Add your first class',
      subtitle: 'Create a class, set the duration, capacity and price.',
      icon: <CalendarPlus className="h-5 w-5" />,
    },
    {
      key: 'photo',
      index: 3,
      done: hasPhoto,
      href: photoHref,
      title: 'Add at least 1 photo',
      subtitle: 'Show clients what your studio looks like.',
      icon: <ImagePlus className="h-5 w-5" />,
    },
  ];

  return (
    <section
      className="rounded-[18px] p-4 sm:p-5"
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
            className="mt-2 text-[1.75rem] leading-tight sm:text-3xl"
            style={{ color: ownerTheme.text }}
          >
            Your studio is
          </p>
          <p
            className="text-[1.75rem] leading-tight sm:text-3xl"
            style={{ color: ownerTheme.text }}
          >
            <span className="font-semibold">{percent}%</span> ready
          </p>
        </div>

        <div className="relative h-[104px] w-[104px] shrink-0 sm:h-[124px] sm:w-[124px]">
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
              className="text-xl font-semibold sm:text-2xl"
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
        <ul className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {steps
            .filter((step) => !step.done)
            .map((step) => (
              <li key={step.key} className="min-w-0">
                <Link
                  href={step.href}
                  className="flex h-full items-center gap-3 rounded-2xl bg-white p-4"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#FFF1EE] text-[#F15942]">
                    {step.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className="block text-base font-semibold leading-snug"
                      style={{ color: ownerTheme.text }}
                    >
                      {step.title}
                    </span>
                    <span className="mt-1 block text-sm leading-snug text-[#878787]">
                      {step.subtitle}
                    </span>
                  </span>
                  <ChevronRight
                    className="h-6 w-6 shrink-0 text-[#B0B0B0]"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
        </ul>
      ) : null}
    </section>
  );
}
