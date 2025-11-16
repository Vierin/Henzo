import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import {
	defaultLocale,
	extractLocaleFromPath,
	isLocale,
	locales,
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

	// Создаем Supabase клиент для middleware
	const supabase = createMiddlewareClient({ req, res });

	// Публичные маршруты
	const publicRoutes = [
		'/', // homepage
		'/login',
		'/owner-dashboard',
		'/calendar',
		'/services',
		'/marketing',
		'/staff',
		'/salon-info',
		'/register',
		'/salons',
		'/category',
		'/salon',
		'/about',
		'/contact',
		'/auth',
		'/verify',
		'/check-email',
		'/business',
		'/terms-of-service',
		'/privacy-policy',
	];

	// Проверяем, является ли маршрут публичным
	const pathWithoutLocale = stripLocaleFromPath(pathname);
	const isPublicRoute = publicRoutes.some(
		(route) =>
			pathWithoutLocale === route || pathWithoutLocale.startsWith(`${route}/`)
	);

	// Для публичных маршрутов разрешаем доступ
	if (isPublicRoute) {
		return res;
	}

	// Для защищенных маршрутов проверяем аутентификацию
	try {
		const {
			data: { session },
		} = await supabase.auth.getSession();

		if (!session) {
			// Перенаправляем на главную страницу
			return NextResponse.redirect(new URL(`/${urlLocale}`, req.url));
		}

		// Проверяем роль пользователя для специфичных маршрутов
		const userRole = session.user?.user_metadata?.role;

		if (pathWithoutLocale.startsWith('/client') && userRole !== 'CLIENT') {
			return NextResponse.redirect(
				new URL(`/${urlLocale}/unauthorized`, req.url)
			);
		}

		if (
			(pathWithoutLocale.startsWith('/owner') ||
				pathWithoutLocale.startsWith('/business')) &&
			userRole !== 'OWNER'
		) {
			return NextResponse.redirect(
				new URL(`/${urlLocale}/unauthorized`, req.url)
			);
		}

		if (pathWithoutLocale.startsWith('/admin') && userRole !== 'ADMIN') {
			return NextResponse.redirect(
				new URL(`/${urlLocale}/unauthorized`, req.url)
			);
		}

		return res;
	} catch (error) {
		console.error('Middleware auth error:', error);
		// В случае ошибки перенаправляем на главную страницу
		return NextResponse.redirect(
			new URL(`/${urlLocale ?? defaultLocale}`, req.url)
		);
	}
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
