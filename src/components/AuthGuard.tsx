'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import LoadingSpinner from './LoadingSpinner';

interface AuthGuardProps {
	children: React.ReactNode;
	requiredRole?: 'CLIENT' | 'OWNER' | 'ADMIN';
	redirectTo?: string;
}

export default function AuthGuard({
	children,
	requiredRole,
	redirectTo = '/',
}: AuthGuardProps) {
	const { user, isAuthenticated, isLoading, isClient, isOwner, isAdmin } =
		useAuthStore();
	const router = useRouter();

	useEffect(() => {
		if (isLoading) return; // Ждем загрузки

		if (!isAuthenticated) {
			// Пользователь не авторизован
			router.push(redirectTo);
			return;
		}

		if (requiredRole) {
			// Проверяем роль пользователя
			const hasRequiredRole =
				(requiredRole === 'CLIENT' && isClient) ||
				(requiredRole === 'OWNER' && isOwner) ||
				(requiredRole === 'ADMIN' && isAdmin);

			if (!hasRequiredRole) {
				// Неправильная роль - перенаправляем на главную
				router.push('/');
				return;
			}
		}
	}, [
		isAuthenticated,
		isLoading,
		isClient,
		isOwner,
		isAdmin,
		requiredRole,
		router,
		redirectTo,
	]);

	// Показываем загрузку пока проверяем авторизацию
	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-[#fff7f6]">
				<LoadingSpinner size="lg" />
			</div>
		);
	}

	// Если не авторизован или неправильная роль, не показываем контент
	if (!isAuthenticated) {
		return null;
	}

	if (requiredRole) {
		const hasRequiredRole =
			(requiredRole === 'CLIENT' && isClient) ||
			(requiredRole === 'OWNER' && isOwner) ||
			(requiredRole === 'ADMIN' && isAdmin);

		if (!hasRequiredRole) {
			return null;
		}
	}

	return <>{children}</>;
}
