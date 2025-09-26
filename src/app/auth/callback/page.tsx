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
						// Regular auth callback (including Google OAuth)
						// Get user role from backend
						try {
							const API_BASE_URL =
								process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
							const response = await fetch(`${API_BASE_URL}/auth/user`, {
								headers: {
									Authorization: `Bearer ${data.session.access_token}`,
									'Content-Type': 'application/json',
								},
							});

							if (response.ok) {
								const userData = await response.json();

								// Redirect based on role
								switch (userData.user.role) {
									case 'ADMIN':
										router.push('/admin-panel');
										break;
									case 'OWNER':
										router.push('/owner-dashboard');
										break;
									case 'CLIENT':
										router.push('/dashboard');
										break;
									default:
										router.push('/dashboard');
										break;
								}
							} else {
								// If user doesn't exist in backend, redirect to role selection
								router.push('/select-role');
							}
						} catch (roleError) {
							console.error('Error getting user role:', roleError);
							router.push('/select-role');
						}
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
