import { getPublicSupabase } from '@/lib/supabase-public';
import { extractLocaleFromPath, withLocale } from '@/i18n/routing';

export const BUSINESS_OAUTH_NONCE_KEY = 'businessOAuthNonce';
export const BUSINESS_OAUTH_NONCE_TS_KEY = 'businessOAuthNonceTs';
export const BUSINESS_OAUTH_SOURCE_KEY = 'businessOAuthSource';

/** Client / business OAuth intent — kept out of redirectTo query (Supabase allowlist). */
export const OAUTH_INTENT_KEY = 'henzoOAuthIntent';

const BUSINESS_OAUTH_TTL_MS = 15 * 60 * 1000;
const OAUTH_INTENT_TTL_MS = 15 * 60 * 1000;

export type OAuthIntent = {
  type: 'client' | 'business';
  next: string;
  createdAt: number;
  source?: string;
};

/** Prefer current tab origin so auth cookies/storage stay on the same host. */
export function getOAuthRedirectUrl(path: string = '/auth/callback'): string {
  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://henzo.app').trim();

  let cleanUrl = origin.trim();
  if (cleanUrl.startsWith('henzo://')) {
    cleanUrl = cleanUrl.replace('henzo://', 'https://');
  }
  if (!/^https?:\/\//i.test(cleanUrl)) {
    cleanUrl = `https://${cleanUrl}`;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  // Strip query/hash — only pathname is allowlisted reliably in Supabase.
  const pathOnly = normalizedPath.split('?')[0].split('#')[0];
  return `${cleanUrl.replace(/\/$/, '')}${pathOnly}`;
}

export function saveOAuthIntent(intent: Omit<OAuthIntent, 'createdAt'>): void {
  if (typeof window === 'undefined') return;
  const payload: OAuthIntent = { ...intent, createdAt: Date.now() };
  sessionStorage.setItem(OAUTH_INTENT_KEY, JSON.stringify(payload));
}

export function consumeOAuthIntent(): OAuthIntent | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(OAUTH_INTENT_KEY);
  sessionStorage.removeItem(OAUTH_INTENT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as OAuthIntent;
    if (
      !parsed?.type ||
      !parsed?.next ||
      !parsed.createdAt ||
      Date.now() - parsed.createdAt > OAUTH_INTENT_TTL_MS
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function peekOAuthIntent(): OAuthIntent | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(OAUTH_INTENT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as OAuthIntent;
    if (
      !parsed?.createdAt ||
      Date.now() - parsed.createdAt > OAUTH_INTENT_TTL_MS
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function isBusinessOAuthPending(): boolean {
  if (typeof window === 'undefined') return false;
  const intent = peekOAuthIntent();
  if (intent?.type === 'business') return true;

  const nonce = sessionStorage.getItem(BUSINESS_OAUTH_NONCE_KEY);
  const nonceTs = sessionStorage.getItem(BUSINESS_OAUTH_NONCE_TS_KEY);
  const createdAt = nonceTs ? Number(nonceTs) : 0;
  return (
    !!nonce &&
    !!createdAt &&
    Number.isFinite(createdAt) &&
    Date.now() - createdAt <= BUSINESS_OAUTH_TTL_MS
  );
}

function createBusinessOAuthNonce(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

/**
 * Business Google OAuth via public localStorage client (not admin cookie PKCE).
 */
export async function startBusinessGoogleOAuth(options?: {
  source?: 'business_login' | 'business_register';
}) {
  const source = options?.source ?? 'business_login';
  const nonce = createBusinessOAuthNonce();

  sessionStorage.setItem(BUSINESS_OAUTH_NONCE_KEY, nonce);
  sessionStorage.setItem(BUSINESS_OAUTH_NONCE_TS_KEY, String(Date.now()));
  sessionStorage.setItem(BUSINESS_OAUTH_SOURCE_KEY, source);

  // Drop stale locks from a previous attempt.
  sessionStorage.removeItem('henzo-oauth-pending-code');
  for (let i = sessionStorage.length - 1; i >= 0; i--) {
    const key = sessionStorage.key(i);
    if (
      key?.startsWith('henzo-oauth-lock:') ||
      key?.startsWith('henzo-oauth-exchanging:')
    ) {
      sessionStorage.removeItem(key);
    }
  }

  const currentPath =
    typeof window !== 'undefined' ? window.location.pathname : '/';
  const locale = extractLocaleFromPath(currentPath) ?? 'en';
  saveOAuthIntent({
    type: 'business',
    next: withLocale('/business/login', locale),
    source,
  });

  return getPublicSupabase().auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: getOAuthRedirectUrl('/auth/callback'),
      queryParams: {
        access_type: 'offline',
        prompt: 'select_account',
      },
    },
  });
}

export async function startClientGoogleOAuth(options: {
  next: string;
  provider?: 'google' | 'apple';
}) {
  const provider = options.provider ?? 'google';
  saveOAuthIntent({
    type: 'client',
    next: options.next,
  });

  // Drop stale exchange locks / pending codes from a previous attempt.
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem('henzo-oauth-pending-code');
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (
        key?.startsWith('henzo-oauth-lock:') ||
        key?.startsWith('henzo-oauth-exchanging:')
      ) {
        sessionStorage.removeItem(key);
      }
    }
  }

  return getPublicSupabase().auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: getOAuthRedirectUrl('/auth/callback'),
      ...(provider === 'google'
        ? {
            queryParams: {
              prompt: 'select_account',
            },
          }
        : {}),
    },
  });
}

export function consumeBusinessOAuthContext(): {
  isValid: boolean;
  source: string | null;
} {
  const source = sessionStorage.getItem(BUSINESS_OAUTH_SOURCE_KEY);
  const nonce = sessionStorage.getItem(BUSINESS_OAUTH_NONCE_KEY);
  const nonceTs = sessionStorage.getItem(BUSINESS_OAUTH_NONCE_TS_KEY);

  const createdAt = nonceTs ? Number(nonceTs) : 0;
  const isValid =
    !!nonce &&
    !!createdAt &&
    Number.isFinite(createdAt) &&
    Date.now() - createdAt <= BUSINESS_OAUTH_TTL_MS;

  sessionStorage.removeItem(BUSINESS_OAUTH_NONCE_KEY);
  sessionStorage.removeItem(BUSINESS_OAUTH_NONCE_TS_KEY);
  sessionStorage.removeItem(BUSINESS_OAUTH_SOURCE_KEY);

  return { isValid, source };
}
