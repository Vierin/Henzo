'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-unified';
import LoadingSpinner from './LoadingSpinner';

interface RouteGuardProps {
	children: React.ReactNode;
	requiredRole?: 'CLIENT' | 'OWNER' | 'ADMIN';
	fallbackUrl?: string;
}

export default function RouteGuard({
	children,
	requiredRole,
	fallbackUrl = '/',
}: RouteGuardProps) {
	const { isAuthenticated, isLoading, user } = useAuth();
	const router = useRouter();
	const pathname = usePathname();

	// Инициализация происходит в AuthProvider

	useEffect(() => {
		if (isLoading) return;

		// Проверяем аутентификацию
		if (!isAuthenticated) {
			const redirectUrl = new URL('/login', window.location.origin);
			redirectUrl.searchParams.set('redirect', pathname);
			router.push(redirectUrl.toString());
			return;
		}

		// Проверяем роль
		if (requiredRole && user?.role !== requiredRole) {
			router.push('/unauthorized');
			return;
		}
	}, [isAuthenticated, isLoading, user, requiredRole, router, pathname]);

	// Показываем загрузку
	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<LoadingSpinner size="lg" />
			</div>
		);
	}

	// Показываем содержимое только если пользователь аутентифицирован и имеет нужную роль
	if (isAuthenticated && (!requiredRole || user?.role === requiredRole)) {
		return <>{children}</>;
	}

	// Возвращаем null во время редиректа
	return null;
}

// Специализированные компоненты для разных ролей
export function ClientRouteGuard({ children }: { children: React.ReactNode }) {
	return <RouteGuard requiredRole="CLIENT">{children}</RouteGuard>;
}

export function OwnerRouteGuard({ children }: { children: React.ReactNode }) {
	return <RouteGuard requiredRole="OWNER">{children}</RouteGuard>;
}

export function AdminRouteGuard({ children }: { children: React.ReactNode }) {
	return <RouteGuard requiredRole="ADMIN">{children}</RouteGuard>;
}
