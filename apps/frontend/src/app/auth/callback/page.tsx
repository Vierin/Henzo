'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { getPublicSupabase } from '@/lib/supabase-public';
import { isSupabaseConfigured, publicEnv } from '@/lib/public-env';
import {
  extractLocaleFromPath,
  stripLocaleFromPath,
  withLocale,
  type Locale,
} from '@/i18n/routing';
import {
  consumeBusinessOAuthContext,
  consumeOAuthIntent,
  OAUTH_PICK_ROLE_KEY,
  peekOAuthIntent,
} from '@/utils/oauth';
import type { Session } from '@supabase/supabase-js';

const OAUTH_CODE_KEY = 'henzo-oauth-pending-code';
const OAUTH_LOCK_PREFIX = 'henzo-oauth-lock:';

function sanitizeNextPath(next: string | null, locale: Locale): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return withLocale('/activity', locale);
  }
  return next;
}

function lockKey(code: string): string {
  return `${OAUTH_LOCK_PREFIX}${code}`;
}

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState('Signing you in…');

  useEffect(() => {
    let alive = true;

    const failToLogin = (locale: Locale, error: string, details?: string) => {
      if (!alive) return;
      const url = new URL(
        `${window.location.origin}${withLocale('/login', locale)}`,
      );
      url.searchParams.set('error', error);
      if (details) url.searchParams.set('message', details);
      router.replace(url.pathname + url.search);
    };

    const failToBusiness = (locale: Locale, error: string) => {
      if (!alive) return;
      router.replace(
        withLocale(
          `/business/register?error=${encodeURIComponent(error)}`,
          locale,
        ),
      );
    };

    const finishWithSession = async (
      session: Session,
      type: string | null,
      nextRaw: string | null,
      locale: Locale,
      intentType: string | undefined,
      pickRole = false,
    ) => {
      const publicSb = getPublicSupabase();

      if (type === 'business') {
        const oauthContext = consumeBusinessOAuthContext();
        if (!oauthContext.isValid && intentType !== 'business') {
          await publicSb.auth.signOut({ scope: 'local' });
          failToBusiness(locale, 'Business sign-in expired. Try again.');
          return;
        }

        try {
          await apiClient.post('/auth/register', {
            userId: session.user.id,
            email: session.user.email || '',
            name:
              session.user.user_metadata?.name ||
              session.user.user_metadata?.full_name ||
              '',
            role: 'OWNER',
          });
        } catch (err) {
          const msg =
            err instanceof Error
              ? err.message
              : 'Could not finish business signup after Google.';
          const soft =
            /already|exist|owner/i.test(msg) ||
            msg.toLowerCase().includes('registered');
          if (!soft) {
            await publicSb.auth.signOut({ scope: 'local' });
            failToBusiness(locale, msg);
            return;
          }
        }

        if (!alive) return;
        setMessage('Opening business panel…');
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

      try {
        const res = await fetch(
          pickRole
            ? `${publicEnv.apiUrl}/auth/user`
            : `${publicEnv.apiUrl}/auth/user?syncIfMissing=true`,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
            cache: 'no-store',
          },
        );

        if (!res.ok) {
          if (res.status === 404 && pickRole) {
            sessionStorage.setItem('henzo-oauth-role-next', nextRaw ?? '');
            router.replace(withLocale('/login/role', locale));
            return;
          }
          await publicSb.auth.signOut({ scope: 'local' });
          failToLogin(locale, res.status === 404 ? 'account' : 'server');
          return;
        }

        const body = (await res.json()) as { user?: { role?: string } };
        const role = body.user?.role;
        sessionStorage.removeItem(OAUTH_PICK_ROLE_KEY);
        if (role === 'OWNER') {
          if (!alive) return;
          setMessage('Opening business panel…');
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
        if (role && role !== 'CLIENT') {
          await publicSb.auth.signOut({ scope: 'local' });
          failToLogin(locale, 'role');
          return;
        }
      } catch {
        await publicSb.auth.signOut({ scope: 'local' });
        failToLogin(locale, 'server');
        return;
      }

      if (!alive) return;
      const { setClientAuthCookie } = await import(
        '@/lib/client-panel/auth-session-cookie'
      );
      const { clearOwnerAuthCookie } = await import(
        '@/lib/owner/auth-session-cookie'
      );
      clearOwnerAuthCookie();
      setClientAuthCookie();
      const nextPath = sanitizeNextPath(nextRaw, locale);
      const stripped = stripLocaleFromPath(nextPath);
      router.replace(
        !stripped || stripped === '/'
          ? withLocale('/activity', locale)
          : nextPath,
      );
    };

    const waitForSession = async (
      publicSb: ReturnType<typeof getPublicSupabase>,
      attempts = 20,
    ): Promise<Session | null> => {
      for (let i = 0; i < attempts; i++) {
        const session = (await publicSb.auth.getSession()).data.session;
        if (session) return session;
        await new Promise((r) => setTimeout(r, 100));
      }
      return null;
    };

    const run = async () => {
      if (!isSupabaseConfigured()) {
        failToLogin('en', 'oauth', 'Supabase is not configured');
        return;
      }

      const intent = peekOAuthIntent();
      const pickRole =
        sessionStorage.getItem(OAUTH_PICK_ROLE_KEY) === '1' ||
        (intent?.pickRole === true && intent.type !== 'business');
      const oauthError =
        searchParams.get('error_description') ?? searchParams.get('error');
      // Prefer window.location — useSearchParams can lag on the first paint
      // after a hard OAuth redirect (shows Missing auth code on remount).
      const urlParams = new URLSearchParams(window.location.search);
      const codeFromUrl =
        searchParams.get('code') ?? urlParams.get('code') ?? null;
      const codeFromStore = sessionStorage.getItem(OAUTH_CODE_KEY);
      const code = codeFromUrl || codeFromStore;

      const typeParam =
        searchParams.get('type') ??
        urlParams.get('type') ??
        intent?.type ??
        null;
      const nextRaw =
        searchParams.get('next') ??
        urlParams.get('next') ??
        intent?.next ??
        null;
      const localeFromNext =
        extractLocaleFromPath(nextRaw ?? '') ??
        extractLocaleFromPath(window.location.pathname) ??
        'en';
      const type =
        typeParam === 'business' || intent?.type === 'business'
          ? 'business'
          : typeParam;

      if (
        oauthError ||
        urlParams.get('error') ||
        urlParams.get('error_description')
      ) {
        const errMsg =
          oauthError ||
          urlParams.get('error_description') ||
          urlParams.get('error') ||
          'OAuth error';
        sessionStorage.removeItem(OAUTH_CODE_KEY);
        consumeOAuthIntent();
        if (type === 'business') {
          failToBusiness(localeFromNext, errMsg);
        } else {
          failToLogin(localeFromNext, 'oauth', errMsg);
        }
        return;
      }

      const publicSb = getPublicSupabase();

      // Session may already exist: sibling Strict Mode mount finished exchange
      // and cleared the URL/code before this effect ran.
      const existing = (await publicSb.auth.getSession()).data.session;
      const codeAlreadyExchanged =
        !!code && sessionStorage.getItem(lockKey(code)) === 'done';
      if (existing && (!code || codeAlreadyExchanged)) {
        sessionStorage.removeItem(OAUTH_CODE_KEY);
        if (code) sessionStorage.setItem(lockKey(code), 'done');
        consumeOAuthIntent();
        if (alive) {
          window.history.replaceState({}, '', '/auth/callback');
        }
        await finishWithSession(
          existing,
          type,
          nextRaw,
          localeFromNext,
          intent?.type,
          pickRole,
        );
        return;
      }

      if (!code) {
        consumeOAuthIntent();
        if (type === 'business') {
          failToBusiness(localeFromNext, 'Google sign-in was not completed');
        } else {
          failToLogin(localeFromNext, 'oauth', 'Missing auth code');
        }
        return;
      }

      // Keep code across Strict Mode remounts (URL may be cleaned later).
      sessionStorage.setItem(OAUTH_CODE_KEY, code);

      const lock = lockKey(code);
      const lockState = sessionStorage.getItem(lock);

      if (lockState === 'done') {
        const session = await waitForSession(publicSb);
        sessionStorage.removeItem(OAUTH_CODE_KEY);
        consumeOAuthIntent();
        if (session) {
          await finishWithSession(
            session,
            type,
            nextRaw,
            localeFromNext,
            intent?.type,
            pickRole,
          );
          return;
        }
        failToLogin(localeFromNext, 'oauth', 'Sign-in expired. Try again.');
        return;
      }

      if (lockState === '1') {
        // Another effect owns the exchange — wait for session.
        const session = await waitForSession(publicSb, 40);
        if (session) {
          sessionStorage.setItem(lock, 'done');
          sessionStorage.removeItem(OAUTH_CODE_KEY);
          consumeOAuthIntent();
          if (alive) {
            window.history.replaceState({}, '', '/auth/callback');
          }
          await finishWithSession(
            session,
            type,
            nextRaw,
            localeFromNext,
            intent?.type,
            pickRole,
          );
          return;
        }
        // Owner mount aborted without session — take over exchange.
        sessionStorage.setItem(lock, '1');
      } else {
        sessionStorage.setItem(lock, '1');
      }

      const exchangePromise = publicSb.auth.exchangeCodeForSession(code);
      const timeoutPromise = new Promise<{
        data: { session: null };
        error: Error;
      }>((resolve) => {
        window.setTimeout(
          () =>
            resolve({
              data: { session: null },
              error: new Error('Sign-in timed out. Try again.'),
            }),
          15000,
        );
      });

      const { data, error } = await Promise.race([
        exchangePromise,
        timeoutPromise,
      ]);

      // Always persist result even if this mount was cleaned up — sibling mount
      // will pick up the session.
      if (error || !data.session) {
        const recovered = (await publicSb.auth.getSession()).data.session;
        if (recovered) {
          sessionStorage.setItem(lock, 'done');
          sessionStorage.removeItem(OAUTH_CODE_KEY);
          consumeOAuthIntent();
          if (alive) {
            window.history.replaceState({}, '', '/auth/callback');
            await finishWithSession(
              recovered,
              type,
              nextRaw,
              localeFromNext,
              intent?.type,
              pickRole,
            );
          }
          return;
        }

        sessionStorage.removeItem(lock);
        sessionStorage.removeItem(OAUTH_CODE_KEY);
        consumeOAuthIntent();
        const details = error?.message || 'Google sign-in session is invalid';
        if (type === 'business') {
          failToBusiness(localeFromNext, details);
        } else {
          failToLogin(localeFromNext, 'oauth', details);
        }
        return;
      }

      sessionStorage.setItem(lock, 'done');
      // Keep pending code until finish succeeds so a remount can recover via
      // sessionStorage if URL was already cleaned.
      consumeOAuthIntent();
      if (alive) {
        window.history.replaceState({}, '', '/auth/callback');
        sessionStorage.removeItem(OAUTH_CODE_KEY);
        await finishWithSession(
          data.session,
          type,
          nextRaw,
          localeFromNext,
          intent?.type,
          pickRole,
        );
      }
      // If !alive, leave OAUTH_CODE_KEY + lock=done; remount finishes via
      // existing session / stored code path above.
    };

    void run();
    return () => {
      alive = false;
    };
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FDF5F0] px-4">
      <p className="text-sm text-[#3F3F3F]">{message}</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#FDF5F0] px-4">
          <p className="text-sm text-[#3F3F3F]">Signing you in…</p>
        </div>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  );
}
