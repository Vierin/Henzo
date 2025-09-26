'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export default function AuthCallbackPage() {
	const router = useRouter();
	const { setUser, setSession } = useAuthStore();

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
						// Check if this is a business registration
						const isBusinessRegistration = type === 'business';
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

								// Update auth store
								setUser(userData.user);
								setSession(data.session);

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
								// If user doesn't exist in backend, create based on registration type
								const defaultRole = isBusinessRegistration ? 'OWNER' : 'CLIENT';

								// Update user metadata with appropriate role
								const { error: updateError } = await supabase.auth.updateUser({
									data: {
										role: defaultRole,
										name:
											data.session.user.user_metadata?.name ||
											data.session.user.user_metadata?.full_name,
										phone: data.session.user.user_metadata?.phone,
									},
								});

								if (updateError) {
									console.error('Error updating user metadata:', updateError);
								}

								// Try to create user in backend again
								const retryResponse = await fetch(`${API_BASE_URL}/auth/user`, {
									headers: {
										Authorization: `Bearer ${data.session.access_token}`,
										'Content-Type': 'application/json',
									},
								});

								if (retryResponse.ok) {
									const userData = await retryResponse.json();
									// Update auth store
									setUser(userData.user);
									setSession(data.session);
									// Redirect based on role
									if (defaultRole === 'OWNER') {
										router.push('/owner-dashboard');
									} else {
										router.push('/dashboard');
									}
								} else {
									// If still fails, create a temporary user object and redirect
									const tempUser = {
										id: data.session.user.id,
										email: data.session.user.email || '',
										name:
											data.session.user.user_metadata?.name ||
											data.session.user.user_metadata?.full_name,
										phone: data.session.user.user_metadata?.phone,
										role: defaultRole as 'ADMIN' | 'OWNER' | 'CLIENT',
									};
									setUser(tempUser);
									setSession(data.session);
									// Redirect based on role
									if (defaultRole === 'OWNER') {
										router.push('/owner-dashboard');
									} else {
										router.push('/dashboard');
									}
								}
							}
						} catch (roleError) {
							console.error('Error getting user role:', roleError);
							// Create a temporary user object and redirect to client dashboard
							const tempUser = {
								id: data.session.user.id,
								email: data.session.user.email || '',
								name:
									data.session.user.user_metadata?.name ||
									data.session.user.user_metadata?.full_name,
								phone: data.session.user.user_metadata?.phone,
								role: 'CLIENT' as const,
							};
							setUser(tempUser);
							setSession(data.session);
							router.push('/dashboard');
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
