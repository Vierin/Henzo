'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

interface ProtectedRouteProps {
	children: React.ReactNode;
	allowedRoles?: ('CLIENT' | 'OWNER' | 'ADMIN')[];
	redirectTo?: string;
}

export default function ProtectedRoute({
	children,
	allowedRoles,
	redirectTo = '/login',
}: ProtectedRouteProps) {
	const router = useRouter();
	const { user, isInitialized, isLoading } = useAuthStore();

	useEffect(() => {
		if (!isInitialized || isLoading) {
			return; // Ждем инициализации
		}

		if (!user) {
			// Пользователь не аутентифицирован - делаем редирект на главную
			router.replace('/');
			return;
		}

		if (allowedRoles && !allowedRoles.includes(user.role)) {
			// Пользователь не имеет необходимой роли
			// Перенаправляем на соответствующую dashboard
			switch (user.role) {
				case 'CLIENT':
					router.replace('/dashboard');
					break;
				case 'OWNER':
					router.replace('/owner-dashboard');
					break;
				case 'ADMIN':
					router.replace('/admin-panel');
					break;
				default:
					router.replace('/');
					break;
			}
			return;
		}
	}, [user, isInitialized, isLoading, allowedRoles, router, redirectTo]);

	// Показываем загрузку пока проверяем аутентификацию
	if (!isInitialized || isLoading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff5b5b]"></div>
			</div>
		);
	}

	// Если пользователь не аутентифицирован или не имеет нужной роли, не показываем контент
	if (!user || (allowedRoles && !allowedRoles.includes(user.role))) {
		return null;
	}

	return <>{children}</>;
}
