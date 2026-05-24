import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  defaultLocale,
  extractLocaleFromPath,
  isLocale,
  stripLocaleFromPath,
} from './i18n/routing';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const res = NextResponse.next();

  // Ignore next internals and files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon') ||
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
      const resWithCookie = NextResponse.next();
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

  const disabledPrefixes = [
    '/salons',
    '/category',
    '/map',
    '/booking-confirmed',
    '/bookings',
    '/verify',
    '/dashboard',
    '/favorites',
    '/reviews',
    '/settings',
    '/owner-dashboard',
    '/calendar',
    '/services',
    '/marketing',
    '/staff',
    '/salon-info',
    '/billing',
    '/owner-help',
    '/clients',
    '/admin-panel',
    '/profit',
    '/promotion-coupons',
    '/structure',
    '/unauthorized',
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

  // Web is landing-only now: no auth gating in middleware.
  // Allow routing to continue and let Next.js handle missing pages (404).
  return res;
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
