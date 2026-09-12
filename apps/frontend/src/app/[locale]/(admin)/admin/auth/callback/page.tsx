'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { isSupabaseConfigured } from '@/lib/public-env';
import { clearAdminOauthMarker } from '@/lib/admin/oauth';

/**
 * Client-side PKCE exchange. Server route cannot read the code_verifier
 * cookie set by createBrowserClient → "both auth code and code verifier
 * should be non-empty".
 */
function AdminAuthCallbackInner() {
  const router = useRouter();
  const [message] = useState('Signing you in…');

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      // Prefer window.location — useSearchParams can lag on first paint.
      const params = new URLSearchParams(window.location.search);
      const errorDescription = params.get('error_description');
      const code = params.get('code');

      if (!code) {
        clearAdminOauthMarker();
        const q = encodeURIComponent(
          errorDescription ?? 'Google sign-in was not completed',
        );
        router.replace(`/en/admin/login?error=${q}`);
        return;
      }

      if (!isSupabaseConfigured()) {
        clearAdminOauthMarker();
        router.replace(
          '/en/admin/login?error=Supabase%20is%20not%20configured',
        );
        return;
      }

      try {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        clearAdminOauthMarker();
        if (cancelled) return;
        if (error) {
          router.replace(
            `/en/admin/login?error=${encodeURIComponent(error.message)}`,
          );
          return;
        }
        router.replace('/en/admin/mfa');
      } catch (err) {
        clearAdminOauthMarker();
        if (cancelled) return;
        const text =
          err instanceof Error
            ? err.message
            : 'Google sign-in session is invalid';
        router.replace(`/en/admin/login?error=${encodeURIComponent(text)}`);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <p className="text-sm text-zinc-500">{message}</p>
    </div>
  );
}

export default function AdminAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
          <p className="text-sm text-zinc-500">Signing you in…</p>
        </div>
      }
    >
      <AdminAuthCallbackInner />
    </Suspense>
  );
}
