'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LogOut, Pencil } from 'lucide-react';
import ClientPanelShell from '@/components/clientPanel/clientPanelShell';
import {
  fetchClientProfileStats,
  fetchClientUser,
  updateClientProfile,
} from '@/lib/client-panel/fetch-profile';
import { clearClientAuthCookie } from '@/lib/client-panel/auth-session-cookie';
import { getPublicSupabase } from '@/lib/supabase-public';
import { extractLocaleFromPath, withLocale, type Locale } from '@/i18n/routing';

export default function ClientProfilePage() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = (extractLocaleFromPath(pathname) ?? 'en') as Locale;
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const userQuery = useQuery({
    queryKey: ['client-user'],
    queryFn: fetchClientUser,
  });

  const statsQuery = useQuery({
    queryKey: ['client-profile-stats'],
    queryFn: fetchClientProfileStats,
  });

  useEffect(() => {
    if (!userQuery.data) return;
    setName(userQuery.data.name?.trim() || '');
    setPhone(userQuery.data.phone?.trim() || '');
  }, [userQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      updateClientProfile({
        name: name.trim() || undefined,
        phone: phone.trim() || undefined,
      }),
    onSuccess: async () => {
      setEditing(false);
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: ['client-user'] });
    },
    onError: (err) => {
      setFormError(err instanceof Error ? err.message : 'Update failed');
    },
  });

  const onSave = (e: FormEvent) => {
    e.preventDefault();
    saveMutation.mutate();
  };

  const onLogout = async () => {
    clearClientAuthCookie();
    await getPublicSupabase().auth.signOut({ scope: 'local' });
    router.replace(withLocale('/login', locale));
  };

  const user = userQuery.data;
  const stats = statsQuery.data;

  return (
    <ClientPanelShell title="Profile">
      {userQuery.isLoading ? (
        <p className="text-sm text-[#878787]">Loading…</p>
      ) : userQuery.isError || !user ? (
        <p className="text-sm text-red-600">Failed to load profile</p>
      ) : (
        <div className="space-y-4">
          <section className="rounded-[14px] bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-lg font-bold">
                  {user.name?.trim() || 'Client'}
                </p>
                <p className="mt-0.5 truncate text-sm text-[#878787]">
                  {user.email}
                </p>
                {user.phone ? (
                  <p className="mt-0.5 text-sm text-[#878787]">{user.phone}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditing((v) => !v);
                  setFormError(null);
                }}
                className="inline-flex items-center gap-1 rounded-full border border-[#E8E0D8] px-3 py-1.5 text-xs font-semibold text-[#3F3F3F]"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden />
                {editing ? 'Close' : 'Edit'}
              </button>
            </div>

            {editing ? (
              <form onSubmit={onSave} className="mt-4 space-y-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-[#878787]">
                    Name
                  </span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-[#E8E0D8] px-3 py-2.5 text-sm outline-none focus:border-[#E86D4F]"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-[#878787]">
                    Phone
                  </span>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl border border-[#E8E0D8] px-3 py-2.5 text-sm outline-none focus:border-[#E86D4F]"
                  />
                </label>
                {formError ? (
                  <p className="text-sm text-red-600" role="alert">
                    {formError}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="w-full rounded-xl bg-[#E86D4F] py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {saveMutation.isPending ? 'Saving…' : 'Save'}
                </button>
              </form>
            ) : null}
          </section>

          <section className="grid grid-cols-2 gap-3">
            {[
              {
                label: 'Classes visited',
                value: stats?.classesVisited ?? '—',
              },
              {
                label: 'Hours trained',
                value: stats?.hoursTrained ?? '—',
              },
              {
                label: 'Upcoming',
                value: stats?.upcomingClasses ?? '—',
              },
              {
                label: 'Active passes',
                value: stats?.activePasses ?? '—',
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-[14px] bg-white px-4 py-3"
              >
                <p className="text-xs text-[#878787]">{item.label}</p>
                <p className="mt-1 text-xl font-bold tabular-nums">
                  {item.value}
                </p>
              </div>
            ))}
          </section>

          <nav className="overflow-hidden rounded-[14px] bg-white">
            <Link
              href={withLocale('/activity', locale)}
              className="block border-b border-[#F2EDE8] px-4 py-3.5 text-sm font-medium hover:bg-[#F9F4F0]"
            >
              My activity
            </Link>
            <Link
              href={withLocale('/favorites', locale)}
              className="block border-b border-[#F2EDE8] px-4 py-3.5 text-sm font-medium hover:bg-[#F9F4F0]"
            >
              Favorites
            </Link>
            <Link
              href={withLocale('/studios', locale)}
              className="block px-4 py-3.5 text-sm font-medium hover:bg-[#F9F4F0]"
            >
              Browse studios
            </Link>
          </nav>

          <button
            type="button"
            onClick={() => void onLogout()}
            className="flex w-full items-center justify-center gap-2 rounded-[14px] border border-[#E8E0D8] bg-white py-3 text-sm font-semibold text-[#E86D4F]"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Sign out
          </button>
        </div>
      )}
    </ClientPanelShell>
  );
}
