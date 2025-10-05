'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuthStore } from '@/stores/authStore';
import { apiClient } from '@/lib/api-client';

function VerifyForm() {
	const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
		'loading'
	);
	const [message, setMessage] = useState('');
	const router = useRouter();
	const searchParams = useSearchParams();
	const { setUser, setSession } = useAuthStore();

	useEffect(() => {
		const handleEmailVerification = async () => {
			try {
				console.log('🔍 Email verification started');
				console.log('📍 Current URL:', window.location.href);
				console.log(
					'📍 URL search params:',
					Object.fromEntries(searchParams.entries())
				);
				console.log('📍 URL hash:', window.location.hash);

				// Получаем параметры из URL
				const token = searchParams.get('token');
				const type = searchParams.get('type');
				const accessToken = searchParams.get('access_token');
				const refreshToken = searchParams.get('refresh_token');

				// Также проверяем hash фрагмент URL (альтернативный способ передачи токенов)
				const hashParams = new URLSearchParams(
					window.location.hash.substring(1)
				);
				const hashAccessToken = hashParams.get('access_token');
				const hashRefreshToken = hashParams.get('refresh_token');

				console.log('🔑 Tokens found:', {
					token,
					type,
					accessToken: !!accessToken,
					refreshToken: !!refreshToken,
					hashAccessToken: !!hashAccessToken,
					hashRefreshToken: !!hashRefreshToken,
				});

				// Проверяем, есть ли токены в URL (новый формат Supabase)
				const finalAccessToken = accessToken || hashAccessToken;
				const finalRefreshToken = refreshToken || hashRefreshToken;

				if (finalAccessToken && finalRefreshToken) {
					// Устанавливаем сессию с токенами из URL
					const { data, error } = await supabase.auth.setSession({
						access_token: finalAccessToken,
						refresh_token: finalRefreshToken,
					});

					if (error) {
						throw error;
					}

					setStatus('success');
					setMessage('Email verified successfully! Redirecting...');

					// Обновляем auth store
					if (data.session) {
						console.log('✅ Session received:', data.session);
						setSession(data.session);

						// Получаем данные пользователя с бэкенда для определения роли
						try {
							console.log('🔄 Fetching user data from backend...');
							// Небольшая задержка, чтобы сессия успела установиться
							await new Promise((resolve) => setTimeout(resolve, 500));
							const userResponse = await apiClient.get('/auth/user');
							const userData = (userResponse as any).data;
							console.log('👤 User data received:', userData);
							setUser(userData);

							// Определяем куда перенаправлять на основе роли
							let finalRedirect = '/dashboard'; // по умолчанию для клиентов

							if (userData.role === 'OWNER') {
								finalRedirect = '/business/complete-setup';
							} else if (userData.role === 'ADMIN') {
								finalRedirect = '/admin-panel';
							}

							console.log('🎯 Redirecting to:', finalRedirect);

							// Перенаправляем пользователя
							setTimeout(() => {
								router.push(finalRedirect);
							}, 2000);
						} catch (error) {
							console.error('❌ Error fetching user data:', error);
							console.log('🔄 Fallback: using Supabase metadata');

							// Fallback - используем данные из Supabase metadata
							const supabaseUser = data.session.user;
							if (supabaseUser) {
								const fallbackUser = {
									id: supabaseUser.id,
									email: supabaseUser.email || '',
									name:
										supabaseUser.user_metadata?.name ||
										supabaseUser.user_metadata?.ownerName ||
										'',
									phone: supabaseUser.user_metadata?.phone || '',
									role: (supabaseUser.user_metadata?.role || 'CLIENT') as
										| 'OWNER'
										| 'ADMIN'
										| 'CLIENT',
								};

								console.log('👤 Using fallback user data:', fallbackUser);
								setUser(fallbackUser);

								// Определяем куда перенаправлять на основе роли
								let finalRedirect = '/dashboard'; // по умолчанию для клиентов

								if (fallbackUser.role === 'OWNER') {
									finalRedirect = '/owner-dashboard';
								} else if (fallbackUser.role === 'ADMIN') {
									finalRedirect = '/admin-panel';
								}

								console.log('🎯 Fallback redirecting to:', finalRedirect);
								setTimeout(() => {
									router.push(finalRedirect);
								}, 2000);
							} else {
								console.log('🔄 Final fallback: redirecting to /dashboard');
								// Final fallback - перенаправляем на dashboard по умолчанию
								setTimeout(() => {
									router.push('/dashboard');
								}, 2000);
							}
						}
					} else {
						console.log('❌ No session received, redirecting to login');
						// Если нет сессии, перенаправляем на логин
						setTimeout(() => {
							router.push('/login');
						}, 2000);
					}
				} else if (type === 'signup' && token) {
					// Подтверждаем email (старый формат)
					const { error } = await supabase.auth.verifyOtp({
						token_hash: token,
						type: 'email',
					});

					if (error) {
						throw error;
					}

					setStatus('success');
					setMessage('Email verified successfully! Redirecting...');

					// Получаем обновленную сессию после подтверждения
					const {
						data: { session },
					} = await supabase.auth.getSession();

					if (session) {
						// Обновляем auth store
						setSession(session);

						// Получаем данные пользователя с бэкенда для определения роли
						try {
							const userResponse = await apiClient.get('/auth/user');
							const userData = (userResponse as any).data;
							setUser(userData);

							// Определяем куда перенаправлять на основе роли
							let finalRedirect = '/dashboard'; // по умолчанию для клиентов

							if (userData.role === 'OWNER') {
								finalRedirect = '/business/complete-setup';
							} else if (userData.role === 'ADMIN') {
								finalRedirect = '/admin-panel';
							}

							// Перенаправляем пользователя
							setTimeout(() => {
								router.push(finalRedirect);
							}, 2000);
						} catch (error) {
							console.error('Error fetching user data:', error);
							// Fallback - перенаправляем на dashboard по умолчанию
							setTimeout(() => {
								router.push('/dashboard');
							}, 2000);
						}
					} else {
						// Если нет сессии, перенаправляем на логин
						setTimeout(() => {
							router.push('/login');
						}, 2000);
					}
				} else {
					// Если нет токена, проверяем текущую сессию
					const {
						data: { session },
					} = await supabase.auth.getSession();

					if (session?.user?.email_confirmed_at) {
						setStatus('success');
						setMessage('Email already verified! Redirecting...');

						// Обновляем auth store
						setSession(session);

						// Получаем данные пользователя с бэкенда для определения роли
						try {
							const userResponse = await apiClient.get('/auth/user');
							const userData = (userResponse as any).data;
							setUser(userData);

							// Определяем куда перенаправлять на основе роли
							let finalRedirect = '/dashboard'; // по умолчанию для клиентов

							if (userData.role === 'OWNER') {
								finalRedirect = '/business/complete-setup';
							} else if (userData.role === 'ADMIN') {
								finalRedirect = '/admin-panel';
							}

							setTimeout(() => {
								router.push(finalRedirect);
							}, 2000);
						} catch (error) {
							console.error('Error fetching user data:', error);
							// Fallback - перенаправляем на dashboard по умолчанию
							setTimeout(() => {
								router.push('/dashboard');
							}, 2000);
						}
					} else {
						throw new Error('No verification token found');
					}
				}
			} catch (error: unknown) {
				console.error('Email verification error:', error);
				setStatus('error');
				setMessage(
					error instanceof Error ? error.message : 'Failed to verify email'
				);
			}
		};

		handleEmailVerification();
	}, [router, searchParams]);

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
			<div className="max-w-md w-full space-y-8">
				<div className="text-center">
					{status === 'loading' && (
						<>
							<LoadingSpinner />
							<h2 className="mt-6 text-3xl font-extrabold text-gray-900">
								Verifying Email...
							</h2>
							<p className="mt-2 text-sm text-gray-600">
								Please wait while we verify your email address.
							</p>
						</>
					)}

					{status === 'success' && (
						<>
							<div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
								<svg
									className="h-8 w-8 text-green-600"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M5 13l4 4L19 7"
									/>
								</svg>
							</div>
							<h2 className="mt-6 text-3xl font-extrabold text-gray-900">
								Email Verified!
							</h2>
							<p className="mt-2 text-sm text-gray-600">{message}</p>
						</>
					)}

					{status === 'error' && (
						<>
							<div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
								<svg
									className="h-8 w-8 text-red-600"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
							</div>
							<h2 className="mt-6 text-3xl font-extrabold text-gray-900">
								Verification Failed
							</h2>
							<p className="mt-2 text-sm text-gray-600">{message}</p>
							<div className="mt-6">
								<button
									onClick={() => router.push('/login')}
									className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#ff5b5b] hover:bg-[#e04a4a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ff5b5b]"
								>
									Go to Login
								</button>
							</div>
						</>
					)}
				</div>
			</div>
		</div>
	);
}

export default function VerifyPage() {
	return (
		<Suspense fallback={<LoadingSpinner />}>
			<VerifyForm />
		</Suspense>
	);
}
