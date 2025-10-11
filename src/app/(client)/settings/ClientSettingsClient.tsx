'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function ClientSettingsClient() {
	const { user, setUser } = useAuthStore();
	const [isLoading, setIsLoading] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [formData, setFormData] = useState({
		name: '',
		email: '',
		phone: '',
	});

	useEffect(() => {
		if (user) {
			setFormData({
				name: user.name || '',
				email: user.email || '',
				phone: user.phone || '',
			});
		}
	}, [user]);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setFormData({
			...formData,
			[e.target.name]: e.target.value,
		});
	};

	const handleSaveProfile = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSaving(true);

		try {
			// TODO: Update client profile via API
			// For now, just update local state
			const updatedUser = {
				...user,
				name: formData.name,
				phone: formData.phone,
			};

			setUser(updatedUser as any);
			toast.success('Profile updated successfully!');
		} catch (error) {
			console.error('Error updating profile:', error);
			toast.error('Failed to update profile');
		} finally {
			setIsSaving(false);
		}
	};

	const [passwordData, setPasswordData] = useState({
		currentPassword: '',
		newPassword: '',
		confirmPassword: '',
	});

	const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setPasswordData({
			...passwordData,
			[e.target.name]: e.target.value,
		});
	};

	const handleChangePassword = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSaving(true);

		try {
			if (passwordData.newPassword !== passwordData.confirmPassword) {
				toast.error('New passwords do not match');
				return;
			}

			if (passwordData.newPassword.length < 6) {
				toast.error('Password must be at least 6 characters');
				return;
			}

			const { error } = await supabase.auth.updateUser({
				password: passwordData.newPassword,
			});

			if (error) throw error;

			toast.success('Password changed successfully!');
			setPasswordData({
				currentPassword: '',
				newPassword: '',
				confirmPassword: '',
			});
		} catch (error: any) {
			console.error('Error changing password:', error);
			toast.error(error.message || 'Failed to change password');
		} finally {
			setIsSaving(false);
		}
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<LoadingSpinner size="lg" message="Loading settings..." />
			</div>
		);
	}

	return (
		<main role="main" aria-labelledby="settings-heading">
			<header className="mb-8">
				<h1 id="settings-heading" className="text-3xl font-bold text-gray-900">
					Account Settings
				</h1>
				<p className="text-gray-600 mt-2">
					Manage your account settings and preferences
				</p>
			</header>

			<div className="space-y-6">
				{/* Profile Information */}
				<section className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
					<h2 className="text-xl font-semibold text-gray-900 mb-6">
						Profile Information
					</h2>

					<form onSubmit={handleSaveProfile} className="space-y-4">
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
								className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent"
								placeholder="Enter your full name"
							/>
						</div>

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
								disabled
								className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
								placeholder="your@email.com"
							/>
							<p className="text-sm text-gray-500 mt-1">
								Email cannot be changed
							</p>
						</div>

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
								className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent"
								placeholder="+84 123 456 789"
							/>
						</div>

						<div className="flex justify-end pt-4">
							<button
								type="submit"
								disabled={isSaving}
								className="px-6 py-2 bg-[#ff5b5b] text-white rounded-lg font-medium hover:bg-[#e04a4a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{isSaving ? 'Saving...' : 'Save Changes'}
							</button>
						</div>
					</form>
				</section>

				{/* Change Password */}
				<section className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
					<h2 className="text-xl font-semibold text-gray-900 mb-6">
						Change Password
					</h2>

					<form onSubmit={handleChangePassword} className="space-y-4">
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
								className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent"
								placeholder="Enter current password"
							/>
						</div>

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
								className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent"
								placeholder="Enter new password"
							/>
							<p className="text-sm text-gray-500 mt-1">
								Must be at least 6 characters
							</p>
						</div>

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
								className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent"
								placeholder="Confirm new password"
							/>
						</div>

						<div className="flex justify-end pt-4">
							<button
								type="submit"
								disabled={isSaving}
								className="px-6 py-2 bg-[#ff5b5b] text-white rounded-lg font-medium hover:bg-[#e04a4a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{isSaving ? 'Changing...' : 'Change Password'}
							</button>
						</div>
					</form>
				</section>
			</div>
		</main>
	);
}
