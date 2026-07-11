'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import { withLocale } from '@/i18n/routing';
import { useTranslation } from '@/contexts/LanguageContext';
import { ClientAuthShell } from '@/components/auth/clientAuthShell';
import {
  requestClientRegistrationCode,
  verifyClientRegistrationCode,
} from '@/lib/auth/api';
import { supabase } from '@/lib/supabase';

type Step = 'form' | 'verify';

export function ClientRegisterPageClient() {
  const t = useTranslation();
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) ?? 'en';

  const [step, setStep] = useState<Step>('form');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onRequestCode = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password.length < 6) {
      setError(String(t('auth.passwordTooShort')));
      setLoading(false);
      return;
    }

    try {
      await requestClientRegistrationCode({
        email: email.trim(),
        password,
        name: name.trim() || undefined,
      });
      setStep('verify');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : String(t('auth.registrationFailed')),
      );
    } finally {
      setLoading(false);
    }
  };

  const onVerify = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await verifyClientRegistrationCode({
        email: email.trim(),
        code: code.trim(),
      });

      const accessToken = result.session?.access_token;
      const refreshToken = result.session?.refresh_token;
      if (accessToken && refreshToken) {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
      }

      router.replace(withLocale('/', locale as 'en' | 'ru' | 'vi'));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : String(t('auth.registrationFailed')),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ClientAuthShell>
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#3F3287]">
          {String(t('auth.signUpTitle'))}
        </h1>
        <p className="mt-2 text-sm text-[#878787] sm:text-base">
          {String(t('auth.signUpSubtitle'))}
        </p>

        {step === 'form' ? (
          <form onSubmit={onRequestCode} className="mt-8 space-y-4">
            <label className="block">
              <span className="sr-only">{String(t('auth.fullName'))}</span>
              <div className="relative">
                <User
                  className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#878787]"
                  aria-hidden
                />
                <input
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={String(t('auth.fullName'))}
                  className="w-full rounded-xl border border-[#E8E0D8] bg-white py-3 pl-11 pr-4 text-sm text-[#3F3F3F] outline-none transition placeholder:text-[#878787] focus:border-[#E86D4F]"
                />
              </div>
            </label>

            <label className="block">
              <span className="sr-only">{String(t('auth.emailAddress'))}</span>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#878787]"
                  aria-hidden
                />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={String(t('auth.loginEmailPlaceholder'))}
                  className="w-full rounded-xl border border-[#E8E0D8] bg-white py-3 pl-11 pr-4 text-sm text-[#3F3F3F] outline-none transition placeholder:text-[#878787] focus:border-[#E86D4F]"
                />
              </div>
            </label>

            <label className="block">
              <span className="sr-only">{String(t('auth.password'))}</span>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#878787]"
                  aria-hidden
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={String(t('auth.loginPasswordPlaceholder'))}
                  className="w-full rounded-xl border border-[#E8E0D8] bg-white py-3 pl-11 pr-11 text-sm text-[#3F3F3F] outline-none transition placeholder:text-[#878787] focus:border-[#E86D4F]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#878787]"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" aria-hidden />
                  ) : (
                    <Eye className="h-5 w-5" aria-hidden />
                  )}
                </button>
              </div>
            </label>

            {error ? (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#E86D4F] py-3 text-sm font-semibold text-white transition hover:bg-[#d85e42] disabled:opacity-60"
            >
              {loading
                ? String(t('auth.sending'))
                : String(t('auth.createAccount'))}
            </button>
          </form>
        ) : (
          <form onSubmit={onVerify} className="mt-8 space-y-4">
            <p className="text-sm text-[#878787]">
              {String(t('auth.verificationCodeSent'))}
            </p>
            <input
              type="text"
              inputMode="numeric"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="000000"
              className="w-full rounded-xl border border-[#E8E0D8] bg-white py-3 px-4 text-center text-lg tracking-[0.3em] text-[#3F3F3F] outline-none focus:border-[#E86D4F]"
            />

            {error ? (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#E86D4F] py-3 text-sm font-semibold text-white transition hover:bg-[#d85e42] disabled:opacity-60"
            >
              {loading
                ? String(t('auth.verifying'))
                : String(t('auth.verifyAndContinue'))}
            </button>

            <button
              type="button"
              onClick={() => setStep('form')}
              className="w-full text-sm text-[#878787] transition hover:text-[#E86D4F]"
            >
              {String(t('auth.backToSignUp'))}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-[#878787]">
          {String(t('auth.alreadyHaveAccount'))}{' '}
          <Link
            href={withLocale('/login', locale as 'en' | 'ru' | 'vi')}
            className="font-semibold text-[#E86D4F] transition hover:text-[#d85e42]"
          >
            {String(t('auth.signIn'))}
          </Link>
        </p>
      </div>
    </ClientAuthShell>
  );
}
