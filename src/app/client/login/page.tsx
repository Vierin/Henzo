'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PublicHeader from '../../../components/PublicHeader';
import { useAuthStore } from '@/stores/authStore';

export default function ClientLoginPage() {
	const [formData, setFormData] = useState({
		email: '',
		password: '',
	});
	const [error, setError] = useState('');
	const router = useRouter();
	const { login, isLoading } = useAuthStore();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');

		try {
			const result = await login(formData.email, formData.password);

			if (!result.success) {
				throw new Error(result.error || 'Login failed');
			}

			// Redirect to client dashboard
			router.push('/client/dashboard');
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : 'Login failed');
		}
	};

	return (
		<div className="min-h-screen bg-[#F8F5F2]">
			<PublicHeader />

			<main className="py-16 px-6">
				<div className="mx-auto max-w-md">
					<div className="bg-white rounded-2xl shadow-lg p-8">
						<div className="text-center mb-8">
							<h1 className="text-2xl font-bold text-gray-900 mb-2">
								Client Login
							</h1>
							<p className="text-gray-600">
								Sign in to book appointments and manage your profile
							</p>
						</div>

						<form onSubmit={handleSubmit} className="space-y-6">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Email
								</label>
								<input
									type="email"
									value={formData.email}
									onChange={(e) =>
										setFormData({ ...formData, email: e.target.value })
									}
									className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B4513] focus:border-transparent text-gray-900"
									placeholder="Enter your email"
									required
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Password
								</label>
								<input
									type="password"
									value={formData.password}
									onChange={(e) =>
										setFormData({ ...formData, password: e.target.value })
									}
									className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B4513] focus:border-transparent text-gray-900"
									placeholder="Enter your password"
									required
								/>
							</div>

							{error && (
								<div className="text-red-600 text-sm text-center bg-red-50 border border-red-200 rounded-md p-3">
									{error}
								</div>
							)}

							<button
								type="submit"
								disabled={isLoading}
								className="w-full bg-[#8B4513] text-white py-3 rounded-lg font-semibold hover:bg-[#6B3410] focus:outline-none focus:ring-2 focus:ring-[#8B4513] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								{isLoading ? 'Signing in...' : 'Sign In'}
							</button>
						</form>

						<div className="mt-6 text-center">
							<p className="text-sm text-gray-600">
								Don't have an account?{' '}
								<a
									href="/client/register"
									className="text-[#8B4513] hover:text-[#6B3410] font-medium"
								>
									Sign up here
								</a>
							</p>
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}
