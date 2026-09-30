'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowUpDown,
  Mail,
  Phone,
  Plus,
  Search,
  Upload,
  X,
} from 'lucide-react';
import { extractLocaleFromPath, withLocale } from '@/i18n/routing';
import { useOwnerStudio } from '@/contexts/OwnerStudioContext';
import {
  clientDisplayName,
  clientInitials,
  clientStatus,
  createStudioClient,
  fetchOwnerSessionBookings,
  fetchStudioClients,
  parseClientsCsv,
  searchStudioClients,
  type ClientStatus,
  type OwnerSessionBookingRow,
} from '@/lib/owner/fetch-clients';
import type { OwnerStudioClient } from '@/lib/owner/types';
import { ownerTheme } from '@/lib/owner/owner-theme';
import {
  formatOwnerDateShort,
  formatOwnerTime24h,
  isPlaceholderTrainerName,
} from '@/lib/owner/format-time';
import { OwnerSelect } from '@/components/owner/ownerSelect';

type StatusFilter = 'all' | ClientStatus;
type SortKey =
  | 'lastVisitDesc'
  | 'lastVisitAsc'
  | 'nameAsc'
  | 'nameDesc'
  | 'visitsDesc'
  | 'visitsAsc';

const PAGE_SIZE = 10;

const VISIT_ACCENTS = [
  '#EAB308',
  '#EC4899',
  '#22C55E',
  '#3B82F6',
  '#F15942',
  '#8B5CF6',
];

const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: 'lastVisitDesc', label: 'Last visit · newest' },
  { id: 'lastVisitAsc', label: 'Last visit · oldest' },
  { id: 'nameAsc', label: 'Name · A–Z' },
  { id: 'nameDesc', label: 'Name · Z–A' },
  { id: 'visitsDesc', label: 'Visits · high–low' },
  { id: 'visitsAsc', label: 'Visits · low–high' },
];

const AVATAR_TONES = ['#FAD0C5', '#C2F600', '#F8EDE5', '#FEE2E2', '#E0E7FF'];

function avatarTone(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++)
    h = (h + key.charCodeAt(i)) % AVATAR_TONES.length;
  return AVATAR_TONES[h]!;
}

function statusStyle(s: ClientStatus): {
  bg: string;
  color: string;
  label: string;
} {
  switch (s) {
    case 'active':
      return { bg: '#DCFCE7', color: '#166534', label: 'Active' };
    case 'new':
      return { bg: '#FFEDD5', color: '#C2410C', label: 'New' };
    default:
      return { bg: '#F3F4F6', color: '#6B7280', label: 'Inactive' };
  }
}

function clientKey(c: OwnerStudioClient): string {
  return c.studioClientId || c.userId;
}

export default function ClientsPage() {
  const { studio } = useOwnerStudio();
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('lastVisitDesc');
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (!sortOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!sortRef.current?.contains(e.target as Node)) setSortOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [sortOpen]);

  useEffect(() => {
    setPage(1);
  }, [debounced, statusFilter, sortKey]);

  const listQuery = useQuery({
    queryKey: ['owner-clients'],
    queryFn: fetchStudioClients,
    enabled: Boolean(studio?.id) && debounced.length < 2,
  });

  const searchQuery = useQuery({
    queryKey: ['owner-clients-search', debounced],
    queryFn: () => searchStudioClients(debounced),
    enabled: Boolean(studio?.id) && debounced.length >= 2,
  });

  const allClients =
    debounced.length >= 2 ? (searchQuery.data ?? []) : (listQuery.data ?? []);
  const isLoading =
    debounced.length >= 2 ? searchQuery.isLoading : listQuery.isLoading;
  const isError =
    debounced.length >= 2 ? searchQuery.isError : listQuery.isError;

  const stats = useMemo(() => {
    const now = new Date();
    let active = 0;
    let inactive = 0;
    let neu = 0;
    for (const c of listQuery.data ?? []) {
      const s = clientStatus(c, now);
      if (s === 'new') neu += 1;
      else if (s === 'active') active += 1;
      else inactive += 1;
    }
    return {
      total: (listQuery.data ?? []).length,
      active,
      newThisMonth: neu,
      inactive,
    };
  }, [listQuery.data]);

  const filtered = useMemo(() => {
    const list =
      statusFilter === 'all'
        ? [...allClients]
        : allClients.filter((c) => clientStatus(c) === statusFilter);

    const nameOf = (c: OwnerStudioClient) => clientDisplayName(c).toLowerCase();
    const visitMs = (c: OwnerStudioClient) =>
      c.lastVisit ? new Date(c.lastVisit).getTime() : 0;
    const visits = (c: OwnerStudioClient) => c.visitsCount ?? 0;

    list.sort((a, b) => {
      switch (sortKey) {
        case 'lastVisitAsc':
          return visitMs(a) - visitMs(b);
        case 'nameAsc':
          return nameOf(a).localeCompare(nameOf(b));
        case 'nameDesc':
          return nameOf(b).localeCompare(nameOf(a));
        case 'visitsDesc':
          return visits(b) - visits(a);
        case 'visitsAsc':
          return visits(a) - visits(b);
        case 'lastVisitDesc':
        default:
          return visitMs(b) - visitMs(a);
      }
    });
    return list;
  }, [allClients, statusFilter, sortKey]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const selected = useMemo(
    () =>
      selectedId
        ? (allClients.find((c) => clientKey(c) === selectedId) ??
          (listQuery.data ?? []).find((c) => clientKey(c) === selectedId) ??
          null)
        : null,
    [selectedId, allClients, listQuery.data],
  );

  return (
    <div className="space-y-4 lg:space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: ownerTheme.text }}
          >
            Clients
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: ownerTheme.textSecondary }}
          >
            {stats.total} clients in your studio
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-stretch gap-2">
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-[12px] px-4 text-sm font-semibold text-white"
            style={{ backgroundColor: ownerTheme.accent }}
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Add client
          </button>
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-[12px] bg-white px-4 text-sm font-semibold"
            style={{ color: ownerTheme.text }}
          >
            <Upload className="h-4 w-4" style={{ color: ownerTheme.accent }} />
            Import
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3">
        <StatCard
          label="Total clients"
          value={stats.total}
          icon={<IconClients />}
          iconBg="#FEE5DF"
          iconColor={ownerTheme.accent}
        />
        <StatCard
          label="Active"
          value={stats.active}
          icon={<IconProfile />}
          iconBg="#DCFCE7"
          iconColor="#16A34A"
        />
        <StatCard
          label="New this month"
          value={stats.newThisMonth}
          icon={<IconAddPeople />}
          iconBg="#FEE5DF"
          iconColor={ownerTheme.accent}
        />
        <StatCard
          label="Inactive"
          value={stats.inactive}
          icon={<IconPersonMinus />}
          iconBg="#F3F4F6"
          iconColor="#6B7280"
        />
      </div>

      <div
        className={`grid items-start gap-4 ${
          selected ? 'lg:grid-cols-[minmax(0,1fr)_380px]' : 'lg:grid-cols-1'
        }`}
      >
        <div className="min-w-0 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <label className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                  style={{ color: ownerTheme.textSecondary }}
                />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by name, email or phone…"
                  className="w-full rounded-[12px] bg-white py-2.5 pl-10 pr-3 text-sm outline-none"
                  style={{ color: ownerTheme.text }}
                />
              </label>

              <div ref={sortRef} className="relative shrink-0 md:hidden">
                <button
                  type="button"
                  aria-label="Sort"
                  aria-expanded={sortOpen}
                  onClick={() => setSortOpen((open) => !open)}
                  className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-white"
                  style={{ color: ownerTheme.text }}
                >
                  <ArrowUpDown className="h-4 w-4" />
                </button>
                {sortOpen ? (
                  <ul
                    className="absolute right-0 z-30 mt-2 w-max min-w-[240px] rounded-[16px] border bg-white p-1.5 shadow-[0_16px_40px_rgba(63,50,135,0.14)]"
                    style={{ borderColor: ownerTheme.borderSoft }}
                  >
                    {SORT_OPTIONS.map((option) => {
                      const selected = sortKey === option.id;
                      return (
                        <li key={option.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSortKey(option.id);
                              setSortOpen(false);
                            }}
                            className="flex w-full whitespace-nowrap rounded-[12px] px-3 py-2.5 text-left text-sm font-medium"
                            style={{
                              color: ownerTheme.text,
                              backgroundColor: selected
                                ? 'rgba(241, 89, 66, 0.1)'
                                : undefined,
                              fontWeight: selected ? 600 : 500,
                            }}
                          >
                            {option.label}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  ['all', 'All'],
                  ['active', 'Active'],
                  ['new', 'New'],
                  ['inactive', 'Inactive'],
                ] as const
              ).map(([id, label]) => {
                const on = statusFilter === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setStatusFilter(id)}
                    className="rounded-[12px] px-3 py-2 text-sm font-semibold"
                    style={
                      on
                        ? {
                            backgroundColor: ownerTheme.accent,
                            color: '#fff',
                          }
                        : {
                            backgroundColor: '#fff',
                            color: ownerTheme.text,
                          }
                    }
                  >
                    {label}
                  </button>
                );
              })}
              <OwnerSelect
                value={sortKey}
                onChange={(v) => setSortKey(v as SortKey)}
                size="compact"
                aria-label="Sort"
                className="ml-0 hidden min-w-[240px] md:block sm:ml-1"
                options={SORT_OPTIONS.map((o) => ({
                  value: o.id,
                  label: o.label,
                }))}
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-[16px] bg-white">
            {isLoading ? (
              <p
                className="p-5 text-sm"
                style={{ color: ownerTheme.textSecondary }}
              >
                Loading…
              </p>
            ) : isError ? (
              <p className="p-5 text-sm text-red-600">Failed to load clients</p>
            ) : filtered.length === 0 ? (
              <p
                className="p-5 text-sm"
                style={{ color: ownerTheme.textSecondary }}
              >
                No clients found
              </p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead>
                      <tr
                        className="border-b border-[#F1E4DB] text-xs font-semibold uppercase tracking-wide"
                        style={{ color: ownerTheme.textSecondary }}
                      >
                        <th className="px-4 py-3 font-semibold">Client</th>
                        <th className="px-4 py-3 font-semibold">Email</th>
                        <th className="hidden px-4 py-3 font-semibold md:table-cell">
                          Phone
                        </th>
                        <th className="px-4 py-3 font-semibold">Visits</th>
                        <th className="px-4 py-3 font-semibold">Last visit</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageItems.map((c) => {
                        const key = clientKey(c);
                        const name = clientDisplayName(c);
                        const st = statusStyle(clientStatus(c));
                        const on = selectedId === key;
                        return (
                          <tr
                            key={key}
                            onClick={() =>
                              setSelectedId((cur) => (cur === key ? null : key))
                            }
                            className="cursor-pointer border-b border-[#F8EDE5] transition last:border-0 hover:bg-[#FFFCF9]"
                            style={{
                              backgroundColor: on
                                ? 'rgba(241, 89, 66, 0.06)'
                                : undefined,
                            }}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <span
                                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                                  style={{
                                    backgroundColor: avatarTone(name),
                                    color: ownerTheme.text,
                                  }}
                                >
                                  {clientInitials(name)}
                                </span>
                                <span
                                  className="truncate font-semibold"
                                  style={{ color: ownerTheme.text }}
                                >
                                  {name}
                                </span>
                              </div>
                            </td>
                            <td
                              className="max-w-[180px] truncate px-4 py-3"
                              style={{ color: ownerTheme.textSecondary }}
                            >
                              {c.email || '—'}
                            </td>
                            <td
                              className="hidden px-4 py-3 md:table-cell"
                              style={{ color: ownerTheme.textSecondary }}
                            >
                              {c.phone || '—'}
                            </td>
                            <td
                              className="px-4 py-3 tabular-nums font-medium"
                              style={{ color: ownerTheme.text }}
                            >
                              {c.visitsCount ?? 0}
                            </td>
                            <td
                              className="px-4 py-3 tabular-nums font-medium"
                              style={{ color: ownerTheme.text }}
                            >
                              {formatOwnerDateShort(c.lastVisit || '')}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold"
                                style={{
                                  backgroundColor: st.bg,
                                  color: st.color,
                                }}
                              >
                                {st.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div
                  className="flex flex-wrap items-center justify-between gap-2 border-t border-[#F1E4DB] px-4 py-3 text-sm"
                  style={{ color: ownerTheme.textSecondary }}
                >
                  <span>
                    Showing {(page - 1) * PAGE_SIZE + 1}–
                    {Math.min(page * PAGE_SIZE, filtered.length)} of{' '}
                    {filtered.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="rounded-[10px] bg-[#FCF3EC] px-2.5 py-1.5 text-sm font-semibold disabled:opacity-40"
                      style={{ color: ownerTheme.text }}
                    >
                      Prev
                    </button>
                    <span className="px-2 tabular-nums">
                      {page} / {pageCount}
                    </span>
                    <button
                      type="button"
                      disabled={page >= pageCount}
                      onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                      className="rounded-[10px] bg-[#FCF3EC] px-2.5 py-1.5 text-sm font-semibold disabled:opacity-40"
                      style={{ color: ownerTheme.text }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {selected ? (
          <ClientDetailSidebar
            client={selected}
            onClose={() => setSelectedId(null)}
          />
        ) : null}
      </div>

      {addOpen ? (
        <AddClientModal
          onClose={() => setAddOpen(false)}
          onCreated={async () => {
            setAddOpen(false);
            await queryClient.invalidateQueries({
              queryKey: ['owner-clients'],
            });
          }}
        />
      ) : null}

      {importOpen ? (
        <ImportClientsModal
          onClose={() => setImportOpen(false)}
          onDone={async () => {
            setImportOpen(false);
            await queryClient.invalidateQueries({
              queryKey: ['owner-clients'],
            });
          }}
        />
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  iconBg,
  iconColor,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="rounded-[16px] bg-white px-3.5 py-3.5 sm:px-4">
      <div className="flex items-center gap-2.5">
        <span
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: iconBg, color: iconColor }}
        >
          {icon}
        </span>
        <p
          className="min-w-0 text-xs font-medium leading-snug sm:text-sm"
          style={{ color: ownerTheme.textSecondary }}
        >
          {label}
        </p>
      </div>
      <p
        className="mt-2 text-2xl font-bold tabular-nums"
        style={{ color: ownerTheme.text }}
      >
        {value}
      </p>
    </div>
  );
}

/** Mobile `icon-clients.svg` */
function IconClients({ className = 'h-[18px] w-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 22 20" fill="none" aria-hidden>
      <path
        d="M16.2225 18.5435V16.7384C16.2225 15.7809 15.815 14.8626 15.0895 14.1856C14.3641 13.5085 13.3803 13.1282 12.3544 13.1282H4.61812C3.59223 13.1282 2.60836 13.5085 1.88295 14.1856C1.15753 14.8626 0.75 15.7809 0.75 16.7384V18.5435"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.48531 8.48649C10.6216 8.48649 12.3534 6.75467 12.3534 4.61837C12.3534 2.48206 10.6216 0.750244 8.48531 0.750244C6.34901 0.750244 4.61719 2.48206 4.61719 4.61837C4.61719 6.75467 6.34901 8.48649 8.48531 8.48649Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20.9675 18.5435V16.6984C20.9669 15.8808 20.6626 15.0865 20.1025 14.4403C19.5424 13.7941 18.7582 13.3326 17.873 13.1282"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14.0039 0.750244C14.8891 0.970154 15.6737 1.46967 16.234 2.17003C16.7943 2.87039 17.0984 3.73177 17.0984 4.61837C17.0984 5.50496 16.7943 6.36634 16.234 7.0667C15.6737 7.76707 14.8891 8.26658 14.0039 8.48649"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Mobile `icon-profile.svg` */
function IconProfile({ className = 'h-4 w-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 10 12" fill="none" aria-hidden>
      <path
        d="M9.46645 10.7067V9.67127C9.46645 9.12203 9.23028 8.59528 8.8099 8.2069C8.38951 7.81853 7.81935 7.60034 7.22484 7.60034H2.74161C2.1471 7.60034 1.57694 7.81853 1.15655 8.2069C0.736169 8.59528 0.5 9.12203 0.5 9.67127V10.7067"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.9838 4.93771C6.22181 4.93771 7.22541 3.9443 7.22541 2.71886C7.22541 1.49342 6.22181 0.5 4.9838 0.5C3.74579 0.5 2.74219 1.49342 2.74219 2.71886C2.74219 3.9443 3.74579 4.93771 4.9838 4.93771Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Mobile `icon-add-people.svg` */
function IconAddPeople({ className = 'h-[18px] w-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 20" fill="none" aria-hidden>
      <path
        d="M16.3812 18.5433V16.7382C16.3812 15.7807 15.9695 14.8624 15.2366 14.1853C14.5038 13.5083 13.5098 13.1279 12.4734 13.1279H4.6578C3.62138 13.1279 2.62742 13.5083 1.89457 14.1853C1.16171 14.8624 0.75 15.7807 0.75 16.7382V18.5433"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.566 8.48625C10.7242 8.48625 12.4738 6.75443 12.4738 4.61812C12.4738 2.48182 10.7242 0.75 8.566 0.75C6.40778 0.75 4.6582 2.48182 4.6582 4.61812C4.6582 6.75443 6.40778 8.48625 8.566 8.48625Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M23.2363 8.99316L14.7507 8.99293"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M18.9941 13.2358L18.9939 4.75024"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Mobile `icon-person-minus.svg` */
function IconPersonMinus({
  className = 'h-[18px] w-[18px]',
}: {
  className?: string;
}) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="9"
        cy="7"
        r="4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="22"
        x2="16"
        y1="11"
        y2="11"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function visitAccent(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++)
    h = (h + key.charCodeAt(i) * 17) % VISIT_ACCENTS.length;
  return VISIT_ACCENTS[h]!;
}

function isNoShowStatus(status: string): boolean {
  const s = status
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
  return s === 'NO_SHOW' || s === 'NOSHOW';
}

function memberSinceLabel(
  rosterCreatedAt: string | null | undefined,
  firstVisitAt: string | null | undefined,
): string {
  const raw = rosterCreatedAt || firstVisitAt;
  if (!raw) return 'No visits yet';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return 'No visits yet';
  const monthYear = new Intl.DateTimeFormat('en', {
    month: 'long',
    year: 'numeric',
  }).format(d);
  return `Member since ${monthYear}`;
}

function ClientDetailSidebar({
  client,
  onClose,
}: {
  client: OwnerStudioClient;
  onClose: () => void;
}) {
  const { studio } = useOwnerStudio();
  const pathname = usePathname() || '/';
  const locale = extractLocaleFromPath(pathname) ?? 'en';
  const calendarHref = withLocale('/calendar', locale);
  const name = clientDisplayName(client);
  const phone = client.phone?.trim() || '';
  const email = client.email?.trim() || '';
  const canBook = Boolean(client.userId);

  const bookingsQuery = useQuery({
    queryKey: ['owner-session-bookings'],
    queryFn: () => fetchOwnerSessionBookings({ limit: 200 }),
  });

  const clientBookings = useMemo(() => {
    const rows = bookingsQuery.data ?? [];
    return rows
      .filter((b) => b.user?.id === client.userId)
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }, [bookingsQuery.data, client.userId]);

  const firstVisitAt =
    clientBookings.length > 0
      ? clientBookings.reduce(
          (min, b) =>
            new Date(b.time).getTime() < new Date(min).getTime() ? b.time : min,
          clientBookings[0]!.time,
        )
      : client.lastVisit || null;

  const noShowCount = clientBookings.filter((b) =>
    isNoShowStatus(b.status),
  ).length;
  const totalVisits = client.visitsCount ?? clientBookings.length;
  const locationFallback =
    studio?.name?.trim() ||
    (typeof studio?.reminderSettings?.defaultLocationName === 'string'
      ? studio.reminderSettings.defaultLocationName.trim()
      : '') ||
    '';

  return (
    <aside className="relative flex max-h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-[16px] bg-white lg:sticky lg:top-20">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-2.5 top-2.5 z-10 rounded-lg p-1"
        style={{ color: ownerTheme.textSecondary }}
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto px-3.5 pb-4 pt-3.5">
        <div className="flex items-start gap-3.5 pr-8">
          <span
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-bold"
            style={{
              backgroundColor: '#FEE5DF',
              color: ownerTheme.accent,
            }}
          >
            {clientInitials(name)}
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <h2
              className="text-xl font-bold leading-tight tracking-tight"
              style={{ color: ownerTheme.text }}
            >
              {name}
            </h2>
            <p
              className="mt-1 text-[13px] font-medium"
              style={{ color: ownerTheme.textSecondary }}
            >
              {memberSinceLabel(client.rosterCreatedAt, firstVisitAt)}
            </p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm font-semibold">
              <p style={{ color: ownerTheme.text }}>
                Total visits
                <span
                  className="font-medium"
                  style={{ color: ownerTheme.textSecondary }}
                >
                  {' '}
                  · {totalVisits}
                </span>
              </p>
              <p style={{ color: ownerTheme.text }}>
                No show
                <span
                  className="font-medium"
                  style={{ color: ownerTheme.textSecondary }}
                >
                  {' '}
                  · {noShowCount}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <ClientActionTile
            href={phone ? `tel:${phone}` : undefined}
            disabled={!phone}
            icon={<Phone className="h-3.5 w-3.5" />}
            label="Call"
          />
          <ClientActionTile
            href={email ? `mailto:${email}` : undefined}
            disabled={!email}
            icon={<Mail className="h-3.5 w-3.5" />}
            label="Email"
          />
          <ClientActionTile
            href={canBook ? calendarHref : undefined}
            disabled={!canBook}
            filled
            icon={<Plus className="h-5 w-5" strokeWidth={2.5} />}
            label="Book"
          />
        </div>

        <div>
          <h3
            className="text-[13px] font-bold uppercase tracking-[0.08em]"
            style={{ color: ownerTheme.text }}
          >
            Visits
          </h3>
          <div className="mt-2.5 space-y-2.5">
            {bookingsQuery.isLoading ? (
              <p
                className="py-6 text-center text-sm"
                style={{ color: ownerTheme.textSecondary }}
              >
                Loading…
              </p>
            ) : clientBookings.length === 0 ? (
              <p
                className="py-6 text-center text-sm"
                style={{ color: ownerTheme.textSecondary }}
              >
                No bookings yet
              </p>
            ) : (
              clientBookings.map((b) => (
                <ClientVisitCard
                  key={b.id}
                  booking={b}
                  locationFallback={locationFallback}
                />
              ))
            )}
          </div>
        </div>

        {client.notes?.trim() ? (
          <div>
            <h3
              className="text-[13px] font-bold uppercase tracking-[0.08em]"
              style={{ color: ownerTheme.text }}
            >
              Notes
            </h3>
            <div
              className="mt-2.5 rounded-[14px] px-3.5 py-3"
              style={{ backgroundColor: ownerTheme.bg }}
            >
              <p
                className="text-sm leading-relaxed whitespace-pre-wrap"
                style={{ color: ownerTheme.text }}
              >
                {client.notes.trim()}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function ClientActionTile({
  href,
  disabled,
  icon,
  label,
  filled,
}: {
  href?: string;
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
  filled?: boolean;
}) {
  const className =
    'flex h-[72px] flex-col items-center justify-center gap-2 rounded-[14px] text-sm font-semibold transition-opacity';
  const style = filled
    ? { backgroundColor: ownerTheme.accent, color: '#fff' }
    : { backgroundColor: ownerTheme.bg, color: ownerTheme.textSecondary };

  if (disabled || !href) {
    return (
      <span className={`${className} opacity-45`} style={style} aria-disabled>
        {icon}
        {label}
      </span>
    );
  }

  if (href.startsWith('tel:') || href.startsWith('mailto:')) {
    return (
      <a href={href} className={className} style={style}>
        {icon}
        {label}
      </a>
    );
  }

  return (
    <Link href={href} className={className} style={style}>
      {icon}
      {label}
    </Link>
  );
}

function ClientVisitCard({
  booking,
  locationFallback,
}: {
  booking: OwnerSessionBookingRow;
  locationFallback: string;
}) {
  const accent = visitAccent(booking.id);
  const duration = booking.service?.duration;
  const trainerRaw = booking.staff?.name?.trim() || '';
  const trainer = isPlaceholderTrainerName(trainerRaw) ? '' : trainerRaw;
  const location = locationFallback;

  return (
    <article className="flex overflow-hidden rounded-[14px] bg-[#FDF8F5]">
      <span
        className="w-1 shrink-0 self-stretch"
        style={{ backgroundColor: accent }}
        aria-hidden
      />
      <div className="flex w-[56px] shrink-0 flex-col justify-around py-3.5 pl-3 pr-0">
        <span
          className="text-[17px] font-semibold leading-none tracking-tight tabular-nums"
          style={{ color: ownerTheme.text }}
        >
          {formatOwnerTime24h(booking.time)}
        </span>
        <span className="text-[11px] font-semibold text-[#A4A4A4]">
          {duration ? `${duration} min` : '—'}
        </span>
      </div>
      <span
        className="w-px shrink-0 self-stretch"
        style={{ backgroundColor: accent }}
        aria-hidden
      />
      <div className="min-w-0 flex-1 py-3.5 pl-3 pr-2">
        <p
          className="truncate text-[15px] font-bold leading-none tracking-tight"
          style={{ color: ownerTheme.text }}
        >
          {booking.service?.name || 'Class'}
        </p>
        {location ? (
          <p
            className="mt-2 flex items-start gap-1 text-sm"
            style={{ color: ownerTheme.text }}
          >
            <IconPin className="mt-0.5 shrink-0" />
            <span className="line-clamp-2">{location}</span>
          </p>
        ) : null}
        {trainer ? (
          <p
            className={`flex items-center gap-1 text-sm ${location ? 'mt-1' : 'mt-2'}`}
            style={{ color: ownerTheme.text }}
          >
            <IconProfileMini className="shrink-0" />
            <span className="truncate">{trainer}</span>
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center pr-3.5">
        <span
          className="text-[13px] font-medium tabular-nums"
          style={{ color: ownerTheme.textSecondary }}
        >
          {formatOwnerDateShort(booking.time)}
        </span>
      </div>
    </article>
  );
}

function IconPin({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`h-3.5 w-2.5 ${className}`}
      viewBox="0 0 15 21"
      fill="none"
      aria-hidden
    >
      <path
        d="M7.50098 0C11.6428 0 15.001 3.35885 15.001 7.5H14.999C14.999 7.78403 14.9819 8.06415 14.9512 8.33984C14.8219 9.65259 14.4303 10.5574 13.9014 11.4062C13.845 11.4984 13.7868 11.5892 13.7266 11.6787C13.4206 12.1411 13.0789 12.5985 12.7217 13.1084L7.50098 20.541L7.5 20.54V20.541L7.49902 20.5391V20.541L2.37695 13.249V13.248L1.49023 11.9854L1.48242 11.9756C0.552621 10.7259 3.62617e-05 9.17848 0 7.5C0 3.35888 3.35919 4.78439e-05 7.50098 0Z"
        fill="#4D39A8"
      />
      <circle cx="7.5" cy="7.5" r="3.5" fill="white" />
    </svg>
  );
}

function IconProfileMini({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`h-3.5 w-3 ${className}`}
      viewBox="0 0 10 12"
      fill="none"
      aria-hidden
    >
      <path
        d="M9.46645 10.7067V9.67127C9.46645 9.12203 9.23028 8.59528 8.8099 8.2069C8.38951 7.81853 7.81935 7.60034 7.22484 7.60034H2.74161C2.1471 7.60034 1.57694 7.81853 1.15655 8.2069C0.736169 8.59528 0.5 9.12203 0.5 9.67127V10.7067"
        stroke="#4D39A8"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.9838 4.93771C6.22181 4.93771 7.22541 3.9443 7.22541 2.71886C7.22541 1.49342 6.22181 0.5 4.9838 0.5C3.74579 0.5 2.74219 1.49342 2.74219 2.71886C2.74219 3.9443 3.74579 4.93771 4.9838 4.93771Z"
        stroke="#4D39A8"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AddClientModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: createStudioClient,
    onSuccess: async () => {
      await onCreated();
    },
    onError: (e) => {
      setError(e instanceof Error ? e.message : 'Failed to add client');
    },
  });

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div
        className="relative z-10 w-full max-w-md rounded-t-[20px] bg-white p-5 shadow-xl sm:rounded-[20px]"
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold" style={{ color: ownerTheme.text }}>
            Add client
          </h2>
          <button type="button" onClick={onClose} aria-label="Close">
            <X
              className="h-5 w-5"
              style={{ color: ownerTheme.textSecondary }}
            />
          </button>
        </div>
        <div className="space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="w-full rounded-[12px] bg-[#FCF3EC] px-3.5 py-3 text-sm outline-none"
            style={{ color: ownerTheme.text }}
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            type="email"
            className="w-full rounded-[12px] bg-[#FCF3EC] px-3.5 py-3 text-sm outline-none"
            style={{ color: ownerTheme.text }}
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone (optional)"
            className="w-full rounded-[12px] bg-[#FCF3EC] px-3.5 py-3 text-sm outline-none"
            style={{ color: ownerTheme.text }}
          />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            rows={3}
            className="w-full resize-none rounded-[12px] bg-[#FCF3EC] px-3.5 py-3 text-sm outline-none"
            style={{ color: ownerTheme.text }}
          />
        </div>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-[12px] bg-[#FCF3EC] py-3 text-sm font-semibold"
            style={{ color: ownerTheme.text }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={mutation.isPending || !name.trim() || !email.trim()}
            onClick={() =>
              mutation.mutate({
                name: name.trim(),
                email: email.trim(),
                phone: phone.trim() || undefined,
                notes: notes.trim() || undefined,
              })
            }
            className="flex-1 rounded-[12px] py-3 text-sm font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: ownerTheme.accent }}
          >
            {mutation.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ImportClientsModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const [rows, setRows] = useState<
    { name: string; email: string; phone?: string; notes?: string }[]
  >([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [progress, setProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const onFile = async (file: File | null) => {
    if (!file) return;
    setRunError(null);
    setFileName(file.name);
    const text = await file.text();
    const parsed = parseClientsCsv(text);
    setRows(parsed.rows);
    setParseErrors(parsed.errors);
  };

  const runImport = async () => {
    if (rows.length === 0 || importing) return;
    setImporting(true);
    setRunError(null);
    setProgress({ done: 0, total: rows.length });
    const failures: string[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!;
      try {
        await createStudioClient({
          name: row.name,
          email: row.email,
          phone: row.phone,
          notes: row.notes,
        });
      } catch (e) {
        failures.push(
          `${row.email}: ${e instanceof Error ? e.message : 'failed'}`,
        );
      }
      setProgress({ done: i + 1, total: rows.length });
    }
    setImporting(false);
    if (failures.length > 0) {
      setRunError(
        `Imported ${rows.length - failures.length}/${rows.length}. Errors:\n${failures.slice(0, 5).join('\n')}${failures.length > 5 ? `\n…+${failures.length - 5}` : ''}`,
      );
      await onDone();
      return;
    }
    await onDone();
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        disabled={importing}
      />
      <div
        className="relative z-10 w-full max-w-lg rounded-t-[20px] bg-white p-5 shadow-xl sm:rounded-[20px]"
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold" style={{ color: ownerTheme.text }}>
            Import clients
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            disabled={importing}
          >
            <X
              className="h-5 w-5"
              style={{ color: ownerTheme.textSecondary }}
            />
          </button>
        </div>

        <p className="text-sm" style={{ color: ownerTheme.textSecondary }}>
          CSV with columns{' '}
          <span className="font-medium" style={{ color: ownerTheme.text }}>
            name, email
          </span>
          , optional phone / notes.
        </p>

        <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-[14px] border border-dashed border-[#E8D5C8] bg-[#FCF3EC] px-4 py-8">
          <Upload className="h-6 w-6" style={{ color: ownerTheme.accent }} />
          <span
            className="mt-2 text-sm font-semibold"
            style={{ color: ownerTheme.text }}
          >
            {fileName || 'Choose CSV file'}
          </span>
          <input
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            disabled={importing}
            onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
          />
        </label>

        {parseErrors.length > 0 ? (
          <ul className="mt-3 space-y-1 text-sm text-red-600">
            {parseErrors.slice(0, 6).map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        ) : null}

        {rows.length > 0 ? (
          <div className="mt-3 max-h-40 overflow-y-auto rounded-[12px] bg-[#FCF3EC] px-3 py-2">
            <p
              className="mb-1.5 text-xs font-semibold uppercase tracking-wide"
              style={{ color: ownerTheme.textSecondary }}
            >
              Preview · {rows.length} rows
            </p>
            <ul className="space-y-1">
              {rows.slice(0, 8).map((r) => (
                <li
                  key={`${r.email}-${r.name}`}
                  className="truncate text-sm"
                  style={{ color: ownerTheme.text }}
                >
                  {r.name} · {r.email}
                </li>
              ))}
              {rows.length > 8 ? (
                <li
                  className="text-xs"
                  style={{ color: ownerTheme.textSecondary }}
                >
                  …and {rows.length - 8} more
                </li>
              ) : null}
            </ul>
          </div>
        ) : null}

        {progress ? (
          <p
            className="mt-3 text-sm tabular-nums"
            style={{ color: ownerTheme.textSecondary }}
          >
            Importing {progress.done}/{progress.total}…
          </p>
        ) : null}

        {runError ? (
          <pre className="mt-2 whitespace-pre-wrap text-sm text-red-600">
            {runError}
          </pre>
        ) : null}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={importing}
            className="flex-1 rounded-[12px] bg-[#FCF3EC] py-3 text-sm font-semibold disabled:opacity-50"
            style={{ color: ownerTheme.text }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={importing || rows.length === 0}
            onClick={() => void runImport()}
            className="flex-1 rounded-[12px] py-3 text-sm font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: ownerTheme.accent }}
          >
            {importing ? 'Importing…' : `Import ${rows.length || ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
