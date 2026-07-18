import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { publicEnv } from '@/lib/public-env';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const errorDescription =
    request.nextUrl.searchParams.get('error_description');
  const loginUrl = new URL('/en/admin/login', request.url);

  if (!code) {
    loginUrl.searchParams.set(
      'error',
      errorDescription ?? 'Google sign-in was not completed',
    );
    return NextResponse.redirect(loginUrl);
  }

  // Build the redirect first so exchangeCodeForSession can attach auth
  // cookies onto this response (cookieStore.set alone is not enough).
  const redirectResponse = NextResponse.redirect(
    new URL('/en/admin/mfa', request.url),
  );

  const supabase = createServerClient(
    publicEnv.supabaseUrl,
    publicEnv.supabaseAnonKey,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          for (const { name, value, options } of cookiesToSet) {
            redirectResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    loginUrl.searchParams.set(
      'error',
      error.message || 'Google sign-in session is invalid',
    );
    return NextResponse.redirect(loginUrl);
  }

  return redirectResponse;
}
