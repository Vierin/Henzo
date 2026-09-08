'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { withLocale } from '@/i18n/routing';
import { useTranslation } from '@/contexts/LanguageContext';
import { ClientAuthShell } from '@/components/auth/clientAuthShell';
import {
  AuthFieldIcon,
  AuthFormField,
  authPrimaryButtonClassName,
  authSocialButtonClassName,
} from '@/components/auth/authFormField';
import { AppleLogo, GoogleLogo } from '@/components/auth/authSocialIcons';
import { fetchCurrentUserRole } from '@/lib/auth/api';
import { getPublicSupabase } from '@/lib/supabase-public';
import { isSupabaseConfigured } from '@/lib/public-env';
import {
  startBusinessGoogleOAuth,
  startClientGoogleOAuth,
} from '@/utils/oauth';

export function ClientLoginPageClient() {
  const t = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const locale = (params?.locale as string) ?? 'en';
  const isBusinessIntent = searchParams.get('intent') === 'business';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  useEffect(() => {
    const oauthError = searchParams.get('error');
    if (!oauthError) return;

    if (oauthError === 'role') {
      void (async () => {
        const session = (await getPublicSupabase().auth.getSession()).data
          .session;
        if (session) {
          const role = await fetchCurrentUserRole({ syncIfMissing: true });
          if (role === 'OWNER') {
            const { setOwnerAuthCookie } = await import(
              '@/lib/owner/auth-session-cookie'
            );
            const { clearClientAuthCookie } = await import(
              '@/lib/client-panel/auth-session-cookie'
            );
            clearClientAuthCookie();
            setOwnerAuthCookie();
            router.replace(
              withLocale('/owner-dashboard', locale as 'en' | 'ru' | 'vi'),
            );
            return;
          }
        }
        setError(String(t('auth.ownerUseStudioLogin')));
        router.replace(
          withLocale('/login?intent=business', locale as 'en' | 'ru' | 'vi'),
          { scroll: false },
        );
      })();
      return;
    }

    const message = searchParams.get('message');
    if (oauthError === 'account') {
      setError(String(t('auth.signInFailed')));
    } else {
      setError(
        message?.trim() ||
          decodeURIComponent(oauthError) ||
          (oauthError === 'oauth'
            ? String(t('auth.googleSignInFailed'))
            : String(t('auth.signInFailed'))),
      );
    }

    const clean = isBusinessIntent
      ? withLocale('/login?intent=business', locale as 'en' | 'ru' | 'vi')
      : withLocale('/login', locale as 'en' | 'ru' | 'vi');
    router.replace(clean, { scroll: false });
  }, [isBusinessIntent, locale, router, searchParams, t]);

  const redirectClientPanel = async () => {
    const { setClientAuthCookie } = await import(
      '@/lib/client-panel/auth-session-cookie'
    );
    const { clearOwnerAuthCookie } = await import(
      '@/lib/owner/auth-session-cookie'
    );
    clearOwnerAuthCookie();
    setClientAuthCookie();
    router.replace(withLocale('/activity', locale as 'en' | 'ru' | 'vi'));
  };

  const redirectOwnerPanel = async () => {
    const { setOwnerAuthCookie } = await import(
      '@/lib/owner/auth-session-cookie'
    );
    const { clearClientAuthCookie } = await import(
      '@/lib/client-panel/auth-session-cookie'
    );
    clearClientAuthCookie();
    setOwnerAuthCookie();
    router.replace(
      withLocale('/owner-dashboard', locale as 'en' | 'ru' | 'vi'),
    );
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
      const { error: signError } =
        await getPublicSupabase().auth.signInWithPassword({
          email: email.trim(),
          password,
        });
      if (signError) throw signError;

      const role = await fetchCurrentUserRole();
      if (role === 'OWNER') {
        await redirectOwnerPanel();
        return;
      }
      if (role && role !== 'CLIENT') {
        await getPublicSupabase().auth.signOut({ scope: 'local' });
        throw new Error(String(t('auth.signInFailed')));
      }

      await redirectClientPanel();
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

    if (isBusinessIntent && provider === 'google') {
      const { error: oauthError } = await startBusinessGoogleOAuth({
        source: 'business_login',
      });
      if (oauthError) {
        setError(String(t('auth.googleSignInFailed')));
        setOauthLoading(null);
      }
      return;
    }

    const { error: oauthError } = await startClientGoogleOAuth({
      provider,
      next: withLocale('/activity', locale as 'en' | 'ru' | 'vi'),
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
          {isBusinessIntent
            ? String(t('auth.businessLoginTitle') || 'Business sign in')
            : String(t('auth.clientLoginTitle'))}
        </h1>
        <p className="mt-2 text-sm text-[#878787] sm:text-base">
          {isBusinessIntent
            ? String(
                t('auth.businessLoginSubtitle') ||
                  'Sign in to manage your studio on the web.',
              )
            : String(t('auth.clientLoginSubtitle'))}
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
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
              autoComplete="current-password"
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
            className={authPrimaryButtonClassName}
          >
            {loading ? String(t('auth.signingIn')) : String(t('auth.signIn'))}
          </button>
        </form>

        {!isBusinessIntent ? (
          <p className="mt-6 text-center text-sm text-[#878787]">
            {String(t('auth.noAccountRegister'))}{' '}
            <Link
              href={withLocale('/register', locale as 'en' | 'ru' | 'vi')}
              className="font-semibold text-[#E86D4F] transition hover:text-[#d85e42]"
            >
              {String(t('auth.registerLink'))}
            </Link>
          </p>
        ) : null}

        <p className="mt-3 text-center text-sm text-[#878787]">
          {isBusinessIntent ? (
            <>
              {String(
                t('auth.lookingForClientLogin') || 'Looking for client login?',
              )}{' '}
              <Link
                href={withLocale('/login', locale as 'en' | 'ru' | 'vi')}
                className="font-semibold text-[#3F3287] transition hover:text-[#E86D4F]"
              >
                {String(t('auth.clientLoginLink') || 'Client sign in →')}
              </Link>
            </>
          ) : (
            <>
              {String(t('auth.areYouSalonOwner'))}{' '}
              <Link
                href={withLocale(
                  '/login?intent=business',
                  locale as 'en' | 'ru' | 'vi',
                )}
                className="font-semibold text-[#3F3287] transition hover:text-[#E86D4F]"
              >
                {String(t('auth.registerBusinessAccount'))}
              </Link>
            </>
          )}
        </p>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#E8E0D8]" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-[#FEFDF9] px-3 text-sm text-[#878787]">
              {String(t('auth.orDivider'))}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            disabled={loading || oauthLoading != null}
            onClick={() => onOAuth('google')}
            className={authSocialButtonClassName}
          >
            <GoogleLogo className="h-5 w-5" />
            {String(t('auth.continueWithGoogle'))}
          </button>

          {!isBusinessIntent ? (
            <button
              type="button"
              disabled={loading || oauthLoading != null}
              onClick={() => onOAuth('apple')}
              className={authSocialButtonClassName}
            >
              <AppleLogo className="h-5 w-5" />
              {String(t('auth.continueWithApple'))}
            </button>
          ) : null}
        </div>
      </div>
    </ClientAuthShell>
  );
}
