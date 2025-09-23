'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import LoadingSpinner from '@/components/LoadingSpinner';

function VerifyForm() {
	const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
		'loading'
	);
	const [message, setMessage] = useState('');
	const router = useRouter();
	const searchParams = useSearchParams();

	useEffect(() => {
		const handleEmailVerification = async () => {
			try {
				// Получаем параметры из URL
				const token = searchParams.get('token');
				const type = searchParams.get('type');
				const redirectTo =
					searchParams.get('redirect_to') || '/owner-dashboard';

				if (type === 'signup' && token) {
					// Подтверждаем email
					const { error } = await supabase.auth.verifyOtp({
						token_hash: token,
						type: 'email',
					});

					if (error) {
						throw error;
					}

					setStatus('success');
					setMessage('Email verified successfully! Redirecting...');

					// Перенаправляем пользователя
					setTimeout(() => {
						router.push(redirectTo);
					}, 2000);
				} else {
					// Если нет токена, проверяем текущую сессию
					const {
						data: { session },
					} = await supabase.auth.getSession();

					if (session?.user?.email_confirmed_at) {
						setStatus('success');
						setMessage('Email already verified! Redirecting...');
						setTimeout(() => {
							router.push(redirectTo);
						}, 2000);
					} else {
						throw new Error('No verification token found');
					}
				}
			} catch (error: unknown) {
				console.error('Email verification error:', error);
				setStatus('error');
				setMessage(error instanceof Error ? error.message : 'Failed to verify email');
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
