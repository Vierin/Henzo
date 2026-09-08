'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { withLocale } from '@/i18n/routing';
import { useTranslation } from '@/contexts/LanguageContext';
import { ClientAuthShell } from '@/components/auth/clientAuthShell';
import {
  AuthFieldIcon,
  AuthFormField,
  authFieldClassName,
  authPrimaryButtonClassName,
} from '@/components/auth/authFormField';
import {
  requestClientRegistrationCode,
  verifyClientRegistrationCode,
} from '@/lib/auth/api';
import { getPublicSupabase } from '@/lib/supabase-public';

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
        await getPublicSupabase().auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
      }

      const { setClientAuthCookie } = await import(
        '@/lib/client-panel/auth-session-cookie'
      );
      const { clearOwnerAuthCookie } = await import(
        '@/lib/owner/auth-session-cookie'
      );
      clearOwnerAuthCookie();
      setClientAuthCookie();
      router.replace(withLocale('/activity', locale as 'en' | 'ru' | 'vi'));
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
              <AuthFormField
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={String(t('auth.fullName'))}
                icon={
                  <AuthFieldIcon
                    src="/images/icons/icon-profile.svg"
                    width={16}
                    height={16}
                  />
                }
              />
            </label>

            <label className="block">
              <span className="sr-only">{String(t('auth.emailAddress'))}</span>
              <AuthFormField
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={String(t('auth.loginEmailPlaceholder'))}
                icon={
                  <AuthFieldIcon
                    src="/images/icons/icon-mail.svg"
                    width={14}
                    height={14}
                  />
                }
              />
            </label>

            <label className="block">
              <span className="sr-only">{String(t('auth.password'))}</span>
              <AuthFormField
                type="password"
                passwordToggle
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={String(t('auth.loginPasswordPlaceholder'))}
                icon={
                  <AuthFieldIcon
                    src="/images/icons/icon-password.svg"
                    width={16}
                    height={16}
                  />
                }
              />
            </label>

            {error ? (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className={authPrimaryButtonClassName}
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
              className={`${authFieldClassName} px-4 text-center text-lg tracking-[0.3em]`}
            />

            {error ? (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className={authPrimaryButtonClassName}
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
