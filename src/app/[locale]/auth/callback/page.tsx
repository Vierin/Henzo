'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { withLocale, extractLocaleFromPath } from '@/i18n/routing';
import { authManager } from '@/lib/auth-unified';

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
				// Supabase v2 automatically handles PKCE code_verifier from sessionStorage
				// Add retry mechanism for race conditions with database hooks
				let data: any = null;
				let error: any = null;
				let retryCount = 0;
				const maxRetries = 1; // Reduced from 2 to 1 for faster failure handling
				const retryDelay = 300; // Reduced from 1500ms to 300ms for faster retries

				// Try exchangeCodeForSession with retries
				while (retryCount <= maxRetries) {
					const result = await supabase.auth.exchangeCodeForSession(code);
					data = result.data;
					error = result.error;

					if (!error && data?.session) {
						// Success!
						break;
					}

					// If error and not last attempt, wait and retry
					if (error && retryCount < maxRetries) {
						console.log(
							`⚠️ Auth callback attempt ${retryCount + 1} failed, retrying in ${retryDelay}ms...`
						);
						await new Promise((resolve) => setTimeout(resolve, retryDelay));
						retryCount++;
						continue;
					}

					// Last attempt failed, check fallback mechanisms
					if (error) {
						// If PKCE error (code_verifier missing), try to get session from URL hash
						if (
							error.message?.includes('code verifier') ||
							error.message?.includes('code_verifier')
						) {
							console.log(
								'⚠️ PKCE error detected, checking fallback mechanisms...'
							);
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

									if (!sessionError && sessionData.session) {
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

							// Try to get session anyway - sometimes Supabase creates it despite the error
							// Check immediately without delay
							console.log('⚠️ Checking for session availability...');
							const { data: fallbackData } = await supabase.auth.getSession();
							if (fallbackData?.session) {
								console.log('✅ Got session after retry, continuing...');
								const modifiedParams = new URLSearchParams(urlParams);
								if (returnUrl) {
									modifiedParams.set('returnUrl', returnUrl);
									modifiedParams.set('pendingBooking', 'true');
								}
								await processSession(
									fallbackData.session,
									effectiveLocale,
									modifiedParams
								);
								return;
							}
						}

						// If it's a 500 error or database hook issue, check session immediately
						if (
							error.status === 500 ||
							error.message?.includes('500') ||
							error.message?.includes('hook')
						) {
							console.log(
								'⚠️ Database hook may be processing, checking session...'
							);
							// Check immediately - database hooks usually complete quickly
							const { data: fallbackData } = await supabase.auth.getSession();
							if (fallbackData?.session) {
								console.log('✅ Got session after retry, continuing...');
								const modifiedParams = new URLSearchParams(urlParams);
								if (returnUrl) {
									modifiedParams.set('returnUrl', returnUrl);
									modifiedParams.set('pendingBooking', 'true');
								}
								await processSession(
									fallbackData.session,
									effectiveLocale,
									modifiedParams
								);
								return;
							}
						}

						// Only log error if all retries and fallbacks failed
						console.error(
							'❌ Auth callback error after all retries and fallbacks:',
							{
								message: error.message,
								status: error.status,
								attempts: retryCount + 1,
							}
						);
					}
					break;
				}

				if (data?.session) {
					// Create modified urlParams with pendingBooking info
					const modifiedParams = new URLSearchParams(urlParams);
					if (returnUrl) {
						modifiedParams.set('returnUrl', returnUrl);
						modifiedParams.set('pendingBooking', 'true');
					}
					await processSession(data.session, effectiveLocale, modifiedParams);
				} else if (error) {
					// All retries and fallbacks failed
					router.push(
						withLocale(
							`/login?error=auth_callback_failed&details=${encodeURIComponent(error.message || 'Unknown error')}`,
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

			// Для pending booking flow - сразу редиректим, не ждем ответа от бэкенда
			// Optimistic update: показываем UI сразу, синхронизируем в фоне
			if (pendingBooking && returnUrl) {
				console.log('📅 Pending booking flow, redirecting immediately...');
				// Clean up localStorage
				localStorage.removeItem('oauthReturnUrl');
				localStorage.removeItem('oauthLocale');

				// Optimistic update: создаем временного пользователя сразу
				const tempUser = {
					id: session.user.id,
					email: session.user.email || '',
					name:
						session.user.user_metadata?.name ||
						session.user.user_metadata?.full_name ||
						'User',
					phone: session.user.user_metadata?.phone,
					role: 'CLIENT' as const,
					createdAt: new Date().toISOString(),
				};

				// Кэшируем в localStorage для быстрого доступа
				localStorage.setItem('auth_user', JSON.stringify(tempUser));

				// Обновляем состояние сразу (optimistic update)
				setUser(tempUser);
				setSession(session);

				// Пытаемся создать/обновить пользователя в бэкенде асинхронно (не блокируем)
				const API_BASE_URL =
					process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
				fetch(`${API_BASE_URL}/auth/user`, {
					headers: {
						Authorization: `Bearer ${session.access_token}`,
						'Content-Type': 'application/json',
					},
				})
					.then(async (response) => {
						if (response.ok) {
							const userData = await response.json();
							// Обновляем кэш с актуальными данными
							localStorage.setItem('auth_user', JSON.stringify(userData.user));
							setUser(userData.user);
						}
					})
					.catch((err) => {
						console.log('⚠️ Background user sync failed (non-critical):', err);
					});

				router.push(returnUrl);
				return;
			}

			try {
				// Regular auth callback (including Google OAuth)
				// Check if this is a business registration
				// Try URL param first, then localStorage and sessionStorage as fallback
				const urlType = type;
				const localStorageType = localStorage.getItem('registrationType');
				const sessionStorageType = sessionStorage.getItem('registrationType');
				const isBusinessRegistration =
					urlType === 'business' ||
					localStorageType === 'business' ||
					sessionStorageType === 'business';

				// Clean up storage after use
				if (localStorageType) {
					localStorage.removeItem('registrationType');
				}
				if (sessionStorageType) {
					sessionStorage.removeItem('registrationType');
				}
				// For business registration, register user first with OWNER role
				// Execute registration and user fetch in parallel for better performance
				const API_BASE_URL =
					process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

				let registrationPromise: Promise<void> | null = null;
				if (isBusinessRegistration) {
					registrationPromise = (async () => {
						try {
							const magicLinkToken = sessionStorage.getItem('magicLinkToken');

							// Register user with OWNER role
							const registerResponse = await fetch(
								`${API_BASE_URL}/auth/register`,
								{
									method: 'POST',
									headers: {
										'Content-Type': 'application/json',
									},
									body: JSON.stringify({
										userId: session.user.id,
										email: session.user.email || '',
										name:
											session.user.user_metadata?.name ||
											session.user.user_metadata?.full_name ||
											'',
										role: 'OWNER',
										magicLinkToken: magicLinkToken || undefined,
									}),
								}
							);

							if (registerResponse.ok) {
								console.log('✅ User registered with OWNER role');
								// Clean up magic link token
								if (magicLinkToken) {
									sessionStorage.removeItem('magicLinkToken');
								}
							} else {
								const errorText = await registerResponse.text();
								let errorData: any = {};
								try {
									errorData = errorText ? JSON.parse(errorText) : {};
								} catch (e) {
									console.error('Failed to parse error response:', e);
								}

								console.error('⚠️ Failed to register user:', {
									status: registerResponse.status,
									statusText: registerResponse.statusText,
									error: errorData,
								});

								// If user already exists, try to update role to OWNER
								if (
									errorData.message?.includes('already exists') ||
									errorData.message?.includes('already been registered') ||
									registerResponse.status === 400
								) {
									console.log(
										'ℹ️ User already exists, attempting to update role to OWNER...'
									);
									// Try to update role using PATCH /auth/user-role
									try {
										const updateResponse = await fetch(
											`${API_BASE_URL}/auth/user-role`,
											{
												method: 'PATCH',
												headers: {
													Authorization: `Bearer ${session.access_token}`,
													'Content-Type': 'application/json',
												},
												body: JSON.stringify({ role: 'OWNER' }),
											}
										);
										if (updateResponse.ok) {
											console.log('✅ Role updated to OWNER');
										} else {
											console.warn('⚠️ Failed to update role, continuing...');
										}
									} catch (updateError) {
										console.error('⚠️ Error updating role:', updateError);
									}
								} else {
									// For other errors, log but continue - getCurrentUser might handle it
									console.warn('⚠️ Registration error, but continuing...');
								}
							}
						} catch (registerError: any) {
							console.error('⚠️ Error registering user:', {
								message: registerError.message,
								stack: registerError.stack,
							});
							// Continue anyway - getCurrentUser will handle it
						}
					})();
				}

				// Get user role from backend (in parallel with registration if needed)
				try {
					const response = await fetch(`${API_BASE_URL}/auth/user`, {
						headers: {
							Authorization: `Bearer ${session.access_token}`,
							'Content-Type': 'application/json',
						},
					});

					if (!response.ok) {
						let errorData: any = {};
						try {
							const text = await response.text();
							errorData = text ? JSON.parse(text) : {};
						} catch (e) {
							console.error('Failed to parse error response:', e);
						}

						console.error('❌ Failed to get user from backend:', {
							status: response.status,
							statusText: response.statusText,
							error: errorData,
						});

						throw new Error(
							errorData.message ||
								errorData.error ||
								`Failed to get user: ${response.status}`
						);
					}

					if (response.ok) {
						// Wait for registration to complete if it was started
						if (registrationPromise) {
							await registrationPromise;
						}

						let userData = await response.json();

						// For business registration, ensure user has OWNER role
						if (isBusinessRegistration && userData.user.role !== 'OWNER') {
							console.log(
								'🔄 Business registration detected, updating role to OWNER...'
							);
							// Update user role in backend and fetch updated data in parallel
							try {
								const [updateResponse, updatedUserResponse] = await Promise.all(
									[
										fetch(`${API_BASE_URL}/auth/user-role`, {
											method: 'PATCH',
											headers: {
												Authorization: `Bearer ${session.access_token}`,
												'Content-Type': 'application/json',
											},
											body: JSON.stringify({ role: 'OWNER' }),
										}),
										// Pre-fetch updated user data in parallel
										fetch(`${API_BASE_URL}/auth/user`, {
											headers: {
												Authorization: `Bearer ${session.access_token}`,
												'Content-Type': 'application/json',
											},
										}),
									]
								);

								if (updateResponse.ok) {
									console.log('✅ Role updated to OWNER');
									if (updatedUserResponse.ok) {
										const updatedUserData = await updatedUserResponse.json();
										userData = updatedUserData;
										console.log('✅ User data updated with OWNER role');
									} else {
										// Fallback: update role locally
										console.warn(
											'⚠️ Failed to get updated user, using fallback'
										);
										userData.user.role = 'OWNER';
									}
								} else {
									const errorText = await updateResponse.text();
									console.error('❌ Failed to update role:', {
										status: updateResponse.status,
										error: errorText,
									});
									// Fallback: update role locally
									userData.user.role = 'OWNER';
								}
							} catch (updateError: any) {
								console.error('❌ Error updating user role:', {
									message: updateError.message,
									stack: updateError.stack,
								});
								// Fallback: update role locally
								userData.user.role = 'OWNER';
							}
						}

						// Бэкенд автоматически синхронизирует роль в app_metadata при запросе /auth/user
						// НЕ обновляем сессию здесь - это создает бесконечные циклы
						// Новый токен с ролью будет получен автоматически при следующем запросе
						const refreshedSession = session;

						// Кэшируем данные пользователя в localStorage для быстрого доступа
						localStorage.setItem('auth_user', JSON.stringify(userData.user));

						// Update authManager (единый источник истины)
						// Оптимизация: передаем уже полученные данные, избегая лишнего запроса
						console.log('Updating auth store with:', {
							user: userData.user,
							session: refreshedSession ? 'present' : 'missing',
							role: userData.user.role,
						});

						// Обновляем authManager напрямую без дополнительного запроса
						// Передаем уже полученные данные пользователя
						if (refreshedSession?.access_token) {
							await authManager.updateUser(
								refreshedSession.access_token,
								userData.user as any
							);
						}

						// Также обновляем authStore для совместимости
						setUser(userData.user);
						setSession(refreshedSession);

						// Debug: log final user data
						console.log('Final user data before redirect:', {
							role: userData.user.role,
							email: userData.user.email,
							isBusinessRegistration,
						});

						// Redirect based on role
						switch (userData.user.role) {
							case 'ADMIN':
								router.push(
									withLocale('/admin-panel', locale as 'en' | 'ru' | 'vi')
								);
								break;
							case 'OWNER':
								// For OWNER users, redirect immediately to dashboard
								// The dashboard page will check for salon and redirect if needed
								// This eliminates blocking API call during auth flow
								console.log(
									'Owner redirecting to dashboard (salon check on page)'
								);
								router.push(
									withLocale('/owner-dashboard', locale as 'en' | 'ru' | 'vi')
								);
								break;
							case 'CLIENT':
								// If this is a pending booking flow, return to the original page
								if (pendingBooking && returnUrl) {
									console.log(
										'Redirecting to returnUrl for pending booking:',
										returnUrl
									);
									router.push(returnUrl);
								} else {
									router.push(
										withLocale('/dashboard', locale as 'en' | 'ru' | 'vi')
									);
								}
								break;
							default:
								// If this is a pending booking flow, return to the original page
								if (pendingBooking && returnUrl) {
									console.log(
										'Redirecting to returnUrl for pending booking:',
										returnUrl
									);
									router.push(returnUrl);
								} else {
									router.push(
										withLocale('/dashboard', locale as 'en' | 'ru' | 'vi')
									);
								}
								break;
						}
					}
				} catch (roleError) {
					console.error('Error getting user role:', roleError);

					// If this is a pending booking flow, try to return to original page
					if (pendingBooking && returnUrl) {
						console.log(
							'Pending booking flow, redirecting to returnUrl:',
							returnUrl
						);
						router.push(returnUrl);
						return;
					}

					// Create a temporary user object and redirect based on registration type
					const defaultRole = isBusinessRegistration ? 'OWNER' : 'CLIENT';

					// Update user_metadata with role (не блокируем редирект)
					supabase.auth
						.updateUser({
							data: { role: defaultRole },
						})
						.catch((updateError) => {
							console.error(
								'Error updating user metadata with role:',
								updateError
							);
						});

					const tempUser = {
						id: session.user.id,
						email: session.user.email || '',
						name:
							session.user.user_metadata?.name ||
							session.user.user_metadata?.full_name,
						phone: session.user.user_metadata?.phone,
						role: defaultRole as 'ADMIN' | 'OWNER' | 'CLIENT',
						createdAt: new Date().toISOString(),
					};

					// Кэшируем в localStorage для быстрого доступа
					localStorage.setItem('auth_user', JSON.stringify(tempUser));

					setUser(tempUser);
					setSession(session);

					// Redirect based on registration type
					if (isBusinessRegistration) {
						// For business registration, always go to complete-setup
						router.push(
							withLocale(
								'/business/complete-setup',
								locale as 'en' | 'ru' | 'vi'
							)
						);
					} else {
						// If pending booking, return to original page
						if (pendingBooking && returnUrl) {
							router.push(returnUrl);
						} else {
							router.push(
								withLocale('/dashboard', locale as 'en' | 'ru' | 'vi')
							);
						}
					}
				}
			} catch (error) {
				console.error('Error processing session:', error);
				throw error;
			}
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
