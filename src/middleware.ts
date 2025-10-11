import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

export async function middleware(req: NextRequest) {
	const { pathname } = req.nextUrl;
	const res = NextResponse.next();

	// Создаем Supabase клиент для middleware
	const supabase = createMiddlewareClient({ req, res });

	// Публичные маршруты
	const publicRoutes = [
		'/',
		'/login',
		'/register',
		'/salons',
		'/category',
		'/salon',
		'/about',
		'/contact',
		'/api',
		'/auth',
		'/verify',
		'/check-email',
		'/business',
		'/terms-of-service',
		'/privacy-policy',
	];

	// Проверяем, является ли маршрут публичным
	const isPublicRoute = publicRoutes.some((route) =>
		pathname.startsWith(route)
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
			return NextResponse.redirect(new URL('/', req.url));
		}

		// Проверяем роль пользователя для специфичных маршрутов
		const userRole = session.user?.user_metadata?.role;

		if (pathname.startsWith('/client') && userRole !== 'CLIENT') {
			return NextResponse.redirect(new URL('/unauthorized', req.url));
		}

		if (
			(pathname.startsWith('/owner') || pathname.startsWith('/business')) &&
			userRole !== 'OWNER'
		) {
			return NextResponse.redirect(new URL('/unauthorized', req.url));
		}

		if (pathname.startsWith('/admin') && userRole !== 'ADMIN') {
			return NextResponse.redirect(new URL('/unauthorized', req.url));
		}

		return res;
	} catch (error) {
		console.error('Middleware auth error:', error);
		// В случае ошибки перенаправляем на главную страницу
		return NextResponse.redirect(new URL('/', req.url));
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
