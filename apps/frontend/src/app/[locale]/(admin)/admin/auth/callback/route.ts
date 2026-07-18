import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

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

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    loginUrl.searchParams.set('error', 'Google sign-in session is invalid');
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.redirect(new URL('/en/admin/mfa', request.url));
}
