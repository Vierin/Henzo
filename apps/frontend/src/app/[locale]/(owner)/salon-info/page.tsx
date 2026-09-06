'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { extractLocaleFromPath, withLocale, type Locale } from '@/i18n/routing';
import { useOwnerStudio } from '@/contexts/OwnerStudioContext';

export default function SalonInfoStubPage() {
  const pathname = usePathname();
  const locale = (extractLocaleFromPath(pathname) ?? 'en') as Locale;
  const { studio } = useOwnerStudio();

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-2 text-sm text-gray-600">
        <p>
          Studio settings (booking period, auto-confirm, salon info) land in a
          later phase.
        </p>
        {studio && (
          <p>
            Current studio: <strong>{studio.name}</strong>
            {studio.address ? ` · ${studio.address}` : ''}
          </p>
        )}
        <Link
          href={withLocale('/owner-dashboard', locale)}
          className="inline-block text-[#ea4b4b] font-medium mt-2"
        >
          ← Back to dashboard
        </Link>
      </div>
    </div>
  );
}
