'use client';

import { Suspense, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { GoogleLogo } from '@/components/auth/authSocialIcons';
import { startBusinessGoogleOAuth } from '@/utils/oauth';
import { isSupabaseConfigured } from '@/lib/public-env';
import { getPublicSupabase } from '@/lib/supabase-public';
import { fetchCurrentUserRole } from '@/lib/auth/api';
import { setOwnerAuthCookie } from '@/lib/owner/auth-session-cookie';
import { extractLocaleFromPath, withLocale, type Locale } from '@/i18n/routing';
import Link from 'next/link';

function GoogleBusinessButton({
  loading,
  onClick,
  error,
}: {
  loading: boolean;
  onClick: () => void;
  error: string | null;
}) {
  return (
    <div className="mt-4 w-full space-y-3">
      {error ? (
        <p className="text-center text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50 disabled:opacity-60"
      >
        <GoogleLogo className="h-5 w-5" />
        {loading ? 'Redirecting…' : 'Continue with Google'}
      </button>
    </div>
  );
}

function BusinessLoginInner() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const locale = (extractLocaleFromPath(pathname) ?? 'en') as Locale;
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const fromUrl = searchParams.get('error');
    if (fromUrl) setError(fromUrl);
  }, [searchParams]);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        if (!isSupabaseConfigured()) {
          setChecking(false);
          return;
        }
        const session = (await getPublicSupabase().auth.getSession()).data
          .session;
        if (!session) {
          if (alive) setChecking(false);
          return;
        }
        const role = await fetchCurrentUserRole({ syncIfMissing: true });
        if (!alive) return;
        if (role === 'OWNER') {
          setOwnerAuthCookie();
          router.replace(withLocale('/owner-dashboard', locale));
          return;
        }
        setChecking(false);
      } catch {
        if (alive) setChecking(false);
      }
    };
    void run();
    return () => {
      alive = false;
    };
  }, [locale, router]);

  const onGoogle = async () => {
    if (!isSupabaseConfigured()) {
      setError('Supabase is not configured.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error: oauthError } = await startBusinessGoogleOAuth({
        source: 'business_login',
      });
      if (oauthError) throw oauthError;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed');
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fff7f6]">
        <p className="text-sm text-gray-500">Checking session…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fff7f6] px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">
          Business sign in
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Sign in with Google to open your studio panel on the web.
        </p>
        <GoogleBusinessButton
          loading={loading}
          error={error}
          onClick={() => void onGoogle()}
        />
        <p className="mt-6 text-center text-xs text-gray-400">
          <Link
            href={withLocale('/business', locale)}
            className="hover:text-[#ea4b4b]"
          >
            ← Back to business
          </Link>
        </p>
      </div>
    </div>
  );
}

export function BusinessLoginLanding() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          Loading…
        </div>
      }
    >
      <BusinessLoginInner />
    </Suspense>
  );
}

export function BusinessRegisterLanding() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          Loading…
        </div>
      }
    >
      <BusinessLoginInner />
    </Suspense>
  );
}
