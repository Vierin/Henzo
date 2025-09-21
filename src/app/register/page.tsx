'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
	const [formData, setFormData] = useState({
		email: '',
		password: '',
		confirmPassword: '',
		name: '',
	});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState(false);
	const router = useRouter();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError('');

		// Validate passwords match
		if (formData.password !== formData.confirmPassword) {
			setError('Passwords do not match');
			setLoading(false);
			return;
		}

		// Validate password strength
		if (formData.password.length < 6) {
			setError('Password must be at least 6 characters long');
			setLoading(false);
			return;
		}

		try {
			// 1. Register user with Supabase Auth (with email verification)
			const { data: authData, error: authError } = await supabase.auth.signUp({
				email: formData.email,
				password: formData.password,
				options: {
					data: {
						name: formData.name,
						role: 'OWNER',
					},
					emailRedirectTo: `${window.location.origin}/verify?redirect_to=/salon-info`,
				},
			});

			if (authError) throw authError;

			// 2. Create user profile in our database
			if (authData.user) {
				const response = await fetch('http://localhost:3001/auth/register', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						userId: authData.user.id,
						email: formData.email,
						name: formData.name,
						phone: '', // Add phone field for business owners
					}),
				});

				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(errorData.error || 'Failed to create profile');
				}
			}

			// 3. Show success message
			setError('');
			setSuccess(true);

			// Reset form
			setFormData({
				email: '',
				password: '',
				confirmPassword: '',
				name: '',
			});
		} catch (err: any) {
			setError(err.message);
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
						Create Account
					</h2>
					<p className="mt-2 text-center text-sm text-gray-600">
						Register as a beauty salon owner
					</p>
				</div>

				{!success && (
					<form className="mt-8 space-y-6" onSubmit={handleSubmit}>
						<div className="space-y-4">
							<div>
								<label
									htmlFor="name"
									className="block text-sm font-medium text-gray-700"
								>
									Your Name
								</label>
								<input
									id="name"
									name="name"
									type="text"
									required
									value={formData.name}
									onChange={(e) =>
										setFormData({ ...formData, name: e.target.value })
									}
									className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-[#ff5b5b] focus:border-[#ff5b5b] focus:z-10 sm:text-sm"
									placeholder="Enter your name"
								/>
							</div>

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

							<div>
								<label
									htmlFor="confirmPassword"
									className="block text-sm font-medium text-gray-700"
								>
									Confirm Password
								</label>
								<input
									id="confirmPassword"
									name="confirmPassword"
									type="password"
									required
									value={formData.confirmPassword}
									onChange={(e) =>
										setFormData({
											...formData,
											confirmPassword: e.target.value,
										})
									}
									className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-[#ff5b5b] focus:border-[#ff5b5b] focus:z-10 sm:text-sm"
									placeholder="Confirm your password"
								/>
							</div>
						</div>

						{error && (
							<div className="text-red-600 text-sm text-center">{error}</div>
						)}

						<div>
							<button
								type="submit"
								disabled={loading}
								className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#ff5b5b] hover:bg-[#e04a4a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ff5b5b] disabled:opacity-50"
							>
								{loading ? 'Creating account...' : 'Create Account'}
							</button>
						</div>

						<div className="text-center">
							<span className="text-sm text-gray-600">
								Already have an account?{' '}
								<a
									href="/login"
									className="font-medium text-[#ff5b5b] hover:text-[#e04a4a]"
								>
									Sign in
								</a>
							</span>
						</div>
					</form>
				)}

				{success && (
					<div className="mt-8 text-center">
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
						<p className="text-lg font-medium text-gray-900 mb-2">
							Registration Successful!
						</p>
						<p className="text-sm text-gray-600 mb-6">
							Please check your email and click the verification link to
							activate your account. You will be redirected to setup your salon
							information.
						</p>
						<button
							onClick={() => {
								setSuccess(false);
								setFormData({
									email: '',
									password: '',
									confirmPassword: '',
									name: '',
								});
							}}
							className="text-sm text-[#ff5b5b] hover:text-[#e04a4a] font-medium"
						>
							Register Another Account
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
