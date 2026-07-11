'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { withLocale } from '@/i18n/routing';
import { useTranslation } from '@/contexts/LanguageContext';
import { ClientAuthShell } from '@/components/auth/clientAuthShell';
import { AppleLogo, GoogleLogo } from '@/components/auth/authSocialIcons';
import { fetchCurrentUserRole } from '@/lib/auth/api';
import { supabase } from '@/lib/supabase';
import { isSupabaseConfigured, publicEnv } from '@/lib/public-env';

export function ClientLoginPageClient() {
  const t = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const locale = (params?.locale as string) ?? 'en';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  useEffect(() => {
    const oauthError = searchParams.get('error');
    if (!oauthError) return;

    if (oauthError === 'role') {
      setError(String(t('auth.ownerUseStudioLogin')));
    } else if (oauthError === 'account') {
      setError(String(t('auth.signInFailed')));
    } else {
      const message = searchParams.get('message');
      setError(
        message?.trim() ||
          (oauthError === 'oauth'
            ? String(t('auth.googleSignInFailed'))
            : String(t('auth.signInFailed'))),
      );
    }

    router.replace(withLocale('/login', locale as 'en' | 'ru' | 'vi'), {
      scroll: false,
    });
  }, [locale, router, searchParams, t]);

  const redirectHome = () => {
    router.replace(withLocale('/', locale as 'en' | 'ru' | 'vi'));
  };

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
      if (role && role !== 'CLIENT') {
        await supabase.auth.signOut();
        throw new Error(
          role === 'OWNER'
            ? String(t('auth.ownerUseStudioLogin'))
            : String(t('auth.signInFailed')),
        );
      }

      redirectHome();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : String(t('auth.signInFailed')),
      );
    } finally {
      setLoading(false);
    }
  };

  const onOAuth = async (provider: 'google' | 'apple') => {
    if (!isSupabaseConfigured()) {
      setError('Supabase is not configured.');
      return;
    }

    setOauthLoading(provider);
    setError(null);

    const redirectTo = `${publicEnv.frontendUrl}/auth/callback?next=${encodeURIComponent(withLocale('/', locale as 'en' | 'ru' | 'vi'))}`;

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });

    if (oauthError) {
      setError(
        provider === 'google'
          ? String(t('auth.googleSignInFailed'))
          : String(t('auth.appleSignInFailed')),
      );
      setOauthLoading(null);
    }
  };

  return (
    <ClientAuthShell>
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#3F3287]">
          {String(t('auth.clientLoginTitle'))}
        </h1>
        <p className="mt-2 text-sm text-[#878787] sm:text-base">
          {String(t('auth.clientLoginSubtitle'))}
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
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
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={String(t('auth.loginPasswordPlaceholder'))}
                className="w-full rounded-xl border border-[#E8E0D8] bg-white py-3 pl-11 pr-11 text-sm text-[#3F3F3F] outline-none transition placeholder:text-[#878787] focus:border-[#E86D4F]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#878787] transition hover:text-[#3F3F3F]"
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

          <div className="flex justify-end">
            <Link
              href={withLocale(
                '/forgot-password',
                locale as 'en' | 'ru' | 'vi',
              )}
              className="text-sm font-medium text-[#E86D4F] transition hover:text-[#d85e42]"
            >
              {String(t('auth.forgotPassword'))}
            </Link>
          </div>

          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading || oauthLoading != null}
            className="w-full rounded-xl bg-[#E86D4F] py-3 text-sm font-semibold text-white transition hover:bg-[#d85e42] disabled:opacity-60"
          >
            {loading ? String(t('auth.signingIn')) : String(t('auth.signIn'))}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#878787]">
          {String(t('auth.noAccountRegister'))}{' '}
          <Link
            href={withLocale('/register', locale as 'en' | 'ru' | 'vi')}
            className="font-semibold text-[#E86D4F] transition hover:text-[#d85e42]"
          >
            {String(t('auth.registerLink'))}
          </Link>
        </p>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#E8E0D8]" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-[#FDF5F0] px-3 text-sm text-[#878787]">
              {String(t('auth.orDivider'))}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            disabled={loading || oauthLoading != null}
            onClick={() => onOAuth('google')}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#E8E0D8] bg-white py-3 text-sm font-medium text-[#3F3F3F] transition hover:border-[#E86D4F]/30 disabled:opacity-60"
          >
            <GoogleLogo className="h-5 w-5" />
            {String(t('auth.continueWithGoogle'))}
          </button>

          <button
            type="button"
            disabled={loading || oauthLoading != null}
            onClick={() => onOAuth('apple')}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#E8E0D8] bg-white py-3 text-sm font-medium text-[#3F3F3F] transition hover:border-[#E86D4F]/30 disabled:opacity-60"
          >
            <AppleLogo className="h-5 w-5" />
            {String(t('auth.continueWithApple'))}
          </button>
        </div>
      </div>
    </ClientAuthShell>
  );
}
