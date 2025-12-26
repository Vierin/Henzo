'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth-unified';
import { useTranslation } from '@/contexts/LanguageContext';
import { withLocale, extractLocaleFromPath } from '@/i18n/routing';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import TelegramLoginButton from '@/components/TelegramLoginButton';

export default function LoginClient() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [rememberMe, setRememberMe] = useState(false);
	const [loading, setLoading] = useState(false);
	const [telegramBotId, setTelegramBotId] = useState<string | null>(null);
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const { login, isAuthenticated, user } = useAuth();
	const t = useTranslation();

	// Get return URL from query parameters
	const returnTo = searchParams.get('returnTo');
	const errorParam = searchParams.get('error');
	const errorMessage = searchParams.get('message');

	// Display error message from query parameters
	useEffect(() => {
		if (errorParam && errorMessage) {
			toast.error(decodeURIComponent(errorMessage));
		}
	}, [errorParam, errorMessage]);

	// Редирект если уже авторизован
	useEffect(() => {
		if (isAuthenticated && user) {
			// Если есть returnTo URL, используем его для редиректа
			if (returnTo && user.role === 'CLIENT') {
				router.push(returnTo);
				return;
			}

			// Стандартные редиректы по ролям
			const locale = extractLocaleFromPath(pathname) ?? 'en';

			// Для OWNER нужно проверить наличие салона
			if (user.role === 'OWNER') {
				const checkSalonAndRedirect = async () => {
					try {
						// Проверяем наличие салона через API
						const response = await apiClient.get<{
							success: boolean;
							data?: any;
						}>('/salons/current');

						if (response?.success && response?.data) {
							// Салон существует - редиректим на дашборд
							router.push(
								withLocale('/owner-dashboard', locale as 'en' | 'ru' | 'vi')
							);
						} else {
							// Салон не существует - редиректим на настройку
							router.push(
								withLocale(
									'/business/complete-setup',
									locale as 'en' | 'ru' | 'vi'
								)
							);
						}
					} catch (error) {
						// В случае ошибки (например, сеть недоступна) редиректим на настройку
						// Это безопасный вариант, т.к. если салон есть, страница настройки сама проверит и перенаправит
						router.push(
							withLocale(
								'/business/complete-setup',
								locale as 'en' | 'ru' | 'vi'
							)
						);
					}
				};

				checkSalonAndRedirect();
				return;
			}

			// Для других ролей стандартный редирект
			switch (user.role) {
				case 'ADMIN':
					router.push(withLocale('/admin-panel', locale as 'en' | 'ru' | 'vi'));
					break;
				case 'CLIENT':
					router.push(withLocale('/dashboard', locale as 'en' | 'ru' | 'vi'));
					break;
				default:
					router.push(withLocale('/', locale as 'en' | 'ru' | 'vi'));
					break;
			}
		}
	}, [isAuthenticated, user, router, returnTo, pathname]);

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);

		try {
			const result = await login(email, password, rememberMe);

			if (result.success) {
				toast.success(t('auth.welcomeBack'));
				// Редирект будет выполнен в useEffect когда user обновится
			} else {
				toast.error(result.error || t('auth.signInFailed'));
			}
		} catch (error: any) {
			console.error('Login error:', error);
			toast.error(error.message || t('auth.signInFailed'));
		} finally {
			setLoading(false);
		}
	};

	const handleGoogleLogin = async () => {
		setLoading(true);
		try {
			const frontendUrl = (
				process.env.NEXT_PUBLIC_FRONTEND_URL || window.location.origin
			).trim();
			const redirectUrl = `${frontendUrl}/auth/callback`;
			const { data, error } = await supabase.auth.signInWithOAuth({
				provider: 'google',
				options: {
					redirectTo: redirectUrl,
					queryParams: {
						access_type: 'offline',
						prompt: 'consent',
					},
				},
			});

			if (error) {
				throw error;
			}
		} catch (error: any) {
			console.error('Google login error:', error);
			toast.error(error.message || t('auth.googleSignInFailed'));
			setLoading(false);
		}
	};

	// Загружаем bot_id при монтировании компонента
	useEffect(() => {
		const fetchBotId = async () => {
			try {
				const apiUrl =
					process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
				const response = await fetch(`${apiUrl}/auth/telegram/bot-id`);

				if (response.ok) {
					const data = await response.json();
					const botId = data?.botId;
					if (botId) {
						console.log('✅ Telegram bot ID loaded:', botId);
						setTelegramBotId(botId);
					} else {
						console.warn(
							'⚠️ Telegram bot ID is null or undefined in response:',
							data
						);
					}
				} else {
					const errorData = await response
						.json()
						.catch(() => ({ message: 'Unknown error' }));
					console.error('❌ Failed to get Telegram bot ID:', {
						status: response.status,
						statusText: response.statusText,
						error: errorData,
					});
				}
			} catch (error) {
				console.error('❌ Failed to get Telegram bot ID:', error);
			}
		};

		fetchBotId();
	}, []);

	// Обработчик авторизации через Telegram Widget
	const handleTelegramAuth = async (telegramData: {
		id: number;
		first_name: string;
		last_name?: string;
		username?: string;
		photo_url?: string;
		auth_date: number;
		hash: string;
	}) => {
		console.log('🚀 handleTelegramAuth called');
		console.log('📱 Telegram data received:', telegramData);
		console.log('📱 Data type check:', {
			id: typeof telegramData.id,
			first_name: typeof telegramData.first_name,
			hash: typeof telegramData.hash,
			auth_date: typeof telegramData.auth_date,
		});
		console.log('📱 Data validation:', {
			hasId: !!telegramData.id,
			hasFirstName: !!telegramData.first_name,
			hasHash: !!telegramData.hash,
			hasAuthDate: !!telegramData.auth_date,
			idValue: telegramData.id,
			firstNameValue: telegramData.first_name,
			hashValue: telegramData.hash,
			authDateValue: telegramData.auth_date,
		});

		if (
			!telegramData.id ||
			!telegramData.first_name ||
			!telegramData.hash ||
			!telegramData.auth_date
		) {
			console.error(
				'❌ Missing required Telegram data in handleTelegramAuth:',
				{
					id: telegramData.id,
					first_name: telegramData.first_name,
					hash: telegramData.hash,
					auth_date: telegramData.auth_date,
				}
			);
			toast.error('Missing required Telegram authentication data');
			return;
		}

		setLoading(true);
		try {
			console.log('📱 Sending Telegram data to backend...');

			// Отправляем данные на бэкенд
			const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
			const response = await fetch(`${apiUrl}/auth/telegram`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					id: telegramData.id,
					first_name: telegramData.first_name,
					last_name: telegramData.last_name || undefined,
					username: telegramData.username || undefined,
					photo_url: telegramData.photo_url || undefined,
					auth_date: telegramData.auth_date,
					hash: telegramData.hash,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Telegram authentication failed');
			}

			const result = await response.json();
			console.log('📱 Backend response:', {
				success: result.success,
				hasSession: !!result.session,
				hasAccessToken: !!result.session?.access_token,
				user: result.user,
			});

			if (result.success && result.session?.access_token) {
				console.log('✅ Authentication successful, setting session...');
				// Сохраняем сессию в Supabase
				const { error: sessionError } = await supabase.auth.setSession({
					access_token: result.session.access_token,
					refresh_token: result.session.refresh_token || '',
				});

				if (sessionError) {
					throw sessionError;
				}

				toast.success('Successfully logged in with Telegram!');

				// Обновляем состояние авторизации через authManager
				const { authManager } = await import('@/lib/auth-unified');
				await authManager.updateUser(result.session.access_token);

				// Редирект
				if (returnTo && result.user.role === 'CLIENT') {
					router.push(returnTo);
				} else {
					const locale = extractLocaleFromPath(pathname) ?? 'en';
					router.push(withLocale('/dashboard', locale as 'en' | 'ru' | 'vi'));
				}
			} else {
				throw new Error('Invalid response from server');
			}
		} catch (error: any) {
			console.error('Telegram auth error:', error);
			toast.error(error.message || 'Failed to authenticate with Telegram');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 pt-24">
			<div className="max-w-md w-full space-y-8">
				<div>
					<h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
						{t('auth.signInTitle')}
					</h2>
					<p className="mt-2 text-center text-sm text-gray-600">
						{t('auth.signInSubtitle')}
					</p>
				</div>
				<form className="mt-8 space-y-6" onSubmit={handleLogin}>
					<div className="rounded-md shadow-sm -space-y-px">
						<div>
							<label htmlFor="email-address" className="sr-only">
								{t('auth.emailAddress')}
							</label>
							<input
								id="email-address"
								name="email"
								type="email"
								autoComplete="email"
								required
								className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-[#ff5b5b] focus:border-[#ff5b5b] focus:z-10 sm:text-sm"
								placeholder={t('auth.emailAddress')}
								value={email}
								onChange={(e) => setEmail(e.target.value)}
							/>
						</div>
						<div>
							<label htmlFor="password" className="sr-only">
								{t('auth.password')}
							</label>
							<input
								id="password"
								name="password"
								type="password"
								autoComplete="current-password"
								required
								className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-[#ff5b5b] focus:border-[#ff5b5b] focus:z-10 sm:text-sm"
								placeholder={t('auth.password')}
								value={password}
								onChange={(e) => setPassword(e.target.value)}
							/>
						</div>
					</div>

					<div className="flex items-center justify-between">
						<label htmlFor="remember-me" className="flex items-center cursor-pointer group">
							<input
								id="remember-me"
								name="remember-me"
								type="checkbox"
								checked={rememberMe}
								onChange={(e) => setRememberMe(e.target.checked)}
								className="sr-only"
							/>
							<div className={`relative w-4 h-4 border-2 border-[#ff5b5b] rounded flex items-center justify-center transition-colors ${
								rememberMe ? 'bg-[#ff5b5b]' : 'bg-white'
							} cursor-pointer`}>
								{rememberMe && (
									<svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
									</svg>
								)}
							</div>
							<span className="ml-2 block text-sm text-gray-900">
								{t('auth.rememberMe')}
							</span>
						</label>

						<div className="text-sm">
							<Link
								href={withLocale(
									'/forgot-password',
									(extractLocaleFromPath(pathname) ?? 'en') as
										| 'en'
										| 'ru'
										| 'vi'
								)}
								className="font-medium text-[#ff5b5b] hover:text-[#ff5b5b]"
							>
								{t('auth.forgotPassword')}
							</Link>
						</div>
					</div>

					<div>
						<button
							type="submit"
							disabled={loading}
							className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#ff5b5b] hover:bg-[#ff5b5b] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ff5b5b] disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{loading ? (
								<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
							) : (
								t('auth.signIn')
							)}
						</button>
					</div>

					{/* Divider */}
					<div className="relative">
						<div className="absolute inset-0 flex items-center">
							<div className="w-full border-t border-gray-300" />
						</div>
						<div className="relative flex justify-center text-sm">
							<span className="px-2 bg-gray-50 text-gray-500">
								{t('auth.orContinueWith')}
							</span>
						</div>
					</div>

					{/* Google OAuth Button */}
					<div className="flex gap-2">
						<button
							type="button"
							onClick={handleGoogleLogin}
							disabled={loading}
							className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ff5b5b] disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
								<path
									fill="#4285F4"
									d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
								/>
								<path
									fill="#34A853"
									d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
								/>
								<path
									fill="#FBBC05"
									d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
								/>
								<path
									fill="#EA4335"
									d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
								/>
							</svg>
							Google
						</button>
					</div>

					{/* Telegram Login Button - Hidden for now */}
					{false && telegramBotId && (
						<div className="flex justify-center">
							<TelegramLoginButton
								botId={telegramBotId as string}
								onAuth={handleTelegramAuth}
								buttonSize="large"
								requestAccess="write"
								usePic={false}
								lang={
									(extractLocaleFromPath(pathname) ?? 'en') as
										| 'en'
										| 'ru'
										| 'vi'
								}
							/>
						</div>
					)}

					<div className="text-center space-y-4">
						<p className="text-sm text-gray-600">
							{t('auth.dontHaveAccount')}{' '}
							<Link
								href={withLocale(
									'/register',
									(extractLocaleFromPath(pathname) ?? 'en') as
										| 'en'
										| 'ru'
										| 'vi'
								)}
								className="font-medium text-[#ff5b5b] hover:text-[#ff5b5b]"
							>
								{t('auth.signUpAsClient')}
							</Link>
						</p>
						<div className="border-t border-gray-200 pt-4">
							<p className="text-sm text-gray-600 mb-2">
								{t('auth.areYouSalonOwner')}
							</p>
							<Link
								href={withLocale(
									'/business/',
									(extractLocaleFromPath(pathname) ?? 'en') as
										| 'en'
										| 'ru'
										| 'vi'
								)}
								className="text-sm font-medium text-orange-600 hover:text-orange-700"
							>
								{t('auth.registerBusinessAccount')}
							</Link>
						</div>
					</div>
				</form>
			</div>
		</div>
	);
}
