'use client';

import Link from 'next/link';
import type { StudioOnboardingChecklist } from '@/lib/owner/types';

type Props = {
  checklist: StudioOnboardingChecklist | null;
  locale: string;
  onPublish: () => void;
  publishing: boolean;
  studioStatus: string;
};

const steps: {
  key: keyof Pick<
    StudioOnboardingChecklist,
    | 'hasTraining'
    | 'hasPhoto'
    | 'hasLogo'
    | 'hasDescription'
    | 'contactsConfigured'
  >;
  label: string;
  href?: string;
}[] = [
  { key: 'hasTraining', label: 'Add your first class', href: 'services/new' },
  { key: 'hasPhoto', label: 'Upload studio photos', href: 'studio' },
  { key: 'hasLogo', label: 'Add logo', href: 'studio' },
  { key: 'hasDescription', label: 'Write description', href: 'studio' },
  { key: 'contactsConfigured', label: 'Set contact info', href: 'studio' },
];

export function OwnerChecklistCard({
  checklist,
  locale,
  onPublish,
  publishing,
  studioStatus,
}: Props) {
  if (!checklist || checklist.requiredCompleted || studioStatus === 'ACTIVE') {
    return null;
  }

  const base = `/${locale}/owner`;

  return (
    <div className="mb-6 rounded-2xl border border-[#EDE9F6] bg-[#F8F6FF] p-5">
      <h2 className="text-base font-semibold text-[#3F3287]">
        Complete your studio setup
      </h2>
      <p className="mt-1 text-sm text-zinc-600">
        Finish these steps to publish your studio and start taking bookings.
      </p>
      <ul className="mt-4 space-y-2">
        {steps.map((step) => {
          const s = checklist[step.key];
          if (s.completed) return null;
          const content = (
            <span className="flex items-center gap-2 text-sm text-zinc-700">
              <span className="h-2 w-2 rounded-full bg-[#FF5B5B]" />
              {step.label}
            </span>
          );
          return (
            <li key={step.key}>
              {step.href ? (
                <Link
                  href={`${base}/${step.href}`}
                  className="block rounded-lg px-2 py-1 hover:bg-white/60"
                >
                  {content}
                </Link>
              ) : (
                content
              )}
            </li>
          );
        })}
      </ul>
      {checklist.canPublish ? (
        <button
          type="button"
          disabled={publishing}
          onClick={onPublish}
          className="mt-4 rounded-full bg-[#3F3287] px-5 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {publishing ? 'Publishing…' : 'Publish studio'}
        </button>
      ) : null}
    </div>
  );
}
