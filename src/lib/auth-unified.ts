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
		// Важно: проверяем не только id, но и роль пользователя
		const userChanged =
			prevState.user?.id !== nextState.user?.id ||
			prevState.user?.role !== nextState.user?.role;
		const authChanged = prevState.isAuthenticated !== nextState.isAuthenticated;
		const loadingChanged = prevState.isLoading !== nextState.isLoading;

		if (!userChanged && !authChanged && !loadingChanged) {
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
			// Supabase автоматически управляет access_token и refresh_token
			const { data, error } = await supabase.auth.signInWithPassword({
				email,
				password,
			});

			if (error) {
				throw error;
			}

			if (!data.session) {
				throw new Error('No session returned');
			}

			// 2. Получение роли из API
			const user = await this.fetchUserWithRole(data.session.access_token);

			this.setState({
				user,
				isAuthenticated: true,
				isLoading: false,
			});

			// 3. Кеширование в localStorage
			localStorage.setItem('auth_user', JSON.stringify(user));

			// 4. Настройка автоматического обновления токена
			this.setupTokenRefresh();

			return { success: true };
		} catch (error) {
			this.setState({
				user: null,
				isAuthenticated: false,
				isLoading: false,
			});
			const errorMessage =
				error instanceof Error ? error.message : 'Login failed';
			return {
				success: false,
				error: errorMessage,
			};
		}
	}

	async registerClient(data: {
		email: string;
		password: string;
		name?: string;
		phone?: string;
	}): Promise<{ success: boolean; error?: string; emailConfirmed?: boolean }> {
		try {
			this.setState({ isLoading: true });

			// Отправляем данные на бэкенд, который создаст пользователя в Supabase и БД
			const response = await apiClient.post<{
				user: any;
				session: any;
				emailConfirmed?: boolean;
			}>('/auth/register-client', {
				email: data.email,
				password: data.password,
				name: data.name,
				phone: data.phone,
			});

			// Если есть сессия, устанавливаем пользователя
			if (response.session) {
				this.setState({
					user: response.user,
					isAuthenticated: true,
					isLoading: false,
				});
				localStorage.setItem('auth_user', JSON.stringify(response.user));
			} else {
				this.setState({ isLoading: false });
			}

			return { 
				success: true, 
				emailConfirmed: response.emailConfirmed || false 
			};
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
		magicLinkToken?: string;
	}): Promise<{ success: boolean; error?: string; emailConfirmed?: boolean }> {
		try {
			this.setState({ isLoading: true });

			let authData: any = null;
			let emailConfirmed = false;

			// Если регистрация из magic link - backend создаст пользователя через Admin API
			if (data.magicLinkToken) {
				// Отправляем запрос напрямую на backend с паролем
				const response = await apiClient.post<{
					user: any;
					emailConfirmed?: boolean;
				}>('/auth/register', {
					userId: null, // Backend создаст нового пользователя
					email: data.email,
					password: data.password,
					magicLinkToken: data.magicLinkToken,
					name: data.name,
					role: 'OWNER',
				});

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
				const frontendUrl =
					process.env.NEXT_PUBLIC_FRONTEND_URL || window.location.origin;
				const { data: signUpData, error } = await supabase.auth.signUp({
					email: data.email,
					password: data.password,
					options: {
						data: {
							name: data.name,
							role: 'OWNER',
						},
						emailRedirectTo: `${frontendUrl}/auth/callback?type=business`,
					},
				});

				if (error) throw error;

				authData = signUpData;

				// Создание пользователя в API
				if (authData.user) {
					const response = await apiClient.post<{
						user: any;
						emailConfirmed?: boolean;
					}>('/auth/register', {
						userId: authData.user.id,
						email: data.email,
						magicLinkToken: (data as any).magicLinkToken,
						name: data.name,
						role: 'OWNER',
					});
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
			const userId = this.authState.user?.id;
			await supabase.auth.signOut();
			localStorage.removeItem('auth_user');
			this.setState({
				user: null,
				isAuthenticated: false,
				isLoading: false,
			});
			this.clearTokenRefresh();
		} catch (error) {
			// Принудительная очистка даже при ошибке
			this.setState({
				user: null,
				isAuthenticated: false,
				isLoading: false,
			});
			this.clearTokenRefresh();
		}
	}

	async initialize(): Promise<void> {
		// Защита от повторной инициализации
		if (this.authState.isLoading) {
			return;
		}

		try {
			this.setState({ isLoading: true });

			// 1. Проверка Supabase сессии (приоритет над кешем)
			// Supabase автоматически обновляет токен если он истек
			const {
				data: { session },
				error: sessionError,
			} = await supabase.auth.getSession();

			if (sessionError || !session?.access_token) {
				// Нет валидной сессии, очищаем кеш
				localStorage.removeItem('auth_user');
				this.setState({
					user: null,
					isAuthenticated: false,
					isLoading: false,
				});
				this.clearTokenRefresh();
				return;
			}

			// 2. Проверка кеша (для быстрой загрузки)
			const cachedUser = localStorage.getItem('auth_user');
			if (cachedUser) {
				try {
					const user = JSON.parse(cachedUser);
					// Проверяем, что кешированный пользователь соответствует текущей сессии
					if (user.id === session.user.id) {
						this.setState({
							user,
							isAuthenticated: true,
							isLoading: false,
						});
						// Настраиваем обновление токена
						this.setupTokenRefresh();
						// Обновляем данные пользователя в фоне
						this.refreshUserData(session.access_token).catch(() => {
							// Игнорируем ошибки фонового обновления
						});
						return;
					}
				} catch (e) {
					// Ошибка парсинга кеша, продолжаем загрузку
				}
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

			// 5. Настройка автоматического обновления токена
			this.setupTokenRefresh();
		} catch (error) {
			this.setState({
				user: null,
				isAuthenticated: false,
				isLoading: false,
			});
			this.clearTokenRefresh();
		}
	}

	/**
	 * Настройка автоматического обновления токена
	 * Supabase автоматически обновляет токен, но мы слушаем события для обновления состояния
	 */
	private tokenRefreshInterval: NodeJS.Timeout | null = null;

	private setupTokenRefresh(): void {
		// Очищаем предыдущий интервал если есть
		this.clearTokenRefresh();

		// Слушаем события изменения сессии от Supabase
		// НЕ обновляем данные при TOKEN_REFRESHED, чтобы избежать бесконечных циклов
		supabase.auth.onAuthStateChange((event, session) => {
			if (event === 'TOKEN_REFRESHED' && session) {
				// НЕ вызываем refreshUserData здесь - это создает бесконечный цикл
				// Supabase автоматически обновляет токен, роль уже в app_metadata
			} else if (event === 'SIGNED_OUT') {
				this.setState({
					user: null,
					isAuthenticated: false,
					isLoading: false,
				});
				localStorage.removeItem('auth_user');
				this.clearTokenRefresh();
			}
		});

		// Проверяем сессию каждые 10 минут (увеличено с 5, чтобы не перегружать)
		// Supabase автоматически обновляет токен, мы только проверяем состояние
		this.tokenRefreshInterval = setInterval(
			async () => {
				const {
					data: { session },
				} = await supabase.auth.getSession();
				if (!session?.access_token) {
					// Сессия истекла, очищаем состояние
					this.setState({
						user: null,
						isAuthenticated: false,
						isLoading: false,
					});
					localStorage.removeItem('auth_user');
					this.clearTokenRefresh();
				}
				// НЕ обновляем данные пользователя автоматически - это создает циклы
			},
			10 * 60 * 1000
		); // 10 минут
	}

	private clearTokenRefresh(): void {
		if (this.tokenRefreshInterval) {
			clearInterval(this.tokenRefreshInterval);
			this.tokenRefreshInterval = null;
		}
	}

	/**
	 * Обновление данных пользователя в фоне
	 */
	private async refreshUserData(accessToken: string): Promise<void> {
		try {
			const user = await this.fetchUserWithRole(accessToken);
			// Обновляем состояние только если пользователь изменился
			if (user.id !== this.authState.user?.id) {
				this.setState({
					user,
					isAuthenticated: true,
				});
				localStorage.setItem('auth_user', JSON.stringify(user));
			}
		} catch (error) {
			// Игнорируем ошибки фонового обновления
		}
	}

	private async fetchUserWithRole(accessToken: string): Promise<User> {
		try {
			const API_BASE_URL =
				process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
			const response = await fetch(`${API_BASE_URL}/auth/user`, {
				headers: {
					Authorization: `Bearer ${accessToken}`,
					'Content-Type': 'application/json',
				},
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(
					`Failed to fetch user data: ${response.status} ${response.statusText}`
				);
			}

			const result = await response.json();
			const user = result.user;

			if (!user) {
				throw new Error('User data not found in response');
			}

			// Бэкенд автоматически синхронизирует роль в app_metadata при запросе /auth/user
			// НЕ обновляем сессию здесь - это создает бесконечные циклы
			// Новый токен с ролью будет получен автоматически при следующем запросе к Supabase

			return user;
		} catch (error) {
			throw error;
		}
	}

	// Публичный метод для обновления пользователя (используется в auth callback)
	async updateUser(accessToken: string, cachedUserData?: User): Promise<void> {
		try {
			// Оптимизация: если данные уже получены, используем их вместо запроса
			if (cachedUserData) {
				(cachedUserData as any)._cachedAt = Date.now();
				this.setState({
					user: cachedUserData,
					isAuthenticated: true,
					isLoading: false,
				});
				localStorage.setItem('auth_user', JSON.stringify(cachedUserData));
				return;
			}
			
			// Оптимизация: проверяем кэш перед запросом к API
			const cachedUser = localStorage.getItem('auth_user');
			if (cachedUser) {
				try {
					const parsedUser = JSON.parse(cachedUser);
					// Если кэш свежий (менее 5 секунд), используем его
					// Иначе делаем запрос к API для обновления
					const cacheAge = Date.now() - (parsedUser._cachedAt || 0);
					if (cacheAge < 5000) {
						// Используем кэш, но обновляем в фоне
						this.setState({
							user: parsedUser,
							isAuthenticated: true,
							isLoading: false,
						});
						
						// Обновляем в фоне без блокировки
						this.fetchUserWithRole(accessToken)
							.then((user) => {
								(user as any)._cachedAt = Date.now();
								localStorage.setItem('auth_user', JSON.stringify(user));
								this.setState({
									user,
									isAuthenticated: true,
									isLoading: false,
								});
							})
							.catch(() => {
								// Игнорируем ошибки фонового обновления
							});
						return;
					}
				} catch (e) {
					// Если кэш поврежден, продолжаем с запросом
				}
			}
			
			// Если кэша нет или он устарел, делаем запрос
			const user = await this.fetchUserWithRole(accessToken);
			(user as any)._cachedAt = Date.now();
			this.setState({
				user,
				isAuthenticated: true,
				isLoading: false,
			});
			localStorage.setItem('auth_user', JSON.stringify(user));
		} catch (error) {
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
				'/map',
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
			// Важно: проверяем не только id, но и роль, так как роль может обновиться
			const userChanged =
				prevState.user?.id !== newState.user?.id ||
				prevState.user?.role !== newState.user?.role;
			const authChanged =
				prevState.isAuthenticated !== newState.isAuthenticated;
			const loadingChanged = prevState.isLoading !== newState.isLoading;

			if (!userChanged && !authChanged && !loadingChanged) {
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
