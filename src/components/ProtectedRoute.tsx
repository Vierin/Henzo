'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-unified';
import { hasRouteAccess, getRequiredRole } from '@/config/routes';
import { extractLocaleFromPath, withLocale } from '@/i18n/routing';

interface ProtectedRouteProps {
	children: React.ReactNode;
	allowedRoles?: ('CLIENT' | 'OWNER' | 'ADMIN')[];
	redirectTo?: string;
}

export default function ProtectedRoute({
	children,
	allowedRoles,
	redirectTo,
}: ProtectedRouteProps) {
	const router = useRouter();
	const pathname = usePathname();
	const { user, isLoading, isAuthenticated, isLoggingOut } = useAuth();

	useEffect(() => {
		if (isLoading) {
			return; // Ждем загрузки
		}

		if (!isAuthenticated || !user) {
			// Пользователь не аутентифицирован - редирект на логин
			const locale = extractLocaleFromPath(pathname) ?? 'en';
			const loginPath = withLocale('/login', locale as 'en' | 'ru' | 'vi');
			router.replace(loginPath);
			return;
		}

		// Проверка роли через централизованную конфигурацию
		const currentPath = pathname.replace(/^\/[a-z]{2}/, '') || '/';
		const requiredRole = getRequiredRole(currentPath);
		const hasAccess = hasRouteAccess(
			currentPath,
			user.role as 'CLIENT' | 'OWNER' | 'ADMIN'
		);

		// Если есть явно указанные allowedRoles, проверяем их
		if (allowedRoles && !allowedRoles.includes(user.role)) {
			const locale = extractLocaleFromPath(pathname) ?? 'en';
			// Перенаправляем на соответствующую dashboard
			switch (user.role) {
				case 'CLIENT':
					router.replace(
						withLocale('/dashboard', locale as 'en' | 'ru' | 'vi')
					);
					break;
				case 'OWNER':
					router.replace(
						withLocale('/owner-dashboard', locale as 'en' | 'ru' | 'vi')
					);
					break;
				case 'ADMIN':
					router.replace(
						withLocale('/admin-panel', locale as 'en' | 'ru' | 'vi')
					);
					break;
				default:
					router.replace(withLocale('/', locale as 'en' | 'ru' | 'vi'));
					break;
			}
			return;
		}

		// Проверка через централизованную конфигурацию
		if (requiredRole && !hasAccess) {
			const locale = extractLocaleFromPath(pathname) ?? 'en';
			router.replace(withLocale('/unauthorized', locale as 'en' | 'ru' | 'vi'));
			return;
		}

		// Если указан redirectTo и пользователь имеет доступ, редиректим
		if (redirectTo && hasAccess) {
			const locale = extractLocaleFromPath(pathname) ?? 'en';
			router.replace(withLocale(redirectTo, locale as 'en' | 'ru' | 'vi'));
			return;
		}
	}, [
		user,
		isLoading,
		isAuthenticated,
		allowedRoles,
		router,
		pathname,
		redirectTo,
	]);

	// Оптимистичный рендеринг: показываем UI сразу, данные загружаются в фоне
	// authManager использует кеш, поэтому user будет доступен быстро
	// Не блокируем UI пока идет загрузка - показываем children сразу

	// Если идет выход, показываем контент с легким overlay для плавного перехода
	// Редирект происходит оптимистично, поэтому контент остается видимым
	if (isLoggingOut) {
		return (
			<>
				{children}
				{/* Легкий overlay для визуальной обратной связи */}
				<div className="fixed inset-0 bg-white/30 backdrop-blur-sm z-[9999] pointer-events-none transition-opacity duration-200" />
			</>
		);
	}

	// Если пользователь не аутентифицирован, не показываем контент
	// (редирект на логин уже выполнен в useEffect)
	if (!isAuthenticated || !user) {
		return null;
	}

	// Проверка роли через централизованную конфигурацию
	const currentPath = pathname.replace(/^\/[a-z]{2}/, '') || '/';
	const requiredRole = getRequiredRole(currentPath);
	const hasAccess = hasRouteAccess(
		currentPath,
		user.role as 'CLIENT' | 'OWNER' | 'ADMIN'
	);

	// Если есть явно указанные allowedRoles, проверяем их
	if (allowedRoles && !allowedRoles.includes(user.role)) {
		return null; // Редирект уже выполнен в useEffect
	}

	// Проверка через централизованную конфигурацию
	if (requiredRole && !hasAccess) {
		return null; // Редирект уже выполнен в useEffect
	}

	return <>{children}</>;
}
