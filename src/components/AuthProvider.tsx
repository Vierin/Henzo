'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const { checkAuth, setUser, clearUser } = useAuthStore();

	useEffect(() => {
		// Check auth on mount
		checkAuth();

		// Listen for auth state changes
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((event, session) => {
			if (event === 'SIGNED_IN' && session) {
				// User signed in, refresh user data
				checkAuth();
			} else if (event === 'SIGNED_OUT') {
				// User signed out, clear user data
				clearUser();
			}
		});

		return () => subscription.unsubscribe();
	}, [checkAuth, clearUser]);

	return <>{children}</>;
}
