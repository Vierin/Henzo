'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
	const [formData, setFormData] = useState({
		email: '',
		password: '',
	});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const router = useRouter();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError('');

		try {
			const { data, error } = await supabase.auth.signInWithPassword({
				email: formData.email,
				password: formData.password,
			});

			if (error) {
				// Показываем ошибку и НЕ перенаправляем пользователя
				setError(error.message || 'Invalid email or password');
				return;
			}

			// Skip email verification for development
			console.log('User logged in:', data.user?.email, 'Email confirmed:', data.user?.email_confirmed_at);

			// Только при успешном логине перенаправляем пользователя
			router.push('/owner-dashboard');
		} catch (err: any) {
			// Показываем ошибку и НЕ перенаправляем пользователя
			setError(err.message || 'An error occurred during login');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-[#fff7f6] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
			<div className="max-w-md w-full space-y-8">
				<div>
					<div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-[#ff5b5b]">
						<span className="text-white text-xl font-bold">H</span>
					</div>
					<h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
						Sign In
					</h2>
					<p className="mt-2 text-center text-sm text-gray-600">
						Sign in to your beauty salon account
					</p>
				</div>

				<form className="mt-8 space-y-6" onSubmit={handleSubmit}>
					<div className="space-y-4">
						<div>
							<label
								htmlFor="email"
								className="block text-sm font-medium text-gray-700"
							>
								Email
							</label>
							<input
								id="email"
								name="email"
								type="email"
								required
								value={formData.email}
								onChange={(e) =>
									setFormData({ ...formData, email: e.target.value })
								}
								className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-[#ff5b5b] focus:border-[#ff5b5b] focus:z-10 sm:text-sm"
								placeholder="Enter your email"
							/>
						</div>

						<div>
							<label
								htmlFor="password"
								className="block text-sm font-medium text-gray-700"
							>
								Password
							</label>
							<input
								id="password"
								name="password"
								type="password"
								required
								value={formData.password}
								onChange={(e) =>
									setFormData({ ...formData, password: e.target.value })
								}
								className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-[#ff5b5b] focus:border-[#ff5b5b] focus:z-10 sm:text-sm"
								placeholder="Enter your password"
							/>
						</div>
					</div>

					{error && (
						<div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm text-center">
							{error}
						</div>
					)}

					<div>
						<button
							type="submit"
							disabled={loading}
							className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#ff5b5b] hover:bg-[#e04a4a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ff5b5b] disabled:opacity-50"
						>
							{loading ? 'Signing in...' : 'Sign In'}
						</button>
					</div>

					<div className="text-center">
						<span className="text-sm text-gray-600">
							Don't have an account?{' '}
							<a
								href="/register"
								className="font-medium text-[#ff5b5b] hover:text-[#e04a4a]"
							>
								Create one
							</a>
						</span>
					</div>

					<div className="text-center">
						<a
							href="/forgot-password"
							className="text-sm text-[#ff5b5b] hover:text-[#e04a4a]"
						>
							Forgot your password?
						</a>
					</div>
				</form>
			</div>
		</div>
	);
}
