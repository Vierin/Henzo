import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';

export function useAuthInit() {
	const { checkAuth, isInitialized } = useAuthStore();

	useEffect(() => {
		if (!isInitialized) {
			checkAuth();
		}
	}, [checkAuth, isInitialized]);
}
