'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-unified';
import { hasRouteAccess, getRequiredRole } from '@/config/routes';
import { extractLocaleFromPath, withLocale } from '@/i18n/routing';
import { logger } from '@/lib/logger';

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
	const { user, isLoading, isAuthenticated } = useAuth();
	const [isWaitingForUser, setIsWaitingForUser] = useState(false);
	const waitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const checkAttemptsRef = useRef(0);
	const maxWaitTime = 3000; // Максимальное время ожидания: 3 секунды
	const checkInterval = 100; // Проверяем каждые 100ms

	useEffect(() => {
		// Очищаем предыдущий таймаут
		if (waitTimeoutRef.current) {
			clearTimeout(waitTimeoutRef.current);
			waitTimeoutRef.current = null;
		}

		// Логирование для отладки
		console.log('[ProtectedRoute] useEffect triggered:', {
			isLoading,
			isAuthenticated,
			hasUser: !!user,
			userRole: user?.role,
			userId: user?.id,
			pathname,
			isWaitingForUser,
			checkAttempts: checkAttemptsRef.current,
			allowedRoles,
		});

		// Ждем загрузки - не делаем редирект пока загружается
		if (isLoading) {
			console.log('[ProtectedRoute] Waiting for auth to load...');
			setIsWaitingForUser(false);
			checkAttemptsRef.current = 0;
			return; // Ждем загрузки
		}

		// Если isAuthenticated = true, но user = null, значит данные еще загружаются
		// Даем дополнительное время для загрузки данных пользователя
		if (isAuthenticated && !user) {
			checkAttemptsRef.current++;
			const elapsedTime = checkAttemptsRef.current * checkInterval;

			console.log(
				'[ProtectedRoute] Authenticated but user not loaded yet, waiting...',
				{
					attempt: checkAttemptsRef.current,
					elapsedTime,
					maxWaitTime,
				}
			);

			if (elapsedTime < maxWaitTime) {
				// Продолжаем ждать
				setIsWaitingForUser(true);
				waitTimeoutRef.current = setTimeout(() => {
					// Триггерим повторную проверку через обновление состояния
					setIsWaitingForUser(false);
				}, checkInterval);
				return;
			} else {
				// Превысили максимальное время ожидания
				console.warn(
					'[ProtectedRoute] Max wait time exceeded, user still not loaded'
				);
				setIsWaitingForUser(false);
			}
		} else {
			// Данные загружены или пользователь не аутентифицирован
			setIsWaitingForUser(false);
			checkAttemptsRef.current = 0;
		}

		// Не проверяем доступ пока ждем загрузки пользователя
		if (isWaitingForUser) {
			return;
		}

		if (!isAuthenticated || !user) {
			// Пользователь не аутентифицирован - редирект на логин
			console.log('[ProtectedRoute] Not authenticated, redirecting to login');
			const locale = extractLocaleFromPath(pathname) ?? 'en';
			const loginPath = withLocale('/login', locale as 'en' | 'ru' | 'vi');
			router.replace(loginPath);
			logger.debug('[ProtectedRoute] Redirecting to login', {
				path: pathname,
				reason: 'Not authenticated',
			});
			return;
		}

		// Проверка роли через централизованную конфигурацию
		const currentPath = pathname.replace(/^\/[a-z]{2}/, '') || '/';
		const requiredRole = getRequiredRole(currentPath);
		const hasAccess = hasRouteAccess(
			currentPath,
			user.role as 'CLIENT' | 'OWNER' | 'ADMIN'
		);

		console.log('[ProtectedRoute] Access check:', {
			currentPath,
			requiredRole,
			userRole: user.role,
			hasAccess,
		});

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
			logger.debug('[ProtectedRoute] Redirecting due to role mismatch', {
				path: pathname,
				userRole: user.role,
				allowedRoles,
			});
			return;
		}

		// Проверка через централизованную конфигурацию
		if (requiredRole && !hasAccess) {
			const locale = extractLocaleFromPath(pathname) ?? 'en';
			router.replace(withLocale('/unauthorized', locale as 'en' | 'ru' | 'vi'));
			logger.debug('[ProtectedRoute] Access denied', {
				path: pathname,
				userRole: user.role,
				requiredRole,
			});
			return;
		}

		// Если указан redirectTo и пользователь имеет доступ, редиректим
		if (redirectTo && hasAccess) {
			const locale = extractLocaleFromPath(pathname) ?? 'en';
			router.replace(withLocale(redirectTo, locale as 'en' | 'ru' | 'vi'));
			return;
		}
		return () => {
			if (waitTimeoutRef.current) {
				clearTimeout(waitTimeoutRef.current);
			}
		};
	}, [
		user,
		isLoading,
		isAuthenticated,
		allowedRoles,
		router,
		pathname,
		redirectTo,
		isWaitingForUser,
	]);

	// Показываем загрузку пока проверяем аутентификацию
	// Важно: ждем не только isLoading, но и проверяем, что user загружен
	if (isLoading || (isAuthenticated && !user) || isWaitingForUser) {
		console.log('[ProtectedRoute] Rendering loading state:', {
			isLoading,
			isAuthenticated,
			hasUser: !!user,
			isWaitingForUser,
		});
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff5b5b]"></div>
			</div>
		);
	}

	// Если пользователь не аутентифицирован, не показываем контент
	// (редирект на логин уже выполнен в useEffect)
	if (!isAuthenticated || !user) {
		console.log('[ProtectedRoute] Rendering null (not authenticated):', {
			isAuthenticated,
			hasUser: !!user,
		});
		return null;
	}

	// Проверка роли через централизованную конфигурацию
	const currentPath = pathname.replace(/^\/[a-z]{2}/, '') || '/';
	const requiredRole = getRequiredRole(currentPath);
	const hasAccess = hasRouteAccess(
		currentPath,
		user.role as 'CLIENT' | 'OWNER' | 'ADMIN'
	);

	console.log('[ProtectedRoute] Final render check:', {
		currentPath,
		requiredRole,
		userRole: user.role,
		hasAccess,
		allowedRoles,
		allowedRolesCheck: allowedRoles ? allowedRoles.includes(user.role) : 'N/A',
	});

	// Если есть явно указанные allowedRoles, проверяем их
	if (allowedRoles && !allowedRoles.includes(user.role)) {
		console.log('[ProtectedRoute] Rendering null (role not in allowedRoles)');
		return null; // Редирект уже выполнен в useEffect
	}

	// Проверка через централизованную конфигурацию
	if (requiredRole && !hasAccess) {
		console.log('[ProtectedRoute] Rendering null (no access to route)');
		return null; // Редирект уже выполнен в useEffect
	}

	console.log('[ProtectedRoute] Rendering children - access granted');
	return <>{children}</>;
}
