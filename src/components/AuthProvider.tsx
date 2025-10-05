'use client';

import { useEffect, useRef } from 'react';
import { authManager } from '@/lib/auth-unified';

interface AuthProviderProps {
	children: React.ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
	const initialized = useRef(false);

	useEffect(() => {
		// Инициализируем аутентификацию только один раз
		if (!initialized.current) {
			initialized.current = true;
			authManager.initialize();
		}
	}, []);

	return <>{children}</>;
}
