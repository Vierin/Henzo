'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/authStore';
import { withLocale, extractLocaleFromPath } from '@/i18n/routing';
import { authManager } from '@/lib/auth-unified';
import { consumeBusinessOAuthContext } from '@/utils/oauth';

export default function AuthCallbackPage() {
	const router = useRouter();
	const pathname = usePathname();
	const { setUser, setSession } = useAuthStore();

	useEffect(() => {
		const handleAuthCallback = async () => {
			const locale = extractLocaleFromPath(pathname) ?? 'en';
			try {
				// Check if there's an error in URL params (from Supabase)
				const urlParams = new URLSearchParams(window.location.search);
				const errorParam = urlParams.get('error');
				const errorDescription = urlParams.get('error_description');

				if (errorParam) {
					console.error('❌ OAuth error from Supabase:', {
						error: errorParam,
						description: errorDescription,
					});
					router.push(
						withLocale(
							`/login?error=${encodeURIComponent(errorParam)}&description=${encodeURIComponent(errorDescription || '')}`,
							locale as 'en' | 'ru' | 'vi'
						)
					);
					return;
				}

				// Get returnUrl and locale from localStorage (set before OAuth redirect)
				const returnUrl = localStorage.getItem('oauthReturnUrl');
				const storedLocale = localStorage.getItem('oauthLocale');
				const pendingBooking = returnUrl ? true : false;

				// Use stored locale if available, otherwise extract from pathname
				const effectiveLocale = storedLocale || locale;

				// Handle the auth callback
				// Exchange code for session
				console.log('🔄 Processing OAuth callback...');

				// Get the code and state from URL
				const code = urlParams.get('code');
				const state = urlParams.get('state');

				if (!code) {
					console.error('❌ No code parameter in callback URL');
					// Check if there's a hash fragment (for mobile/web redirects)
					const hash = window.location.hash.substring(1);
					if (hash) {
						const hashParams = new URLSearchParams(hash);
						const accessToken = hashParams.get('access_token');
						const refreshToken = hashParams.get('refresh_token');

						if (accessToken && refreshToken) {
							console.log('✅ Found tokens in hash, setting session...');
							const { data: sessionData, error: sessionError } =
								await supabase.auth.setSession({
									access_token: accessToken,
									refresh_token: refreshToken,
								});

							if (sessionError) {
								console.error(
									'❌ Failed to set session from hash:',
									sessionError
								);
								router.push(
									withLocale(
										'/login?error=session_error',
										locale as 'en' | 'ru' | 'vi'
									)
								);
								return;
							}

							if (sessionData.session) {
								const modifiedParams = new URLSearchParams(urlParams);
								if (returnUrl) {
									modifiedParams.set('returnUrl', returnUrl);
									modifiedParams.set('pendingBooking', 'true');
								}
								await processSession(
									sessionData.session,
									effectiveLocale,
									modifiedParams
								);
								return;
							}
						}
					}

					router.push(
						withLocale('/login?error=no_code', locale as 'en' | 'ru' | 'vi')
					);
					return;
				}

				// Exchange code for session
				// Оптимизированный подход: одна попытка, быстрый fallback
				const result = await supabase.auth.exchangeCodeForSession(code);
				let session = result.data?.session;
				let sessionError = result.error;

				// Если ошибка, проверяем fallback механизмы (только для специфических ошибок)
				if (sessionError && !session) {
					// Retry только для сетевых ошибок или 500 ошибок
					const shouldRetry =
						sessionError.status === 500 ||
						sessionError.message?.includes('500') ||
						sessionError.message?.includes('network') ||
						sessionError.message?.includes('timeout');

					if (shouldRetry) {
						console.log('⚠️ Retrying after network/server error...');
						// Одна быстрая попытка без задержки
						const retryResult =
							await supabase.auth.exchangeCodeForSession(code);
						if (retryResult.data?.session) {
							session = retryResult.data.session;
							sessionError = null;
						}
					}

					// Если все еще ошибка, проверяем hash или getSession
					if (sessionError && !session) {
						// Проверка hash (для мобильных редиректов)
						const hash = window.location.hash.substring(1);
						if (hash) {
							const hashParams = new URLSearchParams(hash);
							const accessToken = hashParams.get('access_token');
							const refreshToken = hashParams.get('refresh_token');

							if (accessToken && refreshToken) {
								const { data: sessionData } = await supabase.auth.setSession({
									access_token: accessToken,
									refresh_token: refreshToken,
								});
								if (sessionData?.session) {
									session = sessionData.session;
									sessionError = null;
								}
							}
						}

						// Последняя попытка - проверить getSession
						if (!session) {
							const { data: fallbackData } = await supabase.auth.getSession();
							if (fallbackData?.session) {
								session = fallbackData.session;
								sessionError = null;
							}
						}
					}
				}

				if (session) {
					// Create modified urlParams with pendingBooking info
					const modifiedParams = new URLSearchParams(urlParams);
					if (returnUrl) {
						modifiedParams.set('returnUrl', returnUrl);
						modifiedParams.set('pendingBooking', 'true');
					}
					await processSession(session, effectiveLocale, modifiedParams);
				} else if (sessionError) {
					console.error('❌ Auth callback error:', sessionError);
					router.push(
						withLocale(
							`/login?error=auth_callback_failed&details=${encodeURIComponent(sessionError.message || 'Unknown error')}`,
							locale as 'en' | 'ru' | 'vi'
						)
					);
				} else {
					console.error('❌ No session found after OAuth callback');
					router.push(
						withLocale('/login?error=no_session', locale as 'en' | 'ru' | 'vi')
					);
				}
			} catch (error) {
				console.error('Unexpected error in auth callback:', error);
				router.push(
					withLocale(
						'/login?error=unexpected_error',
						locale as 'en' | 'ru' | 'vi'
					)
				);
			}
		};

		// Вспомогательная функция для синхронизации пользователя в фоне
		const syncUserInBackground = async (session: any, tempUser: any) => {
			try {
				const promises: Promise<any>[] = [];

				promises.push(
					apiClient
						.get<{ user: any }>('/auth/user', {
							headers: { Authorization: `Bearer ${session.access_token}` },
						})
						.then(async (userData) => {
							if (userData?.user) {
								const cacheData = {
									...userData.user,
									_cachedAt: Date.now(),
									_ttl: 30000,
								};
								sessionStorage.setItem(
									'auth_user_cache',
									JSON.stringify(cacheData)
								);
								localStorage.setItem(
									'auth_user',
									JSON.stringify(userData.user)
								);
								setUser(userData.user);
								if (session?.access_token) {
									await authManager.updateUser(
										session.access_token,
										userData.user as any
									);
								}
								console.log('✅ User synced from backend (background)');
							}
						})
				);

				await Promise.allSettled(promises);
			} catch (error) {
				console.error('⚠️ Background sync error:', error);
			}
		};

		// Вспомогательная функция для определения пути редиректа
		const getRedirectPath = (
			role: string,
			isBusinessRegistration: boolean,
			pendingBooking: boolean,
			returnUrl: string | null,
			locale: string
		): string => {
			if (pendingBooking && returnUrl) {
				return returnUrl;
			}

			switch (role) {
				case 'ADMIN':
					return withLocale('/admin-panel', locale as 'en' | 'ru' | 'vi');
				case 'OWNER':
					if (isBusinessRegistration) {
						return withLocale(
							'/business/complete-setup',
							locale as 'en' | 'ru' | 'vi'
						);
					}
					return withLocale('/owner-dashboard', locale as 'en' | 'ru' | 'vi');
				case 'CLIENT':
				default:
					return withLocale('/dashboard', locale as 'en' | 'ru' | 'vi');
			}
		};

		const processSession = async (
			session: any,
			locale: string,
			urlParams: URLSearchParams
		) => {
			const type = urlParams.get('type');
			const pendingBooking = urlParams.get('pendingBooking') === 'true';
			const returnUrl = urlParams.get('returnUrl');

			// Handle password reset flow
			if (type === 'recovery') {
				router.push(
					withLocale('/reset-password', locale as 'en' | 'ru' | 'vi')
				);
				return;
			}

			// ОПТИМИСТИЧНЫЕ ОБНОВЛЕНИЯ: Создаем временного пользователя сразу из session
			// Это позволяет редиректить немедленно, не дожидаясь ответа от бэкенда
			const tempUser = {
				id: session.user.id,
				email: session.user.email || '',
				name:
					session.user.user_metadata?.name ||
					session.user.user_metadata?.full_name ||
					'User',
				phone: session.user.user_metadata?.phone,
				role: (session.user.app_metadata?.role ||
					session.user.user_metadata?.role ||
					'CLIENT') as 'ADMIN' | 'OWNER' | 'CLIENT',
				createdAt: new Date().toISOString(),
			};

			// Кэшируем в sessionStorage для быстрого доступа (TTL 30 секунд)
			const cacheData = {
				...tempUser,
				_cachedAt: Date.now(),
				_ttl: 30000, // 30 секунд
			};
			sessionStorage.setItem('auth_user_cache', JSON.stringify(cacheData));
			localStorage.setItem('auth_user', JSON.stringify(tempUser));

			// Обновляем состояние сразу (optimistic update)
			setUser(tempUser);
			setSession(session);

			// Для pending booking flow - редиректим сразу
			if (pendingBooking && returnUrl) {
				console.log('📅 Pending booking flow, redirecting immediately...');
				localStorage.removeItem('oauthReturnUrl');
				localStorage.removeItem('oauthLocale');

				// Синхронизация с бэкендом в фоне
				syncUserInBackground(session, tempUser);
				router.push(returnUrl);
				return;
			}

			// Business flow is valid only when callback type=business and nonce is valid.
			const oauthContext = consumeBusinessOAuthContext();
			const isBusinessRegistration =
				type === 'business' && oauthContext.isValid;

			if (type === 'business' && !oauthContext.isValid) {
				if (
					typeof window !== 'undefined' &&
					typeof window.gtag === 'function'
				) {
					window.gtag('event', 'business_oauth_callback_role_upgrade_failed', {
						reason: 'invalid_oauth_nonce',
					});
				}
				router.push(
					withLocale(
						'/login?error=invalid_business_oauth_context',
						locale as 'en' | 'ru' | 'vi'
					)
				);
				return;
			}

			// Business Google OAuth: direct OWNER upsert; no magicLinkToken (email verified by Google).
			if (isBusinessRegistration) {
				try {
					await apiClient.post('/auth/register', {
						userId: session.user.id,
						email: session.user.email || '',
						name:
							session.user.user_metadata?.name ||
							session.user.user_metadata?.full_name ||
							'',
						role: 'OWNER',
					});
					if (
						typeof window !== 'undefined' &&
						typeof window.gtag === 'function'
					) {
						window.gtag('event', 'business_oauth_callback_success', {
							source: oauthContext.source || 'unknown',
						});
					}
				} catch (err: any) {
					const msg = err?.message || err?.errorData?.message || '';
					const normalizedMsg =
						typeof msg === 'string' ? msg.toLowerCase() : '';
					const isEmailMismatch =
						normalizedMsg.includes('email') &&
						(normalizedMsg.includes('match') ||
							normalizedMsg.includes('mismatch'));

					if (
						typeof window !== 'undefined' &&
						typeof window.gtag === 'function'
					) {
						window.gtag(
							'event',
							'business_oauth_callback_role_upgrade_failed',
							{
								reason: isEmailMismatch ? 'email_mismatch' : 'register_failed',
							}
						);
					}

					if (isEmailMismatch) {
						if (
							typeof window !== 'undefined' &&
							typeof window.gtag === 'function'
						) {
							window.gtag('event', 'business_magic_link_email_mismatch', {
								source: oauthContext.source || 'unknown',
							});
						}
						router.push(
							withLocale(
								'/business/register?error=email_mismatch',
								locale as 'en' | 'ru' | 'vi'
							)
						);
						return;
					}

					router.push(
						withLocale(
							'/business/register?error=oauth_register_failed',
							locale as 'en' | 'ru' | 'vi'
						)
					);
					return;
				}
			}

			// ОПТИМИСТИЧНЫЙ РЕДИРЕКТ: Редиректим сразу на основе временного пользователя
			// Синхронизация с бэкендом происходит в фоне
			const finalRole = isBusinessRegistration
				? 'OWNER'
				: tempUser.role || 'CLIENT';
			const redirectPath = getRedirectPath(
				finalRole,
				isBusinessRegistration,
				pendingBooking,
				returnUrl,
				locale
			);

			console.log('🚀 Optimistic redirect to:', redirectPath);
			router.push(redirectPath);

			// Синхронизация с бэкендом в фоне (не блокирует редирект)
			syncUserInBackground(session, tempUser).catch((err) => {
				console.log('⚠️ Background sync failed (non-critical):', err);
			});
		};

		handleAuthCallback();
	}, [router, pathname]);

	return (
		<div className="min-h-screen bg-[#fff7f6] flex items-center justify-center">
			<div className="text-center">
				<div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-[#ff5b5b] mb-4">
					<span className="text-white text-xl font-bold">H</span>
				</div>
				<h2 className="text-2xl font-bold text-gray-900 mb-2">
					Processing Authentication...
				</h2>
				<p className="text-gray-600">
					Please wait while we complete your authentication.
				</p>
			</div>
		</div>
	);
}
