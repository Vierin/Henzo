import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import { apiClient } from '@/lib/api-client';
import { User } from '@/types';
import { logger } from '@/lib/logger';

interface AuthState {
	// User data
	user: User | null;
	session: any | null;
	isLoading: boolean;
	isAuthenticated: boolean;
	isInitialized: boolean;

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
	setSession: (session: any) => void;
	setLoading: (loading: boolean) => void;
	clearUser: () => void;
	initializeForPublicRoute: () => void;
}

export const useAuthStore = create<AuthState>()(
	persist(
		(set, get) => ({
			// Initial state
			user: null,
			session: null,
			isLoading: false,
			isAuthenticated: false,
			isInitialized: false,
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
					isInitialized: true,
				});
			},

			setLoading: (isLoading) => set({ isLoading }),

			setSession: (session) => {
				logger.log('AuthStore setSession called with:', {
					session: session ? 'present' : 'missing',
				});
				set({ session });
			},

			clearUser: () => {
				set({
					user: null,
					session: null,
					isAuthenticated: false,
					isClient: false,
					isOwner: false,
					isAdmin: false,
					isLoading: false,
					isInitialized: true,
				});
			},

			initializeForPublicRoute: () => {
				set({
					isLoading: false,
					isInitialized: true,
				});
			},

			// Client login
			login: async (email, password) => {
				try {
					set({ isLoading: true });

					const result = await apiClient.post<{ session?: any; user?: any }>(
						'/auth/login-client',
						{ email, password }
					);

					// Set Supabase session
					if (result?.session) {
						const { error } = await supabase.auth.setSession(result.session);
						if (error) throw error;
					}

					// Update user in store
					get().setUser(result.user);

					return { success: true };
				} catch (error: unknown) {
					get().clearUser();
					const err = error as {
						message?: string;
						errorData?: { message?: string };
					};
					const errorMessage =
						err?.message || err?.errorData?.message || 'Unknown error occurred';
					return { success: false, error: errorMessage };
				} finally {
					set({ isLoading: false });
				}
			},

			// Client registration
			registerClient: async (data) => {
				try {
					set({ isLoading: true });

					const result = await apiClient.post<{ session?: any; user?: any }>(
						'/auth/register-client',
						data
					);

					if (result?.session) {
						const { error } = await supabase.auth.setSession(result.session);
						if (error) throw error;
					}

					get().setUser(result.user);

					return { success: true };
				} catch (error: unknown) {
					get().clearUser();
					const err = error as {
						message?: string;
						errorData?: { message?: string };
					};
					const errorMessage =
						err?.message || err?.errorData?.message || 'Unknown error occurred';
					return { success: false, error: errorMessage };
				} finally {
					set({ isLoading: false });
				}
			},

			// Logout - оптимизированная версия с быстрой очисткой состояния
			logout: async () => {
				try {
					// Оптимизация: сначала очищаем локальное состояние (мгновенно)
					// Это улучшает UX, так как пользователь сразу видит результат
					get().clearUser();

					// Затем выполняем logout из Supabase в фоне
					// Используем Promise.race для таймаута, чтобы не ждать слишком долго
					const logoutPromise = supabase.auth.signOut();
					const timeoutPromise = new Promise((_, reject) =>
						setTimeout(() => reject(new Error('Logout timeout')), 3000)
					);

					try {
						await Promise.race([logoutPromise, timeoutPromise]);
					} catch (error) {
						// Игнорируем ошибки таймаута - локальное состояние уже очищено
						console.debug('Logout timeout or error (non-critical):', error);
					}
				} catch (error) {
					console.error('Logout error:', error);
					// Clear user even if logout fails
					get().clearUser();
				}
			},

			// Refresh user data from API
			refreshUser: async () => {
				try {
					const result = await apiClient.get<{ user: any }>('/auth/user');
					if (result?.user) get().setUser(result.user);
					else get().clearUser();
				} catch (error) {
					console.error('Error refreshing user:', error);
					get().clearUser();
				}
			},

			// Check authentication on app start (only if not initialized)
			checkAuth: async () => {
				const state = get();
				if (state.isInitialized) return;

				try {
					set({ isLoading: true });

					const {
						data: { session },
					} = await supabase.auth.getSession();
					if (!session?.access_token) {
						get().clearUser();
						return;
					}

					const result = await apiClient.get<{ user: any }>('/auth/user');
					if (result?.user) get().setUser(result.user);
					else {
						console.warn('API not available, keeping current auth state');
					}
				} catch (error) {
					console.error('Auth check error:', error);
				} finally {
					set({ isLoading: false, isInitialized: true });
				}
			},
		}),
		{
			name: 'auth-storage',
			partialize: (state) => ({
				user: state.user,
				session: state.session,
				isAuthenticated: state.isAuthenticated,
				isClient: state.isClient,
				isOwner: state.isOwner,
				isAdmin: state.isAdmin,
				isInitialized: state.isInitialized,
			}),
		}
	)
);
