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

export default function LoginClient() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const { login, isAuthenticated, user } = useAuth();
	const t = useTranslation();

	// Get return URL from query parameters
	const returnTo = searchParams.get('returnTo');

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
							router.push(withLocale('/owner-dashboard', locale as 'en' | 'ru' | 'vi'));
						} else {
							// Салон не существует - редиректим на настройку
							router.push(withLocale('/business/complete-setup', locale as 'en' | 'ru' | 'vi'));
						}
					} catch (error) {
						// В случае ошибки (например, сеть недоступна) редиректим на настройку
						// Это безопасный вариант, т.к. если салон есть, страница настройки сама проверит и перенаправит
						router.push(withLocale('/business/complete-setup', locale as 'en' | 'ru' | 'vi'));
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
			const result = await login(email, password);

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

	const handleTelegramLogin = async () => {
		setLoading(true);
		try {
			// Получаем bot_id с бэкенда
			const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
			const response = await fetch(`${apiUrl}/auth/telegram/bot-id`);

			if (!response.ok) {
				throw new Error('Failed to get Telegram bot ID');
			}

			const { botId } = await response.json();

			// Получаем origin (домен должен быть добавлен в BotFather)
			const origin = window.location.origin;
			
			// Проверяем, что это не localhost (для продакшена)
			if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
				console.warn('Telegram OAuth: Using localhost. Make sure to configure domain in BotFather for production.');
			}

			// Создаем callback URL
			const callbackUrl = encodeURIComponent(
				`${origin}/auth/telegram-callback`
			);

			// Открываем Telegram OAuth
			// Важно: домен в параметре origin должен быть добавлен в BotFather через /mybots -> Bot Settings -> Domain
			window.location.href = `https://oauth.telegram.org/auth?bot_id=${botId}&origin=${encodeURIComponent(origin)}&request_access=write&return_to=${callbackUrl}`;
		} catch (error: any) {
			console.error('Telegram login error:', error);
			toast.error(error.message || 'Failed to login with Telegram');
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
						<div className="flex items-center">
							<input
								id="remember-me"
								name="remember-me"
								type="checkbox"
								className="h-4 w-4 text-[#ff5b5b] focus:ring-[#ff5b5b] border-gray-300 rounded"
							/>
							<label
								htmlFor="remember-me"
								className="ml-2 block text-sm text-gray-900"
							>
								{t('auth.rememberMe')}
							</label>
						</div>

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

						<button
							type="button"
							onClick={handleTelegramLogin}
							disabled={loading}
							className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0088cc] disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="#0088cc">
								<path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.166 1.699-.835 5.826-1.178 7.73-.152.864-.45 1.152-.74 1.18-.63.056-1.108-.416-1.718-.816-.951-.64-1.49-1.037-2.416-1.662-1.07-.707-.376-1.096.233-1.73.16-.164 2.893-2.653 2.947-2.88.007-.03.014-.148-.055-.21-.069-.062-.17-.04-.244-.025-.105.02-1.78 1.13-5.024 3.316-.476.33-.907.49-1.293.482-.428-.009-1.252-.242-1.865-.44-.752-.243-1.35-.37-1.297-.781.027-.216.325-.437.895-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635.099-.002.321.023.465.14.118.095.151.223.167.312.016.09.036.293.02.45z" />
							</svg>
							Telegram
						</button>
					</div>

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
