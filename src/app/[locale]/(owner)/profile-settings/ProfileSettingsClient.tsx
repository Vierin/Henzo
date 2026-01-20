'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-unified';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/LoadingSpinner';
import { apiClient } from '@/lib/api-client';
import { useTranslation } from '@/contexts/LanguageContext';
import { useAuthStore } from '@/stores/authStore';

export default function ProfileSettingsClient() {
	const { user } = useAuth();
	const t = useTranslation();
	const [isSavingProfile, setIsSavingProfile] = useState(false);
	const [isSavingPassword, setIsSavingPassword] = useState(false);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [deleteLoading, setDeleteLoading] = useState(false);

	const [profileData, setProfileData] = useState({
		name: '',
		email: '',
		phone: '',
	});

	const [passwordData, setPasswordData] = useState({
		currentPassword: '',
		newPassword: '',
		confirmPassword: '',
	});

	useEffect(() => {
		if (user) {
			setProfileData({
				name: user.name || '',
				email: user.email || '',
				phone: user.phone || '',
			});
		}
	}, [user]);

	const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setProfileData({
			...profileData,
			[e.target.name]: e.target.value,
		});
	};

	const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setPasswordData({
			...passwordData,
			[e.target.name]: e.target.value,
		});
	};

	const handleSaveProfile = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSavingProfile(true);

		try {
			const response = await apiClient.put<{ success: boolean; user: any }>(
				'/auth/profile',
				{
					name: profileData.name,
					phone: profileData.phone,
					// Email не обновляем через этот endpoint, нужен отдельный для смены email
				}
			);

			// Обновляем данные пользователя в store
			if (response.user) {
				useAuthStore.getState().setUser(response.user);
			}

			toast.success(t('owner.profileSettings.profileUpdated'));
		} catch (error: any) {
			console.error('Error updating profile:', error);
			toast.error(error.message || t('owner.profileSettings.failedToUpdate'));
		} finally {
			setIsSavingProfile(false);
		}
	};

	const handleChangePassword = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSavingPassword(true);

		try {
			if (passwordData.newPassword !== passwordData.confirmPassword) {
				toast.error(t('owner.profileSettings.passwordsDoNotMatch'));
				return;
			}

			if (passwordData.newPassword.length < 8) {
				toast.error(t('owner.profileSettings.passwordMinLength'));
				return;
			}

			// Используем Supabase для смены пароля
			const { error } = await supabase.auth.updateUser({
				password: passwordData.newPassword,
			});

			if (error) throw error;

			toast.success(t('owner.profileSettings.passwordChanged'));
			setPasswordData({
				currentPassword: '',
				newPassword: '',
				confirmPassword: '',
			});
		} catch (error: any) {
			console.error('Error changing password:', error);
			toast.error(
				error.message || t('owner.profileSettings.failedToChangePassword')
			);
		} finally {
			setIsSavingPassword(false);
		}
	};

	const handleDeleteAccount = async () => {
		setDeleteLoading(true);
		try {
			await apiClient.delete('/auth/account');
			toast.success(t('owner.profileSettings.accountDeleted'));
			setTimeout(() => {
				window.location.href = '/';
			}, 2000);
		} catch (error: any) {
			console.error('Error deleting account:', error);
			toast.error(error.message || t('owner.profileSettings.failedToDelete'));
		} finally {
			setDeleteLoading(false);
		}
	};

	return (
		<div className="px-4 md:px-8 py-6 w-full max-w-7xl mx-auto">
			<div className="text-center mb-8">
				<h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-2 md:mb-4">
					{t('owner.profileSettings.title')}
				</h1>
				<p className="text-sm md:text-lg text-gray-600 px-4 md:px-0">
					{t('owner.profileSettings.subtitle')}
				</p>
			</div>

			<div className="space-y-6 md:space-y-8">
				{/* Personal Information Section */}
				<div className="bg-white border border-gray-200 rounded-lg p-3 md:p-6">
					<h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-4 md:mb-6">
						{t('owner.profileSettings.personalInformation')}
					</h2>

					<form onSubmit={handleSaveProfile} className="space-y-6">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								{t('owner.profileSettings.fullName')}
							</label>
							<input
								type="text"
								name="name"
								value={profileData.name}
								onChange={handleProfileChange}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
								placeholder={t('owner.profileSettings.fullNamePlaceholder')}
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								{t('owner.profileSettings.emailAddress')}
							</label>
							<input
								type="email"
								name="email"
								value={profileData.email}
								disabled
								className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
							/>
							<p className="text-sm text-gray-500 mt-1">
								{t('owner.profileSettings.emailCannotBeChanged')}
							</p>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								{t('owner.profileSettings.phoneNumber')}
							</label>
							<input
								type="tel"
								name="phone"
								value={profileData.phone}
								onChange={handleProfileChange}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
								placeholder={t('owner.profileSettings.phonePlaceholder')}
							/>
						</div>

						<div className="flex justify-end pt-4">
							<button
								type="submit"
								disabled={isSavingProfile}
								className="px-6 py-2 bg-[#ff5b5b] !text-white rounded-lg font-medium hover:bg-[#e04a4a]   disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{isSavingProfile
									? t('owner.profileSettings.saving')
									: t('owner.profileSettings.saveChanges')}
							</button>
						</div>
					</form>
				</div>

				{/* Security Section */}
				<div className="bg-white border border-gray-200 rounded-lg p-3 md:p-6">
					<h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-4 md:mb-6">
						{t('owner.profileSettings.security')}
					</h2>

					<form onSubmit={handleChangePassword} className="space-y-6">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								{t('owner.profileSettings.currentPassword')}
							</label>
							<input
								type="password"
								name="currentPassword"
								value={passwordData.currentPassword}
								onChange={handlePasswordChange}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
								placeholder={t(
									'owner.profileSettings.currentPasswordPlaceholder'
								)}
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								{t('owner.profileSettings.newPassword')}
							</label>
							<input
								type="password"
								name="newPassword"
								value={passwordData.newPassword}
								onChange={handlePasswordChange}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
								placeholder={t('owner.profileSettings.newPasswordPlaceholder')}
							/>
							<p className="text-sm text-gray-500 mt-1">
								{t('owner.profileSettings.passwordMinLength')}
							</p>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								{t('owner.profileSettings.confirmNewPassword')}
							</label>
							<input
								type="password"
								name="confirmPassword"
								value={passwordData.confirmPassword}
								onChange={handlePasswordChange}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
								placeholder={t(
									'owner.profileSettings.confirmPasswordPlaceholder'
								)}
							/>
						</div>

						<div className="flex justify-end pt-4">
							<button
								type="submit"
								disabled={isSavingPassword}
								className="px-6 py-2 bg-[#ff5b5b] !text-white rounded-lg font-medium hover:bg-[#e04a4a] disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{isSavingPassword
									? t('owner.profileSettings.changing')
									: t('owner.profileSettings.changePasswordButton')}
							</button>
						</div>
					</form>
				</div>

				{/* Delete Account Section */}
				<div className="bg-white border border-red-200 rounded-lg p-3 md:p-6">
					<h2 className="text-xl md:text-2xl font-semibold text-red-600 mb-4 md:mb-6">
						{t('owner.profileSettings.dangerZone')}
					</h2>

					<div className="space-y-4">
						<p className="text-sm text-gray-600">
							{t('owner.profileSettings.deleteAccountDescription')}
						</p>

						<button
							type="button"
							onClick={() => setShowDeleteModal(true)}
							className="px-6 py-2 bg-red-600 !text-white rounded-lg font-medium hover:bg-red-700"
						>
							{t('owner.profileSettings.deleteAccount')}
						</button>
					</div>
				</div>
			</div>

			{/* Delete Account Modal */}
			{showDeleteModal && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
						<h3 className="text-xl font-bold text-gray-900 mb-4">
							{t('owner.profileSettings.confirmDelete')}
						</h3>
						<p className="text-gray-600 mb-6">
							{t('owner.profileSettings.deleteWarning')}
						</p>
						<div className="flex gap-4">
							<button
								type="button"
								onClick={() => setShowDeleteModal(false)}
								disabled={deleteLoading}
								className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
							>
								{t('owner.profileSettings.cancel')}
							</button>
							<button
								type="button"
								onClick={handleDeleteAccount}
								disabled={deleteLoading}
								className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{deleteLoading
									? t('owner.profileSettings.deleting')
									: t('owner.profileSettings.confirmDeleteButton')}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
