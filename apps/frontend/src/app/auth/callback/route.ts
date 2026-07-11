import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { extractLocaleFromPath, type Locale } from '@/i18n/routing';
import { publicEnv } from '@/lib/public-env';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const { searchParams } = requestUrl;
  const code = searchParams.get('code');
  const oauthError = searchParams.get('error');
  const oauthErrorDescription = searchParams.get('error_description');
  const next = sanitizeNextPath(searchParams.get('next'));
  const origin = publicEnv.frontendUrl || requestUrl.origin;
  const locale = extractLocaleFromPath(next) ?? 'en';

  if (oauthError) {
    return redirectToLogin(origin, locale, {
      error: 'oauth',
      message: oauthErrorDescription ?? oauthError,
    });
  }

  if (!code || !isSupabaseConfigured()) {
    return redirectToLogin(origin, locale, { error: 'oauth' });
  }

  const cookieStore = await cookies();
  let response = NextResponse.redirect(`${origin}${next}`);

  const supabase = createServerClient(
    publicEnv.supabaseUrl,
    publicEnv.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.session) {
    return redirectToLogin(origin, locale, { error: 'oauth' });
  }

  const provisioned = await provisionClientUser(data.session.access_token);
  if (!provisioned.ok) {
    await supabase.auth.signOut();
    return redirectToLogin(origin, locale, {
      error: provisioned.error,
      message: provisioned.message,
    });
  }

  if (provisioned.role && provisioned.role !== 'CLIENT') {
    await supabase.auth.signOut();
    return redirectToLogin(origin, locale, { error: 'role' });
  }

  return response;
}

function isSupabaseConfigured(): boolean {
  return Boolean(publicEnv.supabaseUrl && publicEnv.supabaseAnonKey);
}

function sanitizeNextPath(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return '/en';
  }
  return next;
}

function redirectToLogin(
  origin: string,
  locale: Locale,
  params: { error: string; message?: string },
) {
  const url = new URL(`${origin}/${locale}/login`);
  url.searchParams.set('error', params.error);
  if (params.message) {
    url.searchParams.set('message', params.message);
  }
  return NextResponse.redirect(url);
}

async function provisionClientUser(accessToken: string): Promise<{
  ok: boolean;
  role?: string;
  error?: string;
  message?: string;
}> {
  try {
    const res = await fetch(
      `${publicEnv.apiUrl}/auth/user?syncIfMissing=true`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: 'no-store',
      },
    );

    if (res.status === 404) {
      return { ok: false, error: 'account' };
    }

    if (!res.ok) {
      return { ok: false, error: 'server' };
    }

    const body = (await res.json()) as { user?: { role?: string } };
    return { ok: true, role: body.user?.role };
  } catch {
    return { ok: false, error: 'server' };
  }
}
