'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
	const router = useRouter();

	useEffect(() => {
		const handleAuthCallback = async () => {
			try {
				// Handle the auth callback
				const { data, error } = await supabase.auth.getSession();

				if (error) {
					console.error('Auth callback error:', error);
					router.push('/login?error=auth_callback_failed');
					return;
				}

				if (data.session) {
					// Check if this is a password reset flow
					const urlParams = new URLSearchParams(window.location.search);
					const type = urlParams.get('type');

					if (type === 'recovery') {
						// This is a password reset, redirect to reset password page
						router.push('/reset-password');
					} else {
						// Regular auth callback, redirect to appropriate dashboard
						router.push('/');
					}
				} else {
					// No session, redirect to login
					router.push('/login');
				}
			} catch (error) {
				console.error('Unexpected error in auth callback:', error);
				router.push('/login?error=unexpected_error');
			}
		};

		handleAuthCallback();
	}, [router]);

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
