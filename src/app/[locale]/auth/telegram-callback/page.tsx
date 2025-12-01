'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

function TelegramCallbackContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const handleCallback = async () => {
			console.log('🔵 Telegram callback page loaded');
			console.log('🔵 Window available:', typeof window !== 'undefined');
			console.log(
				'🔵 Current URL:',
				typeof window !== 'undefined' ? window.location.href : 'N/A'
			);

			try {
				// Telegram OAuth возвращает данные в hash фрагменте URL (после #)
				// Важно: hash доступен только на клиенте, не на сервере
				if (typeof window === 'undefined') {
					console.warn('⚠️ Window is undefined, waiting for client-side...');
					return;
				}

				console.log('🔵 Waiting for hash data...');
				// Увеличиваем задержку для гарантии, что hash уже в URL после редиректа
				await new Promise((resolve) => setTimeout(resolve, 500));
				console.log('🔵 Delay completed, checking for data...');

				let telegramData: Record<string, string | null> = {};

				// Получаем полный URL и извлекаем hash
				const fullUrl = window.location.href;
				console.log('🔍 Full URL:', fullUrl);
				console.log('🔍 Location hash:', window.location.hash);
				console.log('🔍 Location search:', window.location.search);

				// Пробуем получить из hash (основной способ для Telegram OAuth)
				const hashIndex = fullUrl.indexOf('#');

				if (hashIndex !== -1) {
					const hashString = fullUrl.substring(hashIndex + 1);
					console.log('📋 Hash string:', hashString);

					// Парсим hash как URLSearchParams
					try {
						const hashParams = new URLSearchParams(hashString);

						telegramData = {
							hash: hashParams.get('hash'),
							id: hashParams.get('id'),
							first_name: hashParams.get('first_name'),
							last_name: hashParams.get('last_name'),
							username: hashParams.get('username'),
							photo_url: hashParams.get('photo_url'),
							auth_date: hashParams.get('auth_date'),
						};

						console.log('📋 Parsed from hash:', telegramData);
					} catch (e) {
						console.error('❌ Error parsing hash:', e);
					}
				} else {
					console.log('⚠️ No hash found in URL');
				}

				// Если в hash нет данных, пробуем query параметры (fallback)
				if (!telegramData.id && !telegramData.hash) {
					console.log('📋 Trying to get Telegram data from query params');
					telegramData = {
						hash: searchParams.get('hash'),
						id: searchParams.get('id'),
						first_name: searchParams.get('first_name'),
						last_name: searchParams.get('last_name'),
						username: searchParams.get('username'),
						photo_url: searchParams.get('photo_url'),
						auth_date: searchParams.get('auth_date'),
					};
					console.log('📋 Parsed from query params:', telegramData);
				}

				// Если все еще нет данных, пробуем парсить напрямую из window.location.hash
				if (!telegramData.id && !telegramData.hash && window.location.hash) {
					console.log('📋 Trying to parse from window.location.hash directly');
					const hashStr = window.location.hash.substring(1);
					const hashParams = new URLSearchParams(hashStr);
					telegramData = {
						hash: hashParams.get('hash'),
						id: hashParams.get('id'),
						first_name: hashParams.get('first_name'),
						last_name: hashParams.get('last_name'),
						username: hashParams.get('username'),
						photo_url: hashParams.get('photo_url'),
						auth_date: hashParams.get('auth_date'),
					};
					console.log('📋 Parsed from window.location.hash:', telegramData);
				}

				const {
					hash,
					id,
					first_name,
					last_name,
					username,
					photo_url,
					auth_date,
				} = telegramData;

				console.log('📋 Parsed Telegram data:', {
					hasId: !!id,
					hasFirstName: !!first_name,
					hasHash: !!hash,
					hasAuthDate: !!auth_date,
					id,
					first_name,
				});

				if (!id || !first_name || !hash || !auth_date) {
					console.error('❌ Missing Telegram data:', {
						hash: !!hash,
						id: !!id,
						first_name: !!first_name,
						auth_date: !!auth_date,
					});
					console.error(
						'Full URL:',
						typeof window !== 'undefined' ? window.location.href : 'N/A'
					);
					throw new Error('Missing required Telegram authentication data');
				}

				// Отправляем данные на бэкенд
				const apiUrl =
					process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
				const response = await fetch(`${apiUrl}/auth/telegram`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						id: parseInt(id, 10),
						first_name,
						last_name: last_name || undefined,
						username: username || undefined,
						photo_url: photo_url || undefined,
						auth_date: parseInt(auth_date, 10),
						hash,
					}),
				});

				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(
						errorData.message || 'Telegram authentication failed'
					);
				}

				const result = await response.json();

				if (result.success && result.session?.access_token) {
					// Сохраняем сессию в Supabase
					const { error: sessionError } = await supabase.auth.setSession({
						access_token: result.session.access_token,
						refresh_token: result.session.refresh_token || '',
					});

					if (sessionError) {
						throw sessionError;
					}

					toast.success('Successfully logged in with Telegram!');

					// Редирект на главную или dashboard
					router.push('/');
				} else {
					throw new Error('Invalid response from server');
				}
			} catch (error: any) {
				console.error('Telegram callback error:', error);
				toast.error(error.message || 'Failed to authenticate with Telegram');
				router.push('/login');
			} finally {
				setLoading(false);
			}
		};

		handleCallback();
	}, [router, searchParams]);

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0088cc] mx-auto mb-4"></div>
					<p className="text-gray-600">Authenticating with Telegram...</p>
				</div>
			</div>
		);
	}

	return null;
}

export default function TelegramCallbackPage() {
	return (
		<Suspense
			fallback={
				<div className="min-h-screen flex items-center justify-center bg-gray-50">
					<div className="text-center">
						<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0088cc] mx-auto mb-4"></div>
						<p className="text-gray-600">Loading...</p>
					</div>
				</div>
			}
		>
			<TelegramCallbackContent />
		</Suspense>
	);
}
