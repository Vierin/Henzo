'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Plus, Search } from 'lucide-react';
import { extractLocaleFromPath, withLocale, type Locale } from '@/i18n/routing';
import { useOwnerStudio } from '@/contexts/OwnerStudioContext';
import { fetchStaff } from '@/lib/owner/fetch-staff';
import { fetchOwnerAccountProfile } from '@/lib/owner/fetch-account';
import type { OwnerStaffMember } from '@/lib/owner/types';
import { ownerTheme } from '@/lib/owner/owner-theme';

type RoleFilter = 'all' | 'owner' | 'trainer' | 'admin';

const ROLE_OPTIONS: { id: RoleFilter; label: string }[] = [
  { id: 'all', label: 'All roles' },
  { id: 'owner', label: 'Owner' },
  { id: 'trainer', label: 'Trainer' },
  { id: 'admin', label: 'Admin' },
];

const ACCENT_TONES = [
  '#22C55E',
  '#8B5CF6',
  '#3B82F6',
  '#EAB308',
  '#EC4899',
  '#F15942',
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}

function accentFor(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++)
    h = (h + key.charCodeAt(i) * 17) % ACCENT_TONES.length;
  return ACCENT_TONES[h]!;
}

function roleKey(accessLevel: string | null | undefined): RoleFilter {
  const a = (accessLevel || '').toUpperCase();
  if (a === 'OWNER') return 'owner';
  if (a === 'ADMIN') return 'admin';
  return 'trainer';
}

function roleLabel(accessLevel: string | null | undefined): string {
  switch (roleKey(accessLevel)) {
    case 'owner':
      return 'Owner';
    case 'admin':
      return 'Admin';
    default:
      return 'Trainer';
  }
}

function roleBadgeStyle(accessLevel: string | null | undefined): {
  bg: string;
  color: string;
} {
  switch (roleKey(accessLevel)) {
    case 'owner':
      return { bg: '#FEE5DF', color: ownerTheme.accent };
    case 'admin':
      return { bg: '#E0E7FF', color: '#4338CA' };
    default:
      return { bg: '#DCFCE7', color: '#166534' };
  }
}

export default function StaffPage() {
  const pathname = usePathname();
  const locale = (extractLocaleFromPath(pathname) ?? 'en') as Locale;
  const { studio } = useOwnerStudio();
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');

  const staffQuery = useQuery({
    queryKey: ['owner-staff', studio?.id],
    queryFn: () => fetchStaff(studio!.id),
    enabled: Boolean(studio?.id),
  });

  const profileQuery = useQuery({
    queryKey: ['owner-account-profile'],
    queryFn: fetchOwnerAccountProfile,
  });

  const staff = staffQuery.data ?? [];
  const ownerProfile = profileQuery.data;

  const ownerEmail = ownerProfile?.email?.trim().toLowerCase() || '';
  const ownerName =
    ownerProfile?.name?.trim() || ownerEmail.split('@')[0] || 'Owner';

  const trainers = useMemo(() => {
    return staff.filter((m) => {
      const email = m.email?.trim().toLowerCase() || '';
      if (ownerEmail && email && email === ownerEmail) return false;
      if ((m.accessLevel || '').toUpperCase() === 'OWNER') return false;
      return true;
    });
  }, [staff, ownerEmail]);

  const query = q.trim().toLowerCase();

  const showOwner =
    roleFilter === 'all' || roleFilter === 'owner'
      ? !query ||
        ownerName.toLowerCase().includes(query) ||
        ownerEmail.includes(query)
      : false;

  const filteredTrainers = useMemo(() => {
    return trainers.filter((m) => {
      if (roleFilter === 'owner') return false;
      if (roleFilter === 'trainer' && roleKey(m.accessLevel) !== 'trainer') {
        return false;
      }
      if (roleFilter === 'admin' && roleKey(m.accessLevel) !== 'admin') {
        return false;
      }
      if (!query) return true;
      return (
        m.name.toLowerCase().includes(query) ||
        (m.email || '').toLowerCase().includes(query) ||
        (m.phone || '').toLowerCase().includes(query)
      );
    });
  }, [trainers, roleFilter, query]);

  return (
    <div className="space-y-5 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1
            className="text-2xl font-semibold tracking-tight md:text-[28px]"
            style={{ color: ownerTheme.text }}
          >
            Staff
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: ownerTheme.textSecondary }}
          >
            Trainers and team members
          </p>
        </div>
        <Link
          href={withLocale('/staff/new', locale)}
          className="inline-flex h-10 items-center gap-1.5 rounded-[12px] px-4 text-sm font-semibold text-white"
          style={{ backgroundColor: ownerTheme.accent }}
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Add staff
        </Link>
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <label className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
            style={{ color: ownerTheme.textSecondary }}
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search staff…"
            className="w-full rounded-[12px] bg-white py-2.5 pl-10 pr-3 text-sm outline-none"
            style={{ color: ownerTheme.text }}
          />
        </label>
        <label className="relative shrink-0">
          <span className="sr-only">Role</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
            className="appearance-none rounded-[12px] bg-white py-2.5 pl-3 pr-8 text-sm font-semibold outline-none"
            style={{ color: ownerTheme.text }}
          >
            {ROLE_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
            style={{ color: ownerTheme.textSecondary }}
          />
        </label>
      </div>

      {staffQuery.isLoading || profileQuery.isLoading ? (
        <p className="text-sm" style={{ color: ownerTheme.textSecondary }}>
          Loading…
        </p>
      ) : staffQuery.isError ? (
        <p className="text-sm text-red-600">Failed to load staff</p>
      ) : (
        <div className="space-y-6">
          {showOwner ? (
            <section>
              <h2
                className="mb-2.5 text-[13px] font-bold uppercase tracking-[0.08em]"
                style={{ color: ownerTheme.text }}
              >
                Owner
              </h2>
              <OwnerCard
                name={ownerName}
                email={ownerProfile?.email || ''}
                accent={ownerTheme.accent}
              />
            </section>
          ) : null}

          {(roleFilter === 'all' ||
            roleFilter === 'trainer' ||
            roleFilter === 'admin') && (
            <section>
              <h2
                className="mb-2.5 text-[13px] font-bold uppercase tracking-[0.08em]"
                style={{ color: ownerTheme.text }}
              >
                Trainers
                {filteredTrainers.length > 0
                  ? ` · ${filteredTrainers.length}`
                  : ''}
              </h2>
              {filteredTrainers.length === 0 ? (
                <div className="rounded-[14px] bg-white px-4 py-10 text-center">
                  <p
                    className="text-sm"
                    style={{ color: ownerTheme.textSecondary }}
                  >
                    No trainers yet
                  </p>
                </div>
              ) : (
                <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {filteredTrainers.map((m) => (
                    <li key={m.id}>
                      <TrainerCard member={m} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function OwnerCard({
  name,
  email,
  accent,
}: {
  name: string;
  email: string;
  accent: string;
}) {
  const badge = roleBadgeStyle('OWNER');
  return (
    <article className="flex overflow-hidden rounded-[14px] bg-white">
      <span
        className="w-1 shrink-0 self-stretch"
        style={{ backgroundColor: accent }}
        aria-hidden
      />
      <div className="flex min-w-0 flex-1 items-center gap-3.5 px-4 py-3.5">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold"
          style={{ backgroundColor: '#FEE5DF', color: accent }}
        >
          {initials(name)}
        </span>
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-[15px] font-bold"
            style={{ color: ownerTheme.text }}
          >
            {name}
          </p>
          {email ? (
            <p
              className="mt-0.5 truncate text-sm"
              style={{ color: ownerTheme.textSecondary }}
            >
              {email}
            </p>
          ) : null}
          <span
            className="mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold"
            style={{ backgroundColor: badge.bg, color: badge.color }}
          >
            Owner
          </span>
        </div>
      </div>
    </article>
  );
}

function TrainerCard({ member }: { member: OwnerStaffMember }) {
  const accent = accentFor(member.id);
  const badge = roleBadgeStyle(member.accessLevel);
  const trainingsCount = member.Training?.length ?? 0;

  return (
    <article className="flex h-full overflow-hidden rounded-[14px] bg-white">
      <span
        className="w-1 shrink-0 self-stretch"
        style={{ backgroundColor: accent }}
        aria-hidden
      />
      <div className="flex min-w-0 flex-1 flex-col gap-3 px-4 py-3.5">
        <div className="flex items-start gap-3">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold"
            style={{
              backgroundColor: `${accent}22`,
              color: accent,
            }}
          >
            {initials(member.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p
              className="truncate text-[15px] font-bold"
              style={{ color: ownerTheme.text }}
            >
              {member.name}
            </p>
            {member.email ? (
              <p
                className="mt-0.5 truncate text-sm"
                style={{ color: ownerTheme.textSecondary }}
              >
                {member.email}
              </p>
            ) : null}
            <span
              className="mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold"
              style={{ backgroundColor: badge.bg, color: badge.color }}
            >
              {roleLabel(member.accessLevel)}
            </span>
          </div>
        </div>

        <div
          className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t pt-3 text-sm"
          style={{ borderColor: ownerTheme.borderSoft, color: ownerTheme.text }}
        >
          <span className="inline-flex items-center gap-1.5">
            <IconCalendar />
            <span className="tabular-nums">
              {trainingsCount} {trainingsCount === 1 ? 'training' : 'trainings'}
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <IconClients />
            <span className="tabular-nums">0 clients</span>
          </span>
        </div>
      </div>
    </article>
  );
}

/** Mobile `icon-calendar.svg` */
function IconCalendar() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 13 12" fill="none" aria-hidden>
      <path
        d="M0.5 4.77778H12.5M3.16667 0.5V1.72222M9.83333 0.5V1.72222M2.63333 11.5H10.3667C11.1134 11.5 11.4868 11.5 11.772 11.3668C12.0229 11.2496 12.2269 11.0626 12.3547 10.8327C12.5 10.5712 12.5 10.2289 12.5 9.54444V3.67778C12.5 2.99327 12.5 2.65101 12.3547 2.38957C12.2269 2.15959 12.0229 1.97261 11.772 1.85544C11.4868 1.72222 11.1134 1.72222 10.3667 1.72222H2.63333C1.8866 1.72222 1.51323 1.72222 1.22801 1.85544C0.977127 1.97261 0.773153 2.15959 0.645327 2.38957C0.5 2.65101 0.5 2.99327 0.5 3.67778V9.54444C0.5 10.2289 0.5 10.5712 0.645327 10.8327C0.773153 11.0626 0.977127 11.2496 1.22801 11.3668C1.51323 11.5 1.88659 11.5 2.63333 11.5Z"
        stroke="#4D39A8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Mobile `icon-clients.svg` */
function IconClients() {
  return (
    <svg className="h-3.5 w-4" viewBox="0 0 22 20" fill="none" aria-hidden>
      <path
        d="M16.2225 18.5435V16.7384C16.2225 15.7809 15.815 14.8626 15.0895 14.1856C14.3641 13.5085 13.3803 13.1282 12.3544 13.1282H4.61812C3.59223 13.1282 2.60836 13.5085 1.88295 14.1856C1.15753 14.8626 0.75 15.7809 0.75 16.7384V18.5435"
        stroke="#4D39A8"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.48531 8.48649C10.6216 8.48649 12.3534 6.75467 12.3534 4.61837C12.3534 2.48206 10.6216 0.750244 8.48531 0.750244C6.34901 0.750244 4.61719 2.48206 4.61719 4.61837C4.61719 6.75467 6.34901 8.48649 8.48531 8.48649Z"
        stroke="#4D39A8"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20.9675 18.5435V16.6984C20.9669 15.8808 20.6626 15.0865 20.1025 14.4403C19.5424 13.7941 18.7582 13.3326 17.873 13.1282"
        stroke="#4D39A8"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14.0039 0.750244C14.8891 0.970154 15.6737 1.46967 16.234 2.17003C16.7943 2.87039 17.0984 3.73177 17.0984 4.61837C17.0984 5.50496 16.7943 6.36634 16.234 7.0667C15.6737 7.76707 14.8891 8.26658 14.0039 8.48649"
        stroke="#4D39A8"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
