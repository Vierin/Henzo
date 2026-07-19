'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAdminAuth } from '@/lib/admin/use-admin-auth';
import { extractLocaleFromPath, withLocale } from '@/i18n/routing';
import { AdminShell } from './admin-shell';

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = extractLocaleFromPath(pathname) ?? 'en';
  const { loading, isAdmin, error, signOut } = useAdminAuth({
    requireAdmin: true,
  });

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace(withLocale('/admin/login', locale));
    }
  }, [loading, isAdmin, router, locale]);

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-zinc-50">
        <p className="text-sm text-zinc-500">Loading…</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <AdminShell onSignOut={() => void signOut()}>
      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}
      {children}
    </AdminShell>
  );
}
