'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { extractLocaleFromPath, withLocale, type Locale } from '@/i18n/routing';
import { useOwnerStudio } from '@/contexts/OwnerStudioContext';
import { fetchStaff } from '@/lib/owner/fetch-staff';

export default function StaffPage() {
  const pathname = usePathname();
  const locale = (extractLocaleFromPath(pathname) ?? 'en') as Locale;
  const { studio } = useOwnerStudio();

  const staffQuery = useQuery({
    queryKey: ['owner-staff', studio?.id],
    queryFn: () => fetchStaff(studio!.id),
    enabled: Boolean(studio?.id),
  });

  const staff = staffQuery.data ?? [];

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Staff</h1>
          <p className="text-sm text-gray-500 mt-1">Trainers on your team</p>
        </div>
        <Link
          href={withLocale('/staff/new', locale)}
          className="rounded-lg bg-[#ea4b4b] text-white text-sm font-medium px-4 py-2"
        >
          Add staff
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-100">
        {staffQuery.isLoading ? (
          <p className="p-5 text-sm text-gray-500">Loading…</p>
        ) : staffQuery.isError ? (
          <p className="p-5 text-sm text-red-600">Failed to load staff</p>
        ) : staff.length === 0 ? (
          <p className="p-5 text-sm text-gray-500">No staff yet</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {staff.map((member) => (
              <li
                key={member.id}
                className="flex items-center justify-between px-5 py-4"
              >
                <div>
                  <div className="font-medium text-gray-900">{member.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {[member.email, member.phone, member.accessLevel]
                      .filter(Boolean)
                      .join(' · ') || '—'}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
