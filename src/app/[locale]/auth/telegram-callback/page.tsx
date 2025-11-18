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
			try {
				// Получаем данные из URL параметров
				const hash = searchParams.get('hash');
				const id = searchParams.get('id');
				const first_name = searchParams.get('first_name');
				const last_name = searchParams.get('last_name');
				const username = searchParams.get('username');
				const photo_url = searchParams.get('photo_url');
				const auth_date = searchParams.get('auth_date');

				if (!id || !first_name || !hash || !auth_date) {
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
