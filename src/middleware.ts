import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import {
	defaultLocale,
	extractLocaleFromPath,
	isLocale,
	locales,
	stripLocaleFromPath,
} from './i18n/routing';
import {
	isPublicRoute,
	isProtectedRoute,
	getRequiredRole,
	hasRouteAccess,
} from './config/routes';
import { logger } from './lib/logger';

export async function middleware(req: NextRequest) {
	const { pathname } = req.nextUrl;
	const res = NextResponse.next();
	const requestId = logger.generateRequestId();

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

	// Получаем путь без локали
	const pathWithoutLocale = stripLocaleFromPath(pathname);

	// Логирование запроса
	logger.middleware.request(pathWithoutLocale, requestId, {
		method: req.method,
		url: req.url,
	});

	// Проверяем, является ли маршрут публичным
	if (isPublicRoute(pathWithoutLocale)) {
		logger.debug('[Middleware] Public route access', {
			path: pathWithoutLocale,
			requestId,
		});
		return res;
	}

	// Проверка специальных маршрутов business
	// Business маршруты обрабатываются через общую проверку авторизации ниже

	// Создаем Supabase клиент для middleware с поддержкой cookies
	// Важно: создаем после проверки публичных маршрутов
	const supabaseResponse = NextResponse.next();
	supabaseResponse.headers.set('X-Request-ID', requestId);

	const supabase = createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
		{
			cookies: {
				getAll() {
					return req.cookies.getAll();
				},
				setAll(cookiesToSet) {
					cookiesToSet.forEach(({ name, value, options }) => {
						req.cookies.set(name, value);
						supabaseResponse.cookies.set(name, value, options);
					});
				},
			},
		}
	);

	// Для защищенных маршрутов проверяем только наличие сессии
	// Проверка роли выполняется в ProtectedRoute через AuthContext
	try {
		// Сначала проверяем сессию через getSession
		const {
			data: { session },
			error: sessionError,
		} = await supabase.auth.getSession();

		console.log('[Middleware DEBUG] Session check:', {
			hasSession: !!session,
			hasAccessToken: !!session?.access_token,
			sessionError: sessionError?.message,
			cookies: req.cookies.getAll().map((c) => c.name),
			path: pathWithoutLocale,
		});

		// Получаем пользователя - getUser более надежен в middleware и автоматически обновляет сессию
		const {
			data: { user },
			error: userError,
		} = await supabase.auth.getUser();

		console.log('[Middleware DEBUG] User check:', {
			hasUser: !!user,
			userId: user?.id,
			userError: userError?.message,
			path: pathWithoutLocale,
		});

		if (userError || !user) {
			logger.middleware.authCheck(pathWithoutLocale, false, null, {
				error: userError?.message || 'Auth session missing!',
				requestId,
			});
			// Перенаправляем на страницу логина с returnTo параметром
			const loginUrl = new URL(`/${urlLocale}/login`, req.url);
			loginUrl.searchParams.set('returnTo', pathname);
			logger.middleware.redirect(
				pathWithoutLocale,
				loginUrl.pathname,
				'No user found',
				{ requestId }
			);
			return NextResponse.redirect(loginUrl);
		}

		// Пользователь залогинен - разрешаем доступ
		// Проверка роли будет выполнена в ProtectedRoute через AuthContext
		logger.middleware.accessGranted(
			pathWithoutLocale,
			'authenticated',
			user.id,
			{ requestId }
		);

		// Возвращаем supabaseResponse, который содержит обновленные cookies
		return supabaseResponse;
	} catch (error) {
		logger.middleware.error(error as Error, pathWithoutLocale, {
			requestId,
			operation: 'authCheck',
		});
		// В случае ошибки перенаправляем на страницу логина
		const loginUrl = new URL(`/${urlLocale}/login`, req.url);
		loginUrl.searchParams.set('returnTo', pathname);
		return NextResponse.redirect(loginUrl);
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
