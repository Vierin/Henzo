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
					router.push(
						withLocale('/login?error=no_code', locale as 'en' | 'ru' | 'vi')
					);
					return;
				}

				// Exchange code for session
				const { data, error } =
					await supabase.auth.exchangeCodeForSession(code);

				if (error) {
					console.error('❌ Auth callback error:', {
						message: error.message,
						status: error.status,
						error: error,
					});

					// If it's a 500 error from Supabase, it might be a database hook issue
					if (error.status === 500 || error.message?.includes('500')) {
						console.error(
							'⚠️ Supabase returned 500 - possible database hook issue'
						);
						// Try to get session anyway - sometimes the user is created despite the error
						const { data: fallbackData } = await supabase.auth.getSession();
						if (fallbackData?.session) {
							console.log('✅ Got session despite error, continuing...');
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

					router.push(
						withLocale(
							`/login?error=auth_callback_failed&details=${encodeURIComponent(error.message || 'Unknown error')}`,
							locale as 'en' | 'ru' | 'vi'
						)
					);
					return;
				}

				if (data.session) {
					// Create modified urlParams with pendingBooking info
					const modifiedParams = new URLSearchParams(urlParams);
					if (returnUrl) {
						modifiedParams.set('returnUrl', returnUrl);
						modifiedParams.set('pendingBooking', 'true');
					}
					await processSession(data.session, effectiveLocale, modifiedParams);
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

			// Для pending booking flow - сразу редиректим, не ждем ответа от бэкенда
			if (pendingBooking && returnUrl) {
				console.log('📅 Pending booking flow, redirecting immediately...');
				// Clean up localStorage
				localStorage.removeItem('oauthReturnUrl');
				localStorage.removeItem('oauthLocale');

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
				setUser(tempUser);
				setSession(session);

				// Пытаемся создать пользователя в бэкенде асинхронно (не блокируем)
				const API_BASE_URL =
					process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
				fetch(`${API_BASE_URL}/auth/user`, {
					headers: {
						Authorization: `Bearer ${session.access_token}`,
						'Content-Type': 'application/json',
					},
				}).catch((err) => {
					console.log('⚠️ Background user sync failed (non-critical):', err);
				});

				router.push(returnUrl);
				return;
			}

			if (type === 'recovery') {
				router.push(
					withLocale('/reset-password', locale as 'en' | 'ru' | 'vi')
				);
				return;
			}

			try {
				// Check if this is a password reset flow
				const type = urlParams.get('type');
				const pendingBooking = urlParams.get('pendingBooking') === 'true';
				const returnUrl = urlParams.get('returnUrl');

				// Для pending booking flow - сразу редиректим, не ждем ответа от бэкенда
				if (pendingBooking && returnUrl) {
					console.log('📅 Pending booking flow, redirecting immediately...');
					// Создаем временного пользователя из Supabase session
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
					setUser(tempUser);
					setSession(session);

					// Пытаемся создать пользователя в бэкенде асинхронно (не блокируем)
					const API_BASE_URL =
						process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
					fetch(`${API_BASE_URL}/auth/user`, {
						headers: {
							Authorization: `Bearer ${session.access_token}`,
							'Content-Type': 'application/json',
						},
					}).catch((err) => {
						console.log('⚠️ Background user sync failed (non-critical):', err);
					});

					router.push(returnUrl);
					return;
				}

				if (type === 'recovery') {
					// This is a password reset, redirect to reset password page
					router.push(
						withLocale('/reset-password', locale as 'en' | 'ru' | 'vi')
					);
					return;
				}

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
				if (isBusinessRegistration) {
					try {
						const API_BASE_URL =
							process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
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
							// Wait a bit for app_metadata to sync in Supabase
							console.log('⏳ Waiting for app_metadata to sync...');
							await new Promise((resolve) => setTimeout(resolve, 1000));
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
										// Wait for metadata to sync
										await new Promise((resolve) => setTimeout(resolve, 500));
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
				}

				// Get user role from backend
				try {
					const API_BASE_URL =
						process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
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
						let userData = await response.json();

						// For business registration, ensure user has OWNER role
						if (isBusinessRegistration && userData.user.role !== 'OWNER') {
							console.log(
								'🔄 Business registration detected, updating role to OWNER...'
							);
							// Update user role in backend
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
									// Get updated user data from backend
									const updatedUserResponse = await fetch(
										`${API_BASE_URL}/auth/user`,
										{
											headers: {
												Authorization: `Bearer ${session.access_token}`,
												'Content-Type': 'application/json',
											},
										}
									);

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

						// Update authManager (единый источник истины)
						console.log('Updating auth store with:', {
							user: userData.user,
							session: refreshedSession ? 'present' : 'missing',
							role: userData.user.role,
						});
						// Обновляем authManager через updateUser (главный источник)
						if (refreshedSession?.access_token) {
							await authManager.updateUser(refreshedSession.access_token);
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
								// For OWNER users, check if they have a salon first
								try {
									const salonResponse = await fetch(
										`${API_BASE_URL}/salons/current`,
										{
											headers: {
												Authorization: `Bearer ${session.access_token}`,
												'Content-Type': 'application/json',
											},
										}
									);

									if (salonResponse.ok) {
										const responseData = await salonResponse.json();
										if (responseData.success && responseData.data) {
											// User has a salon, go directly to dashboard
											console.log(
												'Owner has existing salon, redirecting to dashboard'
											);
											router.push(
												withLocale(
													'/owner-dashboard',
													locale as 'en' | 'ru' | 'vi'
												)
											);
										} else {
											// User doesn't have a salon, go to complete-setup
											console.log(
												'Owner has no salon, redirecting to complete-setup'
											);
											router.push(
												withLocale(
													'/business/complete-setup',
													locale as 'en' | 'ru' | 'vi'
												)
											);
										}
									} else {
										// Error checking salon, go to complete-setup as fallback
										console.log(
											'Error checking salon, redirecting to complete-setup'
										);
										router.push(
											withLocale(
												'/business/complete-setup',
												locale as 'en' | 'ru' | 'vi'
											)
										);
									}
								} catch (error) {
									console.error('Error checking salon:', error);
									// Error checking salon, go to complete-setup as fallback
									router.push(
										withLocale(
											'/business/complete-setup',
											locale as 'en' | 'ru' | 'vi'
										)
									);
								}
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

					// Update user_metadata with role
					try {
						await supabase.auth.updateUser({
							data: { role: defaultRole },
						});
					} catch (updateError) {
						console.error(
							'Error updating user metadata with role:',
							updateError
						);
					}

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
