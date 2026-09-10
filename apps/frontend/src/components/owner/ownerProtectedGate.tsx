'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  extractLocaleFromPath,
  stripLocaleFromPath,
  withLocale,
  type Locale,
} from '@/i18n/routing';
import { getPublicSupabase } from '@/lib/supabase-public';
import { fetchCurrentUserRole } from '@/lib/auth/api';
import {
  clearOwnerAuthCookie,
  setOwnerAuthCookie,
} from '@/lib/owner/auth-session-cookie';
import { fetchCurrentStudio } from '@/lib/owner/fetch-current-studio';
import LoadingFallback from '@/components/LoadingFallback';

export default function OwnerProtectedGate({
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
      const pathNoLocale = stripLocaleFromPath(pathname);
      const isSetup = pathNoLocale.startsWith('/business/complete-setup');

      try {
        if (!authedRef.current) {
          setReady(false);
        }

        const session = (await getPublicSupabase().auth.getSession()).data
          .session;
        if (!session) {
          clearOwnerAuthCookie();
          authedRef.current = false;
          router.replace(withLocale('/login?intent=business', locale));
          return;
        }

        const role = await fetchCurrentUserRole({ syncIfMissing: true });
        if (!alive) return;

        if (role !== 'OWNER') {
          clearOwnerAuthCookie();
          authedRef.current = false;
          await getPublicSupabase().auth.signOut({ scope: 'local' });
          router.replace(
            withLocale(
              `/login?intent=business&error=${encodeURIComponent('Owner account required')}`,
              locale,
            ),
          );
          return;
        }

        setOwnerAuthCookie();
        authedRef.current = true;

        const { needsSetup } = await fetchCurrentStudio();
        if (!alive) return;

        if (needsSetup && !isSetup) {
          router.replace(withLocale('/business/complete-setup', locale));
          return;
        }
        if (!needsSetup && isSetup) {
          router.replace(withLocale('/owner-dashboard', locale));
          return;
        }

        setError(null);
        setReady(true);
      } catch (err) {
        if (!alive) return;
        setError(err instanceof Error ? err.message : 'Auth failed');
        clearOwnerAuthCookie();
        authedRef.current = false;
        router.replace(withLocale('/login?intent=business', locale));
      }
    };

    void run();
    return () => {
      alive = false;
    };
  }, [pathname, router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FCF3EC] p-6">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!ready) {
    return <LoadingFallback message="Loading…" fullScreen />;
  }

  return <>{children}</>;
}
