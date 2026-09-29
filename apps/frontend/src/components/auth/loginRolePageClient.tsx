'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { getPublicSupabase } from '@/lib/supabase-public';
import { useTranslation } from '@/contexts/LanguageContext';
import { ChaoticUnderline } from '@/components/landing/chaoticUnderline';
import { stripLocaleFromPath, withLocale, type Locale } from '@/i18n/routing';

const ROLE_NEXT_KEY = 'henzo-oauth-role-next';

function storedNext(locale: Locale): string {
  const raw =
    typeof window === 'undefined'
      ? ''
      : (sessionStorage.getItem(ROLE_NEXT_KEY) ?? '');
  if (!raw.startsWith('/') || raw.startsWith('//')) {
    return withLocale('/activity', locale);
  }
  const stripped = stripLocaleFromPath(raw);
  return !stripped || stripped === '/' ? withLocale('/activity', locale) : raw;
}

function RoleCard({
  iAm,
  word,
  description,
  allInOne,
  continueLabel,
  imageSrc,
  imageOnLeft,
  accent,
  disabled,
  onClick,
}: {
  iAm: string;
  word: string;
  description: string;
  allInOne: string;
  continueLabel: string;
  imageSrc: string;
  imageOnLeft: boolean;
  accent: string;
  disabled: boolean;
  onClick: () => void;
}) {
  const points = [description, allInOne];
  const buttonClass =
    accent === '#F15942'
      ? 'bg-[#F15942] text-white'
      : 'bg-[#C2F600] text-[#3F3F3F]';

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="relative mt-8 h-[192px] w-full max-w-[420px] text-left disabled:opacity-60 md:mt-0 md:h-auto md:max-w-[520px] md:flex-1"
    >
      <span
        className={`absolute bottom-0 flex h-[160px] items-center rounded-[18px] bg-white md:static md:block md:h-auto md:min-h-[300px] md:rounded-[24px] md:py-8 md:shadow-[0_16px_40px_rgba(63,63,63,0.06)] ${
          imageOnLeft
            ? 'left-[72px] right-0 pl-[78px] pr-4 md:py-8 md:pl-[190px] md:pr-8'
            : 'left-0 right-[72px] pl-4 pr-[84px] md:py-8 md:pl-8 md:pr-[200px]'
        }`}
      >
        <span className="block min-w-0">
          <span className="block text-sm text-[#878787] md:text-base">
            {iAm}
          </span>
          <span className="mt-1 block w-fit">
            <span className="block text-[30px] font-bold leading-none tracking-tight text-[#3F3F3F] md:text-[40px]">
              {word}
            </span>
            <ChaoticUnderline
              color={accent}
              className="mt-1 h-[6px] w-[78%] md:h-[8px]"
            />
          </span>
          <span className="mt-2 block text-sm leading-snug text-[#878787] md:hidden">
            {description}
          </span>
          <span className="mt-1 block text-sm font-bold text-[#3F3F3F] md:hidden">
            {allInOne}
          </span>
          <ul className="mt-5 hidden flex-col gap-2.5 md:flex">
            {points.map((point) => (
              <li
                key={point}
                className="flex items-start gap-2.5 text-[15px] leading-snug text-[#3F3F3F]"
              >
                <span
                  className="mt-[7px] size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: accent }}
                />
                <span>{point}</span>
              </li>
            ))}
          </ul>
          <span
            className={`mt-6 hidden rounded-full px-6 py-2.5 text-sm font-semibold md:inline-flex ${buttonClass}`}
          >
            {continueLabel}
          </span>
        </span>
      </span>
      <Image
        src={imageSrc}
        alt=""
        width={220}
        height={280}
        className={`pointer-events-none absolute bottom-0 h-[192px] w-[161px] object-contain md:h-[280px] md:w-[210px] ${
          imageOnLeft
            ? 'left-0 object-left-bottom'
            : 'right-0 object-right-bottom'
        }`}
      />
    </button>
  );
}

export function LoginRolePageClient() {
  const t = useTranslation();
  const router = useRouter();
  const params = useParams();
  const locale = ((params?.locale as string) || 'en') as Locale;
  const [phase, setPhase] = useState<'check' | 'pick' | 'error'>('check');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const session = (await getPublicSupabase().auth.getSession()).data
        .session;
      if (!session) {
        router.replace(withLocale('/login', locale));
        return;
      }
      try {
        const body = await apiClient.get<{ user?: { role?: string } }>(
          '/auth/user',
        );
        if (!alive) return;
        const role = body.user?.role;
        if (role === 'OWNER') {
          const { setOwnerAuthCookie } = await import(
            '@/lib/owner/auth-session-cookie'
          );
          const { clearClientAuthCookie } = await import(
            '@/lib/client-panel/auth-session-cookie'
          );
          clearClientAuthCookie();
          setOwnerAuthCookie();
          router.replace(withLocale('/owner-dashboard', locale));
          return;
        }
        if (role === 'CLIENT') {
          const { setClientAuthCookie } = await import(
            '@/lib/client-panel/auth-session-cookie'
          );
          const { clearOwnerAuthCookie } = await import(
            '@/lib/owner/auth-session-cookie'
          );
          clearOwnerAuthCookie();
          setClientAuthCookie();
          router.replace(storedNext(locale));
          return;
        }
        setPhase('pick');
      } catch (err) {
        if (!alive) return;
        const status = (err as { status?: number }).status;
        if (status === 404) {
          sessionStorage.removeItem('henzo-oauth-pick-role');
          setPhase('pick');
          return;
        }
        setPhase('error');
        setError(
          err instanceof Error ? err.message : String(t('auth.signInFailed')),
        );
      }
    })();
    return () => {
      alive = false;
    };
  }, [locale, router, t]);

  async function choose(asOwner: boolean) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const session = (await getPublicSupabase().auth.getSession()).data
        .session;
      if (!session) {
        router.replace(withLocale('/login', locale));
        return;
      }
      if (asOwner) {
        await apiClient.post('/auth/register', {
          userId: session.user.id,
          email: session.user.email || '',
          name:
            session.user.user_metadata?.name ||
            session.user.user_metadata?.full_name ||
            '',
          role: 'OWNER',
        });
        const { setOwnerAuthCookie } = await import(
          '@/lib/owner/auth-session-cookie'
        );
        const { clearClientAuthCookie } = await import(
          '@/lib/client-panel/auth-session-cookie'
        );
        clearClientAuthCookie();
        setOwnerAuthCookie();
        sessionStorage.removeItem(ROLE_NEXT_KEY);
        router.replace(withLocale('/owner-dashboard', locale));
        return;
      }
      await apiClient.get('/auth/user?syncIfMissing=true');
      const { setClientAuthCookie } = await import(
        '@/lib/client-panel/auth-session-cookie'
      );
      const { clearOwnerAuthCookie } = await import(
        '@/lib/owner/auth-session-cookie'
      );
      clearOwnerAuthCookie();
      setClientAuthCookie();
      const next = storedNext(locale);
      sessionStorage.removeItem(ROLE_NEXT_KEY);
      router.replace(next);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : String(t('auth.signInFailed')),
      );
      setBusy(false);
    }
  }

  async function backToLogin() {
    await getPublicSupabase().auth.signOut({ scope: 'local' });
    sessionStorage.removeItem(ROLE_NEXT_KEY);
    router.replace(withLocale('/login', locale));
  }

  const iAm = String(t('auth.roleIAm') || "I'm a");
  const allInOne = String(t('auth.roleAllInOne') || 'All in one app.');
  const continueLabel = String(t('auth.roleContinue') || 'Continue');

  return (
    <div className="min-h-screen bg-[#F9F4F0] px-4 py-6 md:px-10 md:py-10">
      <div className="mx-auto flex w-full max-w-[440px] flex-col md:max-w-[1080px]">
        <button
          type="button"
          onClick={() => void backToLogin()}
          className="self-start text-sm font-medium text-[#3F3F3F]"
        >
          {String(t('auth.backToSignIn') || 'Back to Sign In')}
        </button>
        <h1 className="mt-8 text-center text-[42px] font-bold leading-none tracking-tight text-[#3F3F3F] md:mt-14 md:text-[68px]">
          {String(t('auth.roleTitle') || 'Who are you?')}
        </h1>
        <p className="mt-3 text-center text-[18px] text-[#3F3F3F] md:mt-5 md:text-[26px]">
          {String(t('auth.roleSubtitleBefore') || "Choose your role and let's")}{' '}
          <span className="relative inline-block font-bold">
            {String(t('auth.roleSubtitleHighlight') || 'get moving')}
            <ChaoticUnderline
              color="#F15942"
              className="absolute -bottom-1 left-0 h-[7px] w-full md:h-[10px]"
            />
          </span>
        </p>

        {phase === 'check' ? (
          <p className="mt-16 text-center text-sm text-[#878787]">
            {String(t('auth.signingIn') || 'Signing in…')}
          </p>
        ) : (
          <div className="md:mt-16 md:flex md:items-stretch md:justify-center md:gap-8">
            <RoleCard
              iAm={iAm}
              word={String(t('auth.roleClientWord') || 'Client')}
              description={String(
                t('auth.roleClientDesc') || 'Find and book classes near you.',
              )}
              allInOne={allInOne}
              continueLabel={continueLabel}
              imageSrc="/images/role-client.webp"
              imageOnLeft
              accent="#F15942"
              disabled={busy || phase !== 'pick'}
              onClick={() => void choose(false)}
            />
            <RoleCard
              iAm={iAm}
              word={String(t('auth.roleManagerWord') || 'Manager')}
              description={String(
                t('auth.roleOwnerDesc') ||
                  'Manage studio, classes, and bookings.',
              )}
              allInOne={allInOne}
              continueLabel={continueLabel}
              imageSrc="/images/role-manager.webp"
              imageOnLeft={false}
              accent="#C2F600"
              disabled={busy || phase !== 'pick'}
              onClick={() => void choose(true)}
            />
          </div>
        )}

        {error ? (
          <p className="mt-4 text-center text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
