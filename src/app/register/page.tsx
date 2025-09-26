'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/authStore';

export default function RegisterPage() {
	const [formData, setFormData] = useState({
		email: '',
		password: '',
		confirmPassword: '',
		name: '',
		phone: '',
		role: 'CLIENT' as 'CLIENT' | 'OWNER',
	});
	const [loading, setLoading] = useState(false);
	const router = useRouter();
	const { setUser, setSession } = useAuthStore();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);

		if (formData.password !== formData.confirmPassword) {
			toast.error('Passwords do not match');
			setLoading(false);
			return;
		}

		try {
			// Используем Supabase для регистрации всех типов пользователей
			const { data, error } = await supabase.auth.signUp({
				email: formData.email,
				password: formData.password,
				options: {
					data: {
						name: formData.name,
						phone: formData.phone,
						role: formData.role,
					},
				},
			});

			if (error) {
				throw error;
			}

			if (data.user) {
				toast.success(
					'Registration successful! Please check your email to verify your account.'
				);
				router.push('/login');
			}
		} catch (error: any) {
			console.error('Registration error:', error);
			toast.error(error.message || 'Failed to register');
		} finally {
			setLoading(false);
		}
	};

	const handleInputChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
	) => {
		const { name, value } = e.target;
		setFormData((prev) => ({
			...prev,
			[name]: value,
		}));
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
			<div className="max-w-md w-full space-y-8">
				<div>
					<div className="mx-auto h-12 w-12 flex items-center justify-center">
						<span className="text-3xl">💇‍♀️</span>
					</div>
					<h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
						Create your account
					</h2>
					<p className="mt-2 text-center text-sm text-gray-600">
						Join as a client or salon owner
					</p>
				</div>
				<form className="mt-8 space-y-6" onSubmit={handleSubmit}>
					<div className="space-y-4">
						{/* Role Selection */}
						<div>
							<label
								htmlFor="role"
								className="block text-sm font-medium text-gray-700"
							>
								Account Type
							</label>
							<select
								id="role"
								name="role"
								value={formData.role}
								onChange={handleInputChange}
								className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#ff5b5b] focus:border-[#ff5b5b] sm:text-sm"
							>
								<option value="CLIENT">Client - Book salon services</option>
								<option value="OWNER">Salon Owner - Manage your salon</option>
							</select>
						</div>

						{/* Name */}
						<div>
							<label
								htmlFor="name"
								className="block text-sm font-medium text-gray-700"
							>
								Full Name
							</label>
							<input
								id="name"
								name="name"
								type="text"
								required
								className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#ff5b5b] focus:border-[#ff5b5b] sm:text-sm"
								placeholder="Enter your full name"
								value={formData.name}
								onChange={handleInputChange}
							/>
						</div>

						{/* Email */}
						<div>
							<label
								htmlFor="email"
								className="block text-sm font-medium text-gray-700"
							>
								Email Address
							</label>
							<input
								id="email"
								name="email"
								type="email"
								autoComplete="email"
								required
								className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#ff5b5b] focus:border-[#ff5b5b] sm:text-sm"
								placeholder="Enter your email"
								value={formData.email}
								onChange={handleInputChange}
							/>
						</div>

						{/* Phone */}
						<div>
							<label
								htmlFor="phone"
								className="block text-sm font-medium text-gray-700"
							>
								Phone Number
							</label>
							<input
								id="phone"
								name="phone"
								type="tel"
								className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#ff5b5b] focus:border-[#ff5b5b] sm:text-sm"
								placeholder="Enter your phone number"
								value={formData.phone}
								onChange={handleInputChange}
							/>
						</div>

						{/* Password */}
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
								autoComplete="new-password"
								required
								className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#ff5b5b] focus:border-[#ff5b5b] sm:text-sm"
								placeholder="Create a password"
								value={formData.password}
								onChange={handleInputChange}
							/>
						</div>

						{/* Confirm Password */}
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
								autoComplete="new-password"
								required
								className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#ff5b5b] focus:border-[#ff5b5b] sm:text-sm"
								placeholder="Confirm your password"
								value={formData.confirmPassword}
								onChange={handleInputChange}
							/>
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
								'Create Account'
							)}
						</button>
					</div>

					<div className="text-center">
						<p className="text-sm text-gray-600">
							Already have an account?{' '}
							<a
								href="/login"
								className="font-medium text-[#ff5b5b] hover:text-[#ff5b5b]"
							>
								Sign in
							</a>
						</p>
					</div>
				</form>
			</div>
		</div>
	);
}
