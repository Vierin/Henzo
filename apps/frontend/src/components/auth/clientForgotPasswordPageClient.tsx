'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { withLocale } from '@/i18n/routing';
import { useTranslation } from '@/contexts/LanguageContext';
import { ClientAuthShell } from '@/components/auth/clientAuthShell';
import {
  AuthFieldIcon,
  AuthFormField,
  authPrimaryButtonClassName,
} from '@/components/auth/authFormField';
import { getPublicSupabase } from '@/lib/supabase-public';
import { isSupabaseConfigured } from '@/lib/public-env';

export function ClientForgotPasswordPageClient() {
  const t = useTranslation();
  const params = useParams();
  const locale = (params?.locale as string) ?? 'en';

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
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
      const origin = window.location.origin;
      const { error: resetError } =
        await getPublicSupabase().auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${origin}/${locale}/login`,
        });
      if (resetError) throw resetError;
      setSent(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : String(t('auth.failedToSendResetEmail')),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ClientAuthShell>
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#3F3287]">
          {String(t('auth.forgotPasswordTitle'))}
        </h1>
        <p className="mt-2 text-sm text-[#878787] sm:text-base">
          {String(t('auth.forgotPasswordSubtitle'))}
        </p>

        {sent ? (
          <div className="mt-8 rounded-xl border border-[#E8E0D8] bg-white p-5 text-sm text-[#3F3F3F]">
            <p className="font-semibold">
              {String(t('auth.passwordResetSent'))}
            </p>
            <p className="mt-2 text-[#878787]">
              {String(t('auth.checkEmailDescription'))}
            </p>
            <Link
              href={withLocale('/login', locale as 'en' | 'ru' | 'vi')}
              className="mt-4 inline-block font-semibold text-[#E86D4F]"
            >
              {String(t('auth.backToSignIn'))}
            </Link>
          </div>
        ) : (
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
                : String(t('auth.sendResetLink'))}
            </button>
          </form>
        )}
      </div>
    </ClientAuthShell>
  );
}
