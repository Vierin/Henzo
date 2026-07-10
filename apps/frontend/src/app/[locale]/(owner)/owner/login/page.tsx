'use client';

import { FormEvent, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { fetchCurrentUserRole } from '@/lib/owner/api';
import { isSupabaseConfigured } from '@/lib/public-env';

export default function OwnerLoginPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) ?? 'en';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    if (!isSupabaseConfigured()) {
      setError('Supabase is not configured.');
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
      if (role !== 'OWNER') {
        await supabase.auth.signOut();
        throw new Error('This account is not a studio owner');
      }
      router.replace(`/${locale}/owner`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA] px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-2xl border border-zinc-100 bg-white p-8 shadow-sm"
      >
        <Image
          src="/logo.png"
          alt="Henzo"
          width={120}
          height={40}
          className="h-9 w-auto"
        />
        <h1 className="mt-6 text-2xl font-semibold text-[#3F3287]">
          Studio owner login
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Sign in to manage your studio
        </p>
        <label className="mt-6 block text-sm font-medium text-zinc-700">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2.5"
          />
        </label>
        <label className="mt-4 block text-sm font-medium text-zinc-700">
          Password
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2.5"
          />
        </label>
        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-full bg-[#3F3287] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="mt-4 text-center text-sm text-zinc-500">
          New studio?{' '}
          <Link
            href={`/${locale}/owner/register`}
            className="font-medium text-[#3F3287] hover:underline"
          >
            Create account
          </Link>
        </p>
      </form>
    </div>
  );
}
