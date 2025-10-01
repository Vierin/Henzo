import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
	// Упрощенный middleware без Supabase проверки
	// Проверка аутентификации будет происходить на клиентской стороне

	const { pathname } = req.nextUrl;

	// Публичные маршруты, которые не требуют аутентификации
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
	];

	// Проверяем, является ли маршрут публичным
	const isPublicRoute = publicRoutes.some((route) =>
		pathname.startsWith(route)
	);

	// Для упрощения, разрешаем доступ ко всем маршрутам
	// Защита будет происходить на уровне компонентов
	return NextResponse.next();
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
