'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type MfaMode = 'loading' | 'enroll' | 'challenge';

export default function AdminMfaPage() {
  const router = useRouter();
  const [mode, setMode] = useState<MfaMode>('loading');
  const [factorId, setFactorId] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const prepare = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          router.replace('/en/admin/login');
          return;
        }

        const assurance =
          await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (assurance.error) throw assurance.error;
        if (assurance.data.currentLevel === 'aal2') {
          router.replace('/en/admin');
          return;
        }

        const factors = await supabase.auth.mfa.listFactors();
        if (factors.error) throw factors.error;

        const verifiedFactor = factors.data.totp.find(
          (factor) => factor.status === 'verified',
        );
        if (verifiedFactor) {
          setFactorId(verifiedFactor.id);
          setMode('challenge');
          return;
        }

        for (const factor of factors.data.totp) {
          if (factor.status === 'unverified') {
            const removal = await supabase.auth.mfa.unenroll({
              factorId: factor.id,
            });
            if (removal.error) throw removal.error;
          }
        }

        const enrollment = await supabase.auth.mfa.enroll({
          factorType: 'totp',
          friendlyName: 'Henzo Admin',
        });
        if (enrollment.error) throw enrollment.error;

        setFactorId(enrollment.data.id);
        setQrCode(enrollment.data.totp.qr_code);
        setSecret(enrollment.data.totp.secret);
        setMode('enroll');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to prepare 2FA');
      }
    };

    void prepare();
  }, [router]);

  const verify = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code');
      return;
    }

    setIsSubmitting(true);
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error) throw challenge.error;

      const result = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code,
      });
      if (result.error) throw result.error;

      router.replace('/en/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code');
      setCode('');
      setIsSubmitting(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace('/en/admin/login');
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <section className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-[#3F3287]">
          Two-factor authentication
        </h1>

        {mode === 'loading' && !error ? (
          <p className="mt-4 text-sm text-zinc-500">
            Preparing secure sign-in…
          </p>
        ) : null}

        {mode === 'enroll' ? (
          <>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Scan this QR code with an authenticator app, then enter its
              6-digit code. Keep the account in your authenticator; it is
              required for every new admin login.
            </p>
            {qrCode ? (
              // The QR code is a data URL generated and signed by Supabase.
              <img
                src={qrCode}
                alt="Authenticator setup QR code"
                className="mx-auto mt-5 size-52"
              />
            ) : null}
            {secret ? (
              <details className="mt-3 text-xs text-zinc-500">
                <summary>Cannot scan? Enter setup key</summary>
                <code className="mt-2 block break-all rounded bg-zinc-100 p-2 text-zinc-800">
                  {secret}
                </code>
              </details>
            ) : null}
          </>
        ) : null}

        {mode === 'challenge' ? (
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Enter the current code from your authenticator app.
          </p>
        ) : null}

        {mode !== 'loading' ? (
          <form onSubmit={verify}>
            <label className="mt-5 block text-sm font-medium text-zinc-700">
              Authentication code
              <input
                type="text"
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                }
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                autoFocus
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-center font-mono text-xl tracking-[0.4em]"
              />
            </label>
            <button
              type="submit"
              disabled={isSubmitting || code.length !== 6}
              className="mt-5 w-full rounded-lg bg-[#3F3287] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
            >
              {isSubmitting ? 'Verifying…' : 'Verify and continue'}
            </button>
          </form>
        ) : null}

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-4 w-full text-sm text-zinc-500 hover:text-zinc-800"
        >
          Sign out
        </button>
      </section>
    </main>
  );
}
