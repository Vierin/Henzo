'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/authStore';

export default function LoginPage() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const router = useRouter();
	const { setUser, setSession } = useAuthStore();

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);

		try {
			const { data, error } = await supabase.auth.signInWithPassword({
				email,
				password,
			});

			if (error) {
				throw error;
			}

			if (data.user && data.session) {
				// Получаем роль пользователя из бэкенда
				const API_BASE_URL =
					process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
				const response = await fetch(`${API_BASE_URL}/auth/user`, {
					headers: {
						Authorization: `Bearer ${data.session.access_token}`,
						'Content-Type': 'application/json',
					},
				});

				if (!response.ok) {
					throw new Error('Failed to get user role');
				}

				const userData = await response.json();

				// Обновляем состояние аутентификации
				setUser(userData.user);
				setSession(data.session);

				// Перенаправляем в зависимости от роли
				switch (userData.user.role) {
					case 'ADMIN':
						router.push('/admin-panel');
						toast.success('Welcome, Admin!');
						break;
					case 'OWNER':
						router.push('/owner-dashboard');
						toast.success('Welcome back!');
						break;
					case 'CLIENT':
						router.push('/dashboard');
						toast.success('Welcome back!');
						break;
					default:
						router.push('/dashboard');
						toast.success('Welcome!');
						break;
				}
			}
		} catch (error: any) {
			console.error('Login error:', error);
			toast.error(error.message || 'Failed to sign in');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
			<div className="max-w-md w-full space-y-8">
				<div>
					<div className="mx-auto h-12 w-12 flex items-center justify-center">
						<span className="text-3xl">💇‍♀️</span>
					</div>
					<h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
						Sign in to your account
					</h2>
					<p className="mt-2 text-center text-sm text-gray-600">
						Access your salon management, client dashboard, or admin panel
					</p>
				</div>
				<form className="mt-8 space-y-6" onSubmit={handleLogin}>
					<div className="rounded-md shadow-sm -space-y-px">
						<div>
							<label htmlFor="email-address" className="sr-only">
								Email address
							</label>
							<input
								id="email-address"
								name="email"
								type="email"
								autoComplete="email"
								required
								className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-[#ff5b5b] focus:border-[#ff5b5b] focus:z-10 sm:text-sm"
								placeholder="Email address"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
							/>
						</div>
						<div>
							<label htmlFor="password" className="sr-only">
								Password
							</label>
							<input
								id="password"
								name="password"
								type="password"
								autoComplete="current-password"
								required
								className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-[#ff5b5b] focus:border-[#ff5b5b] focus:z-10 sm:text-sm"
								placeholder="Password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
							/>
						</div>
					</div>

					<div className="flex items-center justify-between">
						<div className="flex items-center">
							<input
								id="remember-me"
								name="remember-me"
								type="checkbox"
								className="h-4 w-4 text-[#ff5b5b] focus:ring-[#ff5b5b] border-gray-300 rounded"
							/>
							<label
								htmlFor="remember-me"
								className="ml-2 block text-sm text-gray-900"
							>
								Remember me
							</label>
						</div>

						<div className="text-sm">
							<a
								href="#"
								className="font-medium text-[#ff5b5b] hover:text-[#ff5b5b]"
							>
								Forgot your password?
							</a>
						</div>
					</div>

					<div>
						<button
							type="submit"
							disabled={loading}
							className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#ff5b5b] hover:bg-[#ff5b5b] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ff5b5b] disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{loading ? (
								<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
							) : (
								'Sign in'
							)}
						</button>
					</div>

					<div className="text-center">
						<p className="text-sm text-gray-600">
							Don't have an account?{' '}
							<a
								href="/register"
								className="font-medium text-[#ff5b5b] hover:text-[#ff5b5b]"
							>
								Sign up
							</a>
						</p>
					</div>

					{/* Quick access buttons for demo */}
					<div className="mt-6 border-t border-gray-200 pt-6">
						<p className="text-xs text-gray-500 text-center mb-4">
							Quick access for testing:
						</p>
						<div className="grid grid-cols-3 gap-2">
							<button
								type="button"
								onClick={() => {
									setEmail('admin@henzo.com');
									toast.info('Admin email filled');
								}}
								className="text-xs py-1 px-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
							>
								Admin
							</button>
							<button
								type="button"
								onClick={() => {
									setEmail('owner@example.com');
									toast.info('Owner email filled');
								}}
								className="text-xs py-1 px-2 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
							>
								Owner
							</button>
							<button
								type="button"
								onClick={() => {
									setEmail('client@example.com');
									toast.info('Client email filled');
								}}
								className="text-xs py-1 px-2 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
							>
								Client
							</button>
						</div>
					</div>
				</form>
			</div>
		</div>
	);
}
