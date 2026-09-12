'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getPublicSupabase } from '@/lib/supabase-public';
import { isSupabaseConfigured } from '@/lib/public-env';
import { setAdminOauthMarker } from '@/lib/admin/oauth';

export default function AdminLoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const message = new URLSearchParams(window.location.search).get('error');
    if (message) setError(message);
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!isSupabaseConfigured()) {
        throw new Error('Supabase is not configured');
      }

      // Clear owner/client localStorage JWT only. Do NOT signOut the admin
      // cookie client here — it races with PKCE code_verifier cookie write.
      try {
        await getPublicSupabase().auth.signOut({ scope: 'local' });
      } catch {
        // public client may be misconfigured in some envs
      }

      // Marker so middleware can route Site-URL /?code= back to admin callback.
      setAdminOauthMarker();

      const redirectTo = `${window.location.origin}/en/admin/auth/callback`;
      const { data, error: signError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
          queryParams: {
            prompt: 'select_account',
          },
        },
      });
      if (signError) throw signError;
      if (!data.url) throw new Error('Google sign-in URL missing');

      // Let the browser flush the PKCE code_verifier cookie before leaving.
      await new Promise((r) => setTimeout(r, 50));
      window.location.assign(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-primary">Henzo Admin</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Restricted access for approved administrators
        </p>
        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        <button
          type="button"
          onClick={() => void signInWithGoogle()}
          disabled={loading}
          className="mt-6 flex w-full items-center justify-center gap-3 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
        >
          <span aria-hidden="true" className="text-base font-semibold">
            G
          </span>
          {loading ? 'Redirecting…' : 'Continue with Google'}
        </button>
        <p className="mt-4 text-xs leading-5 text-zinc-500">
          Your Google account must be on the server allowlist and have the ADMIN
          role. Password sessions are rejected.
        </p>
      </div>
    </div>
  );
}
