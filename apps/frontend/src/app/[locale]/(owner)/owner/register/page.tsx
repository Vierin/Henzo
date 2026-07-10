'use client';

import { FormEvent, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import {
  requestOwnerRegistrationCode,
  verifyOwnerRegistrationCode,
} from '@/lib/owner/api';
import { adoptBackendSession } from '@/lib/owner/photo-storage';

type Step = 'form' | 'code';

export default function OwnerRegisterPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) ?? 'en';
  const [step, setStep] = useState<Step>('form');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const requestCode = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await requestOwnerRegistrationCode({
        email: email.trim(),
        password,
        name: name.trim() || undefined,
      });
      setStep('code');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      if (msg.includes('ACCOUNT_EXISTS')) {
        setError('Account already exists. Please sign in.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await verifyOwnerRegistrationCode({
        email: email.trim(),
        code: code.trim(),
      });
      await adoptBackendSession(result.session);
      router.replace(`/${locale}/owner`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA] px-4">
      <form
        onSubmit={step === 'form' ? requestCode : verifyCode}
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
          {step === 'form' ? 'Create studio account' : 'Verify your email'}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          {step === 'form'
            ? 'Register as a studio owner on Henzo'
            : `Enter the code sent to ${email}`}
        </p>

        {step === 'form' ? (
          <>
            <label className="mt-6 block text-sm font-medium text-zinc-700">
              Your name
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2.5"
              />
            </label>
            <label className="mt-4 block text-sm font-medium text-zinc-700">
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
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2.5"
              />
            </label>
          </>
        ) : (
          <label className="mt-6 block text-sm font-medium text-zinc-700">
            Verification code
            <input
              type="text"
              required
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2.5 tracking-widest"
            />
          </label>
        )}

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-full bg-[#3F3287] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {loading
            ? 'Please wait…'
            : step === 'form'
              ? 'Send verification code'
              : 'Create account'}
        </button>

        <p className="mt-4 text-center text-sm text-zinc-500">
          Already have an account?{' '}
          <Link
            href={`/${locale}/owner/login`}
            className="font-medium text-[#3F3287] hover:underline"
          >
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
