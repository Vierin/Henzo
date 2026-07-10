'use client';

import Link from 'next/link';

export function OwnerUpgradeCard({ locale }: { locale: string }) {
  return (
    <div className="mt-6 rounded-2xl border border-zinc-100 bg-[#FDF6F0] p-4">
      <p className="text-sm font-semibold text-[#3F3F3F]">Upgrade your plan</p>
      <p className="mt-1 text-xs leading-relaxed text-zinc-500">
        Unlock analytics, more staff, and advanced marketing tools.
      </p>
      <Link
        href={`/${locale}/owner/subscription`}
        className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-[#C2F600] px-4 py-2 text-sm font-semibold text-[#3F3F3F] transition hover:bg-[#b3e600]"
      >
        Upgrade now
      </Link>
    </div>
  );
}
