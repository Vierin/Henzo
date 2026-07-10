'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { extractLocaleFromPath } from '@/i18n/routing';
import { useOwnerAuth } from '@/lib/owner/use-owner-auth';
import { OwnerShell } from './owner-shell';

export function OwnerGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { loading, isOwner, error } = useOwnerAuth({ requireOwner: true });

  useEffect(() => {
    if (!loading && !isOwner) {
      const locale =
        typeof window !== 'undefined'
          ? (extractLocaleFromPath(window.location.pathname) ?? 'en')
          : 'en';
      router.replace(`/${locale}/owner/login`);
    }
  }, [loading, isOwner, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA]">
        <p className="text-sm text-zinc-500">Loading…</p>
      </div>
    );
  }

  if (!isOwner) return null;

  return (
    <OwnerShell>
      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}
      {children}
    </OwnerShell>
  );
}
