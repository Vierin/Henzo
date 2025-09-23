'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PublicHeader from '../../../components/PublicHeader';
import { useAuthStore } from '@/stores/authStore';

export default function ClientRegisterPage() {
	const [formData, setFormData] = useState({
		name: '',
		email: '',
		phone: '',
		password: '',
		confirmPassword: '',
	});
	const [error, setError] = useState('');
	const [success, setSuccess] = useState(false);
	const router = useRouter();
	const { registerClient, isLoading } = useAuthStore();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		// Loading handled by Zustand store
		setError('');

		// Validate form
		if (formData.password !== formData.confirmPassword) {
			setError('Passwords do not match');
			// Loading handled by Zustand store
			return;
		}

		if (formData.password.length < 6) {
			setError('Password must be at least 6 characters');
			// Loading handled by Zustand store
			return;
		}

		try {
			const result = await registerClient({
				email: formData.email,
				password: formData.password,
				name: formData.name || undefined,
				phone: formData.phone || undefined,
			});

			if (!result.success) {
				throw new Error(result.error || 'Registration failed');
			}

			// Show success message
			setSuccess(true);
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : 'Registration failed');
		} finally {
			// Loading handled by Zustand store
		}
	};

	if (success) {
		return (
			<div className="min-h-screen bg-[#F8F5F2]">
				<PublicHeader />

				<main className="py-16 px-6">
					<div className="mx-auto max-w-md">
						<div className="bg-white rounded-2xl shadow-lg p-8 text-center">
							<div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
								<svg
									className="w-8 h-8 text-green-600"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M5 13l4 4L19 7"
									/>
								</svg>
							</div>
							<h1 className="text-2xl font-bold text-gray-900 mb-2">
								Registration Successful!
							</h1>
							<p className="text-gray-600 mb-6">
								Please check your email and click the verification link to
								activate your account. Once verified, you can book appointments
								and manage your profile.
							</p>
							<div className="space-y-3">
								<button
									onClick={() => router.push('/client/login')}
									className="w-full bg-[#8B4513] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#6B3410] transition-colors"
								>
									Go to Login
								</button>
								<button
									onClick={() => router.push('/')}
									className="w-full bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
								>
									Back to Home
								</button>
							</div>
						</div>
					</div>
				</main>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-[#F8F5F2]">
			<PublicHeader />

			<main className="py-16 px-6">
				<div className="mx-auto max-w-md">
					<div className="bg-white rounded-2xl shadow-lg p-8">
						<div className="text-center mb-8">
							<h1 className="text-2xl font-bold text-gray-900 mb-2">
								Client Registration
							</h1>
							<p className="text-gray-600">
								Create your account to book appointments
							</p>
						</div>

						<form onSubmit={handleSubmit} className="space-y-6">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Full Name
								</label>
								<input
									type="text"
									value={formData.name}
									onChange={(e) =>
										setFormData({ ...formData, name: e.target.value })
									}
									className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B4513] focus:border-transparent text-gray-900"
									placeholder="Enter your full name"
									required
								/>
							</div>

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
									Phone Number
								</label>
								<input
									type="tel"
									value={formData.phone}
									onChange={(e) =>
										setFormData({ ...formData, phone: e.target.value })
									}
									className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B4513] focus:border-transparent text-gray-900"
									placeholder="Enter your phone number"
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
									placeholder="Create a password"
									required
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Confirm Password
								</label>
								<input
									type="password"
									value={formData.confirmPassword}
									onChange={(e) =>
										setFormData({
											...formData,
											confirmPassword: e.target.value,
										})
									}
									className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B4513] focus:border-transparent text-gray-900"
									placeholder="Confirm your password"
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
								{isLoading ? 'Creating Account...' : 'Create Account'}
							</button>
						</form>

						<div className="mt-6 text-center">
							<p className="text-sm text-gray-600">
								Already have an account?{' '}
								<a
									href="/client/login"
									className="text-[#8B4513] hover:text-[#6B3410] font-medium"
								>
									Sign in here
								</a>
							</p>
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}
