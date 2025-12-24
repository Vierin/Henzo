import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-unified';
import { extractLocaleFromPath, withLocale } from '@/i18n/routing';

interface UseAuthRedirectOptions {
	requiredRole?: 'ADMIN' | 'OWNER' | 'CLIENT';
	redirectTo?: string;
	redirectIfAuthenticated?: boolean;
}

export function useAuthRedirect(options: UseAuthRedirectOptions = {}) {
	const { requiredRole, redirectTo, redirectIfAuthenticated = false } = options;
	const router = useRouter();
	const { user, isAuthenticated, isLoading } = useAuth();

	useEffect(() => {
		if (isLoading) return;

		const pathname = window.location.pathname;
		const locale = extractLocaleFromPath(pathname) ?? 'en';

		// Redirect if authenticated and redirectIfAuthenticated is true
		if (redirectIfAuthenticated && isAuthenticated && user) {
			const defaultRedirect = '/dashboard';
			router.push(withLocale(redirectTo || defaultRedirect, locale as 'en' | 'ru' | 'vi'));
			return;
		}

		// Redirect if not authenticated
		if (!isAuthenticated || !user) {
			if (redirectTo) {
				router.push(withLocale(redirectTo, locale as 'en' | 'ru' | 'vi'));
			} else {
				router.push(withLocale('/login', locale as 'en' | 'ru' | 'vi'));
			}
			return;
		}

		// Check role if required
		if (requiredRole && user.role !== requiredRole) {
			// Redirect based on user role
			switch (user.role) {
				case 'ADMIN':
					router.push(withLocale('/admin-panel', locale as 'en' | 'ru' | 'vi'));
					break;
				case 'OWNER':
					router.push(withLocale('/owner-dashboard', locale as 'en' | 'ru' | 'vi'));
					break;
				case 'CLIENT':
					router.push(withLocale('/dashboard', locale as 'en' | 'ru' | 'vi'));
					break;
				default:
					router.push(withLocale('/', locale as 'en' | 'ru' | 'vi'));
			}
		}
	}, [isAuthenticated, user, isLoading, requiredRole, redirectTo, redirectIfAuthenticated, router]);
}

