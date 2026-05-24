'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/lib/admin/use-admin-auth';
import { AdminShell } from './admin-shell';

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { loading, isAdmin, error } = useAdminAuth({ requireAdmin: true });

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace('/en/admin/login');
    }
  }, [loading, isAdmin, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <p className="text-sm text-zinc-500">Loading…</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <AdminShell>
      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}
      {children}
    </AdminShell>
  );
}
