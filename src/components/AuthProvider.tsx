'use client';

import { useEffect, useRef } from 'react';
import { authManager } from '@/lib/auth-unified';
import { useAuthStore } from '@/stores/authStore';

interface AuthProviderProps {
	children: React.ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
	const initialized = useRef(false);
	const checkAuth = useAuthStore((state) => state.checkAuth);

	useEffect(() => {
		// Инициализируем обе системы аутентификации только один раз
		if (!initialized.current) {
			initialized.current = true;

			// Initialize auth-unified (для auth hooks)
			authManager.initialize();

			// Initialize authStore (для ProtectedRoute)
			checkAuth();
		}
	}, [checkAuth]);

	return <>{children}</>;
}
