'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';

export default function VerifyPage() {
	const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
		'loading'
	);
	const [message, setMessage] = useState('');
	const router = useRouter();
	const searchParams = useSearchParams();

	useEffect(() => {
		const verifyEmail = async () => {
			try {
				const { data, error } = await supabase.auth.verifyOtp({
					token_hash: searchParams.get('token_hash') || '',
					type: 'email',
				});

				if (error) {
					setStatus('error');
					setMessage(
						'Verification failed. Please try again or request a new verification email.'
					);
					return;
				}

				if (data.user) {
					setStatus('success');
					setMessage(
						'Email verified successfully! Redirecting to business dashboard...'
					);

					// Redirect to owner dashboard after 2 seconds
					setTimeout(() => {
						router.push('/owner-dashboard');
					}, 2000);
				}
			} catch (err) {
				setStatus('error');
				setMessage('An error occurred during verification. Please try again.');
			}
		};

		verifyEmail();
	}, [searchParams, router]);

	return (
		<div className="min-h-screen bg-[#fff7f6] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
			<div className="max-w-md w-full space-y-8">
				<div className="text-center">
					<div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-[#ff5b5b]">
						<span className="text-white text-xl font-bold">H</span>
					</div>
					<h2 className="mt-6 text-3xl font-extrabold text-gray-900">
						Email Verification
					</h2>
				</div>

				<div className="text-center">
					{status === 'loading' && (
						<div className="space-y-4">
							<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff5b5b] mx-auto"></div>
							<p className="text-gray-600">Verifying your email...</p>
						</div>
					)}

					{status === 'success' && (
						<div className="space-y-4">
							<div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
								<svg
									className="h-6 w-6 text-green-600"
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
							<p className="text-green-600 font-medium">{message}</p>
						</div>
					)}

					{status === 'error' && (
						<div className="space-y-4">
							<div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
								<svg
									className="h-6 w-6 text-red-600"
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
							<p className="text-red-600 font-medium">{message}</p>
							<button
								onClick={() => router.push('/register')}
								className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#ff5b5b] hover:bg-[#e04a4a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ff5b5b]"
							>
								Try Again
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
