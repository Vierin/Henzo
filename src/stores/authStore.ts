import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';

export interface User {
	id: string;
	email: string;
	name?: string;
	phone?: string;
	role: 'OWNER' | 'ADMIN' | 'CLIENT';
}

interface AuthState {
	// User data
	user: User | null;
	isLoading: boolean;
	isAuthenticated: boolean;

	// Role-based flags
	isClient: boolean;
	isOwner: boolean;
	isAdmin: boolean;

	// Actions
	login: (
		email: string,
		password: string
	) => Promise<{ success: boolean; error?: string }>;
	registerClient: (data: {
		email: string;
		password: string;
		name?: string;
		phone?: string;
	}) => Promise<{ success: boolean; error?: string }>;
	logout: () => Promise<void>;
	refreshUser: () => Promise<void>;
	checkAuth: () => Promise<void>;

	// Internal actions
	setUser: (user: User | null) => void;
	setLoading: (loading: boolean) => void;
	clearUser: () => void;
}

export const useAuthStore = create<AuthState>()(
	persist(
		(set, get) => ({
			// Initial state
			user: null,
			isLoading: true,
			isAuthenticated: false,
			isClient: false,
			isOwner: false,
			isAdmin: false,

			// Set user and update role flags
			setUser: (user) => {
				const isClient = user?.role === 'CLIENT';
				const isOwner = user?.role === 'OWNER';
				const isAdmin = user?.role === 'ADMIN';

				set({
					user,
					isAuthenticated: !!user,
					isClient,
					isOwner,
					isAdmin,
					isLoading: false,
				});
			},

			setLoading: (isLoading) => set({ isLoading }),

			clearUser: () => {
				set({
					user: null,
					isAuthenticated: false,
					isClient: false,
					isOwner: false,
					isAdmin: false,
					isLoading: false,
				});
			},

			// Client login
			login: async (email, password) => {
				try {
					set({ isLoading: true });

					const API_BASE_URL =
						process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
					const response = await fetch(`${API_BASE_URL}/auth/login-client`, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({ email, password }),
					});

					const result = await response.json();

					if (!response.ok) {
						throw new Error(result.message || 'Login failed');
					}

					// Set Supabase session
					if (result.session) {
						const { error } = await supabase.auth.setSession(result.session);
						if (error) throw error;
					}

					// Update user in store
					get().setUser(result.user);

					return { success: true };
				} catch (error: unknown) {
					get().clearUser();
					const errorMessage =
						error instanceof Error ? error.message : 'Unknown error occurred';
					return { success: false, error: errorMessage };
				} finally {
					set({ isLoading: false });
				}
			},

			// Client registration
			registerClient: async (data) => {
				try {
					set({ isLoading: true });

					const API_BASE_URL =
						process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
					const response = await fetch(`${API_BASE_URL}/auth/register-client`, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify(data),
					});

					const result = await response.json();

					if (!response.ok) {
						throw new Error(result.message || 'Registration failed');
					}

					// Set Supabase session
					if (result.session) {
						const { error } = await supabase.auth.setSession(result.session);
						if (error) throw error;
					}

					// Update user in store
					get().setUser(result.user);

					return { success: true };
				} catch (error: unknown) {
					get().clearUser();
					const errorMessage =
						error instanceof Error ? error.message : 'Unknown error occurred';
					return { success: false, error: errorMessage };
				} finally {
					set({ isLoading: false });
				}
			},

			// Logout
			logout: async () => {
				try {
					await supabase.auth.signOut();
					get().clearUser();
				} catch (error) {
					console.error('Logout error:', error);
					// Clear user even if logout fails
					get().clearUser();
				}
			},

			// Refresh user data from API
			refreshUser: async () => {
				try {
					const {
						data: { session },
					} = await supabase.auth.getSession();

					if (!session?.access_token) {
						get().clearUser();
						return;
					}

					const API_BASE_URL =
						process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
					const response = await fetch(`${API_BASE_URL}/auth/user`, {
						headers: {
							Authorization: `Bearer ${session.access_token}`,
						},
					});

					if (!response.ok) {
						get().clearUser();
						return;
					}

					const result = await response.json();
					get().setUser(result.user);
				} catch (error) {
					console.error('Error refreshing user:', error);
					get().clearUser();
				}
			},

			// Check authentication on app start
			checkAuth: async () => {
				try {
					set({ isLoading: true });

					const {
						data: { session },
					} = await supabase.auth.getSession();

					if (!session?.access_token) {
						get().clearUser();
						return;
					}

					// Get user data from API
					const API_BASE_URL =
						process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

					const response = await fetch(`${API_BASE_URL}/auth/user`, {
						headers: {
							Authorization: `Bearer ${session.access_token}`,
						},
					});

					if (!response.ok) {
						get().clearUser();
						return;
					}

					const result = await response.json();
					get().setUser(result.user);
				} catch (error) {
					console.error('Auth check error:', error);
					get().clearUser();
				} finally {
					set({ isLoading: false });
				}
			},
		}),
		{
			name: 'auth-storage',
			partialize: (state) => ({
				user: state.user,
				isAuthenticated: state.isAuthenticated,
				isClient: state.isClient,
				isOwner: state.isOwner,
				isAdmin: state.isAdmin,
			}),
		}
	)
);
