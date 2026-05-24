'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { fetchCurrentUserRole } from '@/lib/admin/api';
import { isSupabaseConfigured, publicEnv } from '@/lib/public-env';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    if (!isSupabaseConfigured()) {
      setError(
        'Supabase env not loaded in the browser bundle. ' +
          'Stop dev server, delete apps/frontend/.henzo-next-dev-cache, ' +
          'run pnpm dev again.',
      );
      setLoading(false);
      return;
    }
    try {
      const { error: signError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signError) throw signError;
      const role = await fetchCurrentUserRole();
      if (role !== 'ADMIN') {
        await supabase.auth.signOut();
        throw new Error('This account is not an admin');
      }
      router.replace('/en/admin');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      if (msg === 'Failed to fetch') {
        setError(
          `Network error (${publicEnv.supabaseUrl || 'no Supabase URL'}). ` +
            'VPN/firewall may block supabase.co, or dev cache is stale — ' +
            'delete .henzo-next-dev-cache and restart pnpm dev.',
        );
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm"
      >
        <h1 className="text-2xl font-semibold text-[#3F3287]">Henzo Admin</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Sign in with your admin account
        </p>
        {process.env.NODE_ENV === 'development' && !isSupabaseConfigured() ? (
          <p className="mt-2 text-xs text-amber-700">
            Dev: NEXT_PUBLIC_SUPABASE_* not in bundle — restart after .env
            change and clear .henzo-next-dev-cache
          </p>
        ) : null}
        <label className="mt-6 block text-sm font-medium text-zinc-700">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2"
          />
        </label>
        <label className="mt-4 block text-sm font-medium text-zinc-700">
          Password
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2"
          />
        </label>
        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-lg bg-[#3F3287] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
