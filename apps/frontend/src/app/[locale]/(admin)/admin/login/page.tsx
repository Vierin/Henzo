'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { isSupabaseConfigured } from '@/lib/public-env';

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

      // Remove a possible owner/client/password session before starting the
      // privileged Google OAuth flow.
      await supabase.auth.signOut({ scope: 'local' });

      // Prefer the current origin so PKCE cookies stay on the same host
      // (henzo.app vs www.henzo.app). Both must be in Supabase Redirect URLs.
      const redirectTo = `${window.location.origin}/en/admin/auth/callback`;
      const { error: signError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            prompt: 'select_account',
          },
        },
      });
      if (signError) throw signError;
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
