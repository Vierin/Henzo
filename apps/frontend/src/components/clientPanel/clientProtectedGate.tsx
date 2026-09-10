'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { extractLocaleFromPath, withLocale, type Locale } from '@/i18n/routing';
import { getPublicSupabase } from '@/lib/supabase-public';
import { fetchCurrentUserRole } from '@/lib/auth/api';
import {
  clearClientAuthCookie,
  setClientAuthCookie,
} from '@/lib/client-panel/auth-session-cookie';
import LoadingFallback from '@/components/LoadingFallback';

export default function ClientProtectedGate({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const authedRef = useRef(false);

  useEffect(() => {
    let alive = true;

    const run = async () => {
      const locale = (extractLocaleFromPath(pathname) ?? 'en') as Locale;

      try {
        if (!authedRef.current) setReady(false);

        const session = (await getPublicSupabase().auth.getSession()).data
          .session;
        if (!session) {
          clearClientAuthCookie();
          authedRef.current = false;
          router.replace(withLocale('/login', locale));
          return;
        }

        const role = await fetchCurrentUserRole({ syncIfMissing: true });
        if (!alive) return;

        if (role === 'OWNER') {
          clearClientAuthCookie();
          const { setOwnerAuthCookie } = await import(
            '@/lib/owner/auth-session-cookie'
          );
          setOwnerAuthCookie();
          router.replace(withLocale('/owner-dashboard', locale));
          return;
        }

        if (role !== 'CLIENT') {
          clearClientAuthCookie();
          authedRef.current = false;
          await getPublicSupabase().auth.signOut({ scope: 'local' });
          router.replace(withLocale('/login', locale));
          return;
        }

        const { clearOwnerAuthCookie } = await import(
          '@/lib/owner/auth-session-cookie'
        );
        clearOwnerAuthCookie();
        setClientAuthCookie();
        authedRef.current = true;
        setError(null);
        setReady(true);
      } catch (err) {
        if (!alive) return;
        setError(err instanceof Error ? err.message : 'Auth failed');
        clearClientAuthCookie();
        authedRef.current = false;
        router.replace(withLocale('/login', locale));
      }
    };

    void run();
    return () => {
      alive = false;
    };
  }, [pathname, router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F9F4F0] p-6">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!ready) {
    return <LoadingFallback message="Loading…" fullScreen />;
  }

  return <>{children}</>;
}
