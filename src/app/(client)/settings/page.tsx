'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';

export default function ClientSettingsPage() {
	const { user, isClient, isLoading, isInitialized, refreshUser } = useAuthStore();
	const router = useRouter();

	const [formData, setFormData] = useState({
		name: '',
		email: '',
		phone: '',
	});

	const [passwordData, setPasswordData] = useState({
		currentPassword: '',
		newPassword: '',
		confirmPassword: '',
	});

	const [loading, setLoading] = useState(false);
	const [passwordLoading, setPasswordLoading] = useState(false);

	// Redirect if not authenticated (only after initialization)
	useEffect(() => {
		if (isInitialized && !isClient) {
			router.push('/client/login');
		}
	}, [isInitialized, isClient, router]);

	// Initialize form data from user
	useEffect(() => {
		if (user) {
			setFormData({
				name: user.name || '',
				email: user.email || '',
				phone: user.phone || '',
			});
		}
	}, [user]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);

		try {
			// Update user profile in our database
			const response = await apiClient.put('/auth/profile', {
				name: formData.name,
				email: formData.email,
				phone: formData.phone,
			});

			// Update Supabase Auth metadata (for display purposes)
			const { error: supabaseError } = await supabase.auth.updateUser({
				data: {
					name: formData.name,
					phone: formData.phone,
				},
			});

			if (supabaseError) {
				console.warn('Supabase metadata update failed:', supabaseError);
				// Don't throw error, as the main update succeeded
			}

			// If email changed, update it in Supabase Auth separately
			if (formData.email !== user?.email) {
				const { error: emailError } = await supabase.auth.updateUser({
					email: formData.email,
				});

				if (emailError) {
					console.warn('Supabase email update failed:', emailError);
					// Don't throw error, as the main update succeeded
				}

				toast.success(
					'Settings saved! Please check your email to confirm the new email address.'
				);
			} else {
				toast.success('Settings saved successfully!');
			}

			// Refresh user data from our API
			await refreshUser();
		} catch (error: any) {
			toast.error(error.message || 'Failed to save settings');
		} finally {
			setLoading(false);
		}
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setFormData((prev) => ({
			...prev,
			[name]: value,
		}));
	};

	const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setPasswordData((prev) => ({
			...prev,
			[name]: value,
		}));
	};

	const handlePasswordSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (passwordData.newPassword !== passwordData.confirmPassword) {
			toast.error('New passwords do not match');
			return;
		}

		if (passwordData.newPassword.length < 6) {
			toast.error('Password must be at least 6 characters long');
			return;
		}

		setPasswordLoading(true);

		try {
			const { error } = await supabase.auth.updateUser({
				password: passwordData.newPassword,
			});

			if (error) {
				throw error;
			}

			toast.success('Password updated successfully!');
			setPasswordData({
				currentPassword: '',
				newPassword: '',
				confirmPassword: '',
			});
		} catch (error: any) {
			toast.error(error.message || 'Failed to update password');
		} finally {
			setPasswordLoading(false);
		}
	};

	if (!isInitialized || isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff5b5b]"></div>
			</div>
		);
	}

	if (!isClient) {
		return null; // Will redirect to login
	}

	return (
		<div>
			<h1 className="text-3xl font-bold text-gray-900 mb-8">
				Account Settings
			</h1>

			<form onSubmit={handleSubmit} className="max-w-2xl">
				<div className="bg-white rounded-xl p-6 shadow-sm">
					<h2 className="text-xl font-semibold text-gray-900 mb-6">
						Personal Information
					</h2>

					<div className="space-y-6">
						{/* Name */}
						<div>
							<label
								htmlFor="name"
								className="block text-sm font-medium text-gray-700 mb-2"
							>
								Full Name
							</label>
							<input
								type="text"
								id="name"
								name="name"
								value={formData.name}
								onChange={handleInputChange}
								className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-gray-900"
								required
							/>
						</div>

						{/* Email */}
						<div>
							<label
								htmlFor="email"
								className="block text-sm font-medium text-gray-700 mb-2"
							>
								Email Address
							</label>
							<input
								type="email"
								id="email"
								name="email"
								value={formData.email}
								onChange={handleInputChange}
								className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-gray-900"
								required
							/>
						</div>

						{/* Phone */}
						<div>
							<label
								htmlFor="phone"
								className="block text-sm font-medium text-gray-700 mb-2"
							>
								Phone Number
							</label>
							<input
								type="tel"
								id="phone"
								name="phone"
								value={formData.phone}
								onChange={handleInputChange}
								className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-gray-900"
							/>
						</div>
					</div>

					{/* Save Button */}
					<div className="mt-8 pt-6 border-t border-gray-200">
						<button
							type="submit"
							disabled={loading}
							className="bg-[#ff5b5b] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#e04a4a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{loading ? 'Saving...' : 'Save Changes'}
						</button>
					</div>
				</div>
			</form>

			{/* Password Change Section */}
			<div className="mt-8">
				<form onSubmit={handlePasswordSubmit} className="max-w-2xl">
					<div className="bg-white rounded-xl p-6 shadow-sm">
						<h2 className="text-xl font-semibold text-gray-900 mb-6">
							Change Password
						</h2>

						<div className="space-y-6">
							{/* Current Password */}
							<div>
								<label
									htmlFor="currentPassword"
									className="block text-sm font-medium text-gray-700 mb-2"
								>
									Current Password
								</label>
								<input
									type="password"
									id="currentPassword"
									name="currentPassword"
									value={passwordData.currentPassword}
									onChange={handlePasswordChange}
									className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-gray-900"
									required
								/>
							</div>

							{/* New Password */}
							<div>
								<label
									htmlFor="newPassword"
									className="block text-sm font-medium text-gray-700 mb-2"
								>
									New Password
								</label>
								<input
									type="password"
									id="newPassword"
									name="newPassword"
									value={passwordData.newPassword}
									onChange={handlePasswordChange}
									className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-gray-900"
									required
									minLength={6}
								/>
							</div>

							{/* Confirm Password */}
							<div>
								<label
									htmlFor="confirmPassword"
									className="block text-sm font-medium text-gray-700 mb-2"
								>
									Confirm New Password
								</label>
								<input
									type="password"
									id="confirmPassword"
									name="confirmPassword"
									value={passwordData.confirmPassword}
									onChange={handlePasswordChange}
									className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-gray-900"
									required
									minLength={6}
								/>
							</div>
						</div>

						{/* Save Button */}
						<div className="mt-8 pt-6 border-t border-gray-200">
							<button
								type="submit"
								disabled={passwordLoading}
								className="bg-[#ff5b5b] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#e04a4a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{passwordLoading ? 'Updating...' : 'Update Password'}
							</button>
						</div>
					</div>
				</form>
			</div>
		</div>
	);
}
