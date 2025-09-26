'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

export default function AuthProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const { initializeForPublicRoute } = useAuthStore();
	const pathname = usePathname();

	// Публичные маршруты, которые не требуют проверки аутентификации
	const publicRoutes = [
		'/',
		'/login',
		'/register',
		'/salons',
		'/salon',
		'/about',
		'/contact',
		'/forgot-password',
		'/reset-password',
		'/verify',
	];

	useEffect(() => {
		// Проверяем, является ли текущий маршрут публичным
		const isPublicRoute = publicRoutes.some((route) =>
			pathname.startsWith(route)
		);

		// Для публичных страниц просто инициализируем без проверки
		if (isPublicRoute) {
			initializeForPublicRoute();
		}
	}, [pathname, initializeForPublicRoute]);

	return <>{children}</>;
}
