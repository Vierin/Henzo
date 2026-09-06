import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  defaultLocale,
  extractLocaleFromPath,
  isLocale,
  stripLocaleFromPath,
  type Locale,
} from './i18n/routing';
import { isRouteMatch, ownerRoutes } from './config/routes';
import { OWNER_AUTH_COOKIE } from './lib/owner/auth-session-cookie';

function withLocaleHeader(response: NextResponse, locale: Locale) {
  response.headers.set('x-locale', locale);
  return response;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const res = NextResponse.next();

  // Ignore next internals, static files, OAuth callback, and Digital Asset Links
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/.well-known') ||
    pathname.includes('.')
  ) {
    return res;
  }

  // Locale handling: ensure first segment is a supported locale
  const urlLocale = extractLocaleFromPath(pathname);
  if (!urlLocale) {
    // Try cookie or header
    const cookieLocale = req.cookies.get('locale')?.value;
    let preferred = defaultLocale;
    if (cookieLocale && isLocale(cookieLocale)) {
      preferred = cookieLocale;
    } else {
      const header = req.headers.get('accept-language') || '';
      const first = header.split(',')[0]?.split('-')[0]?.toLowerCase();
      if (first && isLocale(first)) preferred = first as typeof preferred;
    }
    const url = req.nextUrl.clone();
    const rest = stripLocaleFromPath(pathname); // gives original if none
    url.pathname = `/${preferred}${rest}`;
    const redirect = NextResponse.redirect(url);
    redirect.cookies.set('locale', preferred, {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
    });
    return redirect;
  } else {
    // Sync cookie with URL locale on visits that already include locale
    const cookieLocale = req.cookies.get('locale')?.value;
    if (cookieLocale !== urlLocale) {
      const resWithCookie = withLocaleHeader(NextResponse.next(), urlLocale);
      resWithCookie.cookies.set('locale', urlLocale, {
        path: '/',
        httpOnly: false,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365,
      });
      return resWithCookie;
    }
  }

  const pathWithoutLocale = stripLocaleFromPath(pathname);
  const activeLocale = (urlLocale ?? defaultLocale) as Locale;

  // Supabase may fall back to Site URL (/en?code=...). Never steal business /
  // client OAuth into admin — only admin login uses /en/admin/auth/callback
  // as redirectTo. Forward unknown codes to /auth/callback (client PKCE).
  const oauthCode = req.nextUrl.searchParams.get('code');
  const oauthError = req.nextUrl.searchParams.get('error');
  if (
    (pathWithoutLocale === '/' || pathWithoutLocale === '') &&
    (oauthCode || oauthError)
  ) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = '/auth/callback';
    return NextResponse.redirect(redirectUrl);
  }

  // Blog is English-only for now.
  if (pathWithoutLocale === '/blog' || pathWithoutLocale.startsWith('/blog/')) {
    if (urlLocale && urlLocale !== 'en') {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = `/en${pathWithoutLocale}`;
      return NextResponse.redirect(redirectUrl, 308);
    }
  }

  // Legacy booking URLs used /salon/{slug}; public page lives at /studio/{slug}.
  if (
    pathWithoutLocale === '/salon' ||
    pathWithoutLocale.startsWith('/salon/')
  ) {
    const targetLocale = urlLocale ?? defaultLocale;
    const redirectUrl = req.nextUrl.clone();
    const newPath = pathWithoutLocale.replace(/^\/salon/, '/studio');
    redirectUrl.pathname = `/${targetLocale}${newPath}`;
    return NextResponse.redirect(redirectUrl, 308);
  }

  // Legacy list URL /salons → /studios
  if (
    pathWithoutLocale === '/salons' ||
    pathWithoutLocale.startsWith('/salons/')
  ) {
    const targetLocale = urlLocale ?? defaultLocale;
    const redirectUrl = req.nextUrl.clone();
    const newPath = pathWithoutLocale.replace(/^\/salons/, '/studios');
    redirectUrl.pathname = `/${targetLocale}${newPath}`;
    return NextResponse.redirect(redirectUrl, 308);
  }

  // Owner panel: session cookie set by client after OAuth / gate.
  // Role is still enforced in OwnerProtectedGate.
  if (isRouteMatch(pathWithoutLocale, ownerRoutes)) {
    const hasOwnerSession = Boolean(req.cookies.get(OWNER_AUTH_COOKIE)?.value);
    if (!hasOwnerSession) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = `/${activeLocale}/business/login`;
      redirectUrl.search = '';
      return NextResponse.redirect(redirectUrl);
    }
    return withLocaleHeader(res, activeLocale);
  }

  const disabledPrefixes = [
    '/map',
    '/booking-confirmed',
    '/bookings',
    '/verify',
    '/dashboard',
    '/favorites',
    '/reviews',
    '/settings',
    '/services',
    '/billing',
    '/owner-help',
    '/admin-panel',
    '/profit',
    '/promotion-coupons',
    '/structure',
    '/unauthorized',
    '/subscription',
    '/marketing',
    '/profile-settings',
  ];

  if (
    disabledPrefixes.some(
      (prefix) =>
        pathWithoutLocale === prefix ||
        pathWithoutLocale.startsWith(`${prefix}/`),
    )
  ) {
    const targetLocale = urlLocale ?? defaultLocale;
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = `/${targetLocale}`;
    return NextResponse.redirect(redirectUrl);
  }

  return withLocaleHeader(res, activeLocale);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
