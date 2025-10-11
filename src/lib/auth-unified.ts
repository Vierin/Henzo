// Унифицированная система аутентификации для MVP
import { supabase } from './supabase';
import { apiClient } from './api-client';
import { useAuthStore } from '@/stores/authStore';

export interface User {
	id: string;
	email: string;
	name?: string;
	phone?: string;
	role: 'CLIENT' | 'OWNER' | 'ADMIN';
	createdAt: string;
}

export interface AuthState {
	user: User | null;
	isLoading: boolean;
	isAuthenticated: boolean;
}

class AuthManager {
	private static instance: AuthManager;
	private authState: AuthState = {
		user: null,
		isLoading: false,
		isAuthenticated: false,
	};
	private listeners: Set<(state: AuthState) => void> = new Set();

	static getInstance(): AuthManager {
		if (!AuthManager.instance) {
			AuthManager.instance = new AuthManager();
		}
		return AuthManager.instance;
	}

	private notifyListeners() {
		this.listeners.forEach((listener) => listener(this.authState));
	}

	private setState(newState: Partial<AuthState>) {
		const prevState = this.authState;
		const nextState = { ...this.authState, ...newState };

		// Проверяем, действительно ли состояние изменилось
		if (
			prevState.user?.id === nextState.user?.id &&
			prevState.isAuthenticated === nextState.isAuthenticated &&
			prevState.isLoading === nextState.isLoading
		) {
			return; // Не обновляем если состояние не изменилось
		}

		this.authState = nextState;
		this.notifyListeners();

		// Синхронизируем с authStore
		if (nextState.user) {
			useAuthStore.getState().setUser(nextState.user as any);
		} else {
			useAuthStore.getState().clearUser();
		}
	}

	subscribe(listener: (state: AuthState) => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	getCurrentState(): AuthState {
		return this.authState;
	}

	async login(
		email: string,
		password: string
	): Promise<{ success: boolean; error?: string }> {
		try {
			this.setState({ isLoading: true });

			// 1. Аутентификация через Supabase
			const { data, error } = await supabase.auth.signInWithPassword({
				email,
				password,
			});

			if (error) throw error;

			// 2. Получение роли из API (кешируется в localStorage)
			const user = await this.fetchUserWithRole(data.session.access_token);

			this.setState({
				user,
				isAuthenticated: true,
				isLoading: false,
			});

			// 3. Кеширование в localStorage
			localStorage.setItem('auth_user', JSON.stringify(user));

			return { success: true };
		} catch (error) {
			this.setState({
				user: null,
				isAuthenticated: false,
				isLoading: false,
			});
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Login failed',
			};
		}
	}

	async registerClient(data: {
		email: string;
		password: string;
		name?: string;
		phone?: string;
	}): Promise<{ success: boolean; error?: string }> {
		try {
			this.setState({ isLoading: true });

			// 1. Регистрация через Supabase
			const { data: authData, error } = await supabase.auth.signUp({
				email: data.email,
				password: data.password,
				options: {
					data: {
						name: data.name,
						phone: data.phone,
						role: 'CLIENT',
					},
				},
			});

			if (error) throw error;

			// 2. Создание пользователя в API
			if (authData.user) {
				await apiClient.post('/auth/register-client', {
					userId: authData.user.id,
					email: data.email,
					name: data.name,
					phone: data.phone,
					role: 'CLIENT',
				});
			}

			this.setState({ isLoading: false });
			return { success: true };
		} catch (error) {
			this.setState({ isLoading: false });
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Registration failed',
			};
		}
	}

	async registerOwner(data: {
		email: string;
		password: string;
		name?: string;
		inviteCode?: string;
		fromInviteLink?: boolean;
	}): Promise<{ success: boolean; error?: string; emailConfirmed?: boolean }> {
		try {
			this.setState({ isLoading: true });

			let authData: any = null;
			let emailConfirmed = false;

			// Если регистрация из инвайт-ссылки - backend создаст пользователя через Admin API
			if (data.fromInviteLink) {
				// Отправляем запрос напрямую на backend с паролем
				const response = await apiClient.post<{
					user: any;
					inviteCodeId?: string;
					emailConfirmed?: boolean;
				}>('/auth/register', {
					userId: null, // Backend создаст нового пользователя
					email: data.email,
					password: data.password,
					inviteCode: data.inviteCode,
					name: data.name,
					role: 'OWNER',
					fromInviteLink: true,
				});

				// Сохраняем inviteCodeId
				if (response.inviteCodeId) {
					sessionStorage.setItem('inviteCodeId', response.inviteCodeId);
				}

				emailConfirmed = response.emailConfirmed || false;

				// Логиним пользователя
				const { data: signInData, error: signInError } =
					await supabase.auth.signInWithPassword({
						email: data.email,
						password: data.password,
					});

				if (signInError) throw signInError;

				if (signInData.session) {
					// Используем данные пользователя из ответа backend вместо дополнительного запроса
					this.setState({
						user: response.user,
						isAuthenticated: true,
						isLoading: false,
					});

					localStorage.setItem('auth_user', JSON.stringify(response.user));
				}
			} else {
				// Обычная регистрация через Supabase signUp
				const { data: signUpData, error } = await supabase.auth.signUp({
					email: data.email,
					password: data.password,
					options: {
						data: {
							name: data.name,
							role: 'OWNER',
						},
						emailRedirectTo: `${window.location.origin}/auth/callback?type=business`,
					},
				});

				if (error) throw error;

				authData = signUpData;

				// Создание пользователя в API с инвайт-кодом
				if (authData.user) {
					const response = await apiClient.post<{
						user: any;
						inviteCodeId?: string;
						emailConfirmed?: boolean;
					}>('/auth/register', {
						userId: authData.user.id,
						email: data.email,
						inviteCode: data.inviteCode,
						name: data.name,
						role: 'OWNER',
						fromInviteLink: false,
					});

					// Сохраняем inviteCodeId для использования при создании салона
					if (response.inviteCodeId) {
						sessionStorage.setItem('inviteCodeId', response.inviteCodeId);
					}
				}
			}

			this.setState({ isLoading: false });
			return { success: true, emailConfirmed };
		} catch (error) {
			this.setState({ isLoading: false });
			console.error('❌ Owner registration error:', error);
			const errorMessage =
				error instanceof Error ? error.message : 'Registration failed';
			console.error('❌ Error message to display:', errorMessage);
			return {
				success: false,
				error: errorMessage,
			};
		}
	}

	async logout(): Promise<void> {
		try {
			await supabase.auth.signOut();
			localStorage.removeItem('auth_user');
			this.setState({
				user: null,
				isAuthenticated: false,
				isLoading: false,
			});
		} catch (error) {
			console.error('Logout error:', error);
			// Принудительная очистка даже при ошибке
			this.setState({
				user: null,
				isAuthenticated: false,
				isLoading: false,
			});
		}
	}

	async initialize(): Promise<void> {
		// Защита от повторной инициализации
		if (this.authState.isLoading) {
			return;
		}

		try {
			this.setState({ isLoading: true });

			// 1. Проверка кеша
			const cachedUser = localStorage.getItem('auth_user');
			if (cachedUser) {
				const user = JSON.parse(cachedUser);
				this.setState({
					user,
					isAuthenticated: true,
					isLoading: false,
				});
				return;
			}

			// 2. Проверка Supabase сессии
			const {
				data: { session },
			} = await supabase.auth.getSession();
			if (!session?.access_token) {
				this.setState({
					user: null,
					isAuthenticated: false,
					isLoading: false,
				});
				return;
			}

			// 3. Получение актуальных данных пользователя
			const user = await this.fetchUserWithRole(session.access_token);
			this.setState({
				user,
				isAuthenticated: true,
				isLoading: false,
			});

			// 4. Обновление кеша
			localStorage.setItem('auth_user', JSON.stringify(user));
		} catch (error) {
			console.error('Auth initialization error:', error);
			this.setState({
				user: null,
				isAuthenticated: false,
				isLoading: false,
			});
		}
	}

	private async fetchUserWithRole(accessToken: string): Promise<User> {
		try {
			const response = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/user`,
				{
					headers: {
						Authorization: `Bearer ${accessToken}`,
					},
				}
			);

			if (!response.ok) {
				throw new Error('Failed to fetch user data');
			}

			const result = await response.json();
			return result.user;
		} catch (error) {
			console.error('Error fetching user role:', error);
			throw error;
		}
	}

	// Проверка ролей (кешированные)
	hasRole(role: 'CLIENT' | 'OWNER' | 'ADMIN'): boolean {
		return this.authState.user?.role === role;
	}

	isClient(): boolean {
		return this.hasRole('CLIENT');
	}

	isOwner(): boolean {
		return this.hasRole('OWNER');
	}

	isAdmin(): boolean {
		return this.hasRole('ADMIN');
	}

	canAccessRoute(route: string): boolean {
		const { user, isAuthenticated } = this.authState;

		if (!isAuthenticated || !user) {
			// Публичные маршруты
			return [
				'/',
				'/login',
				'/register',
				'/salons',
				'/salon',
				'/category',
				'/about',
				'/contact',
			].some((publicRoute) => route.startsWith(publicRoute));
		}

		// Защищенные маршруты
		if (route.startsWith('/client')) {
			return user.role === 'CLIENT';
		}

		if (route.startsWith('/owner') || route.startsWith('/business')) {
			return user.role === 'OWNER';
		}

		if (route.startsWith('/admin')) {
			return user.role === 'ADMIN';
		}

		return true;
	}
}

export const authManager = AuthManager.getInstance();

// React Hook для использования в компонентах
import { useState, useEffect, useCallback, useMemo } from 'react';

export function useAuth() {
	const [authState, setAuthState] = useState<AuthState>(
		authManager.getCurrentState()
	);

	// Стабильная функция для обновления состояния
	const handleStateChange = useCallback((newState: AuthState) => {
		setAuthState((prevState) => {
			// Проверяем, действительно ли состояние изменилось
			if (
				prevState.user?.id === newState.user?.id &&
				prevState.isAuthenticated === newState.isAuthenticated &&
				prevState.isLoading === newState.isLoading
			) {
				return prevState; // Возвращаем старое состояние если ничего не изменилось
			}
			return newState;
		});
	}, []);

	useEffect(() => {
		const unsubscribe = authManager.subscribe(handleStateChange);
		return unsubscribe;
	}, [handleStateChange]);

	// Мемоизируем методы чтобы избежать пересоздания
	const methods = useMemo(
		() => ({
			login: authManager.login.bind(authManager),
			registerClient: authManager.registerClient.bind(authManager),
			registerOwner: authManager.registerOwner.bind(authManager),
			logout: authManager.logout.bind(authManager),
			initialize: authManager.initialize.bind(authManager),
			hasRole: authManager.hasRole.bind(authManager),
			isClient: authManager.isClient.bind(authManager),
			isOwner: authManager.isOwner.bind(authManager),
			isAdmin: authManager.isAdmin.bind(authManager),
			canAccessRoute: authManager.canAccessRoute.bind(authManager),
		}),
		[]
	);

	return {
		...authState,
		...methods,
	};
}
