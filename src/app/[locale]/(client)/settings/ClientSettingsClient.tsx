'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-unified';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/LoadingSpinner';
import { apiClient } from '@/lib/api-client';
import { useTranslation } from '@/contexts/LanguageContext';

export default function ClientSettingsClient() {
	const { user } = useAuth();
	const t = useTranslation();
	const [isLoading, setIsLoading] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [deleteLoading, setDeleteLoading] = useState(false);
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
			// For now, just show success message
			// Profile update should be handled through API endpoint
			toast.success(t('clientSettings.profileUpdated'));
		} catch (error) {
			console.error('Error updating profile:', error);
			toast.error(t('clientSettings.failedToUpdate'));
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
				toast.error(t('clientSettings.passwordsDoNotMatch'));
				return;
			}

			if (passwordData.newPassword.length < 6) {
				toast.error(t('clientSettings.passwordMinLength'));
				return;
			}

			const { error } = await supabase.auth.updateUser({
				password: passwordData.newPassword,
			});

			if (error) throw error;

			toast.success(t('clientSettings.passwordChanged'));
			setPasswordData({
				currentPassword: '',
				newPassword: '',
				confirmPassword: '',
			});
		} catch (error: any) {
			console.error('Error changing password:', error);
			toast.error(error.message || t('clientSettings.failedToChangePassword'));
		} finally {
			setIsSaving(false);
		}
	};

	const handleDeleteAccount = async () => {
		setDeleteLoading(true);
		try {
			// Вызываем API для удаления аккаунта
			await apiClient.delete('/auth/account');

			toast.success(t('clientSettings.accountDeleted'));

			// Перенаправляем на главную страницу
			setTimeout(() => {
				window.location.href = '/';
			}, 2000);
		} catch (error: any) {
			console.error('Error deleting account:', error);
			toast.error(error.message || t('clientSettings.failedToDelete'));
		} finally {
			setDeleteLoading(false);
		}
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<LoadingSpinner size="lg" message={t('clientSettings.loadingSettings')} />
			</div>
		);
	}

	return (
		<main role="main" aria-labelledby="settings-heading">
			<header className="mb-8">
				<h1 id="settings-heading" className="text-3xl font-bold text-gray-900">
					{t('clientSettings.title')}
				</h1>
				<p className="text-gray-600 mt-2">{t('clientSettings.subtitle')}</p>
			</header>

			<div className="space-y-6">
				{/* Profile Information */}
				<section className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
					<h2 className="text-xl font-semibold text-gray-900 mb-6">
						{t('clientSettings.profileInformation')}
					</h2>

					<form onSubmit={handleSaveProfile} className="space-y-4">
						<div>
							<label
								htmlFor="name"
								className="block text-sm font-medium text-gray-700 mb-2"
							>
								{t('clientSettings.fullName')}
							</label>
							<input
								type="text"
								id="name"
								name="name"
								value={formData.name}
								onChange={handleInputChange}
								className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent"
								placeholder={t('clientSettings.fullNamePlaceholder')}
							/>
						</div>

						<div>
							<label
								htmlFor="email"
								className="block text-sm font-medium text-gray-700 mb-2"
							>
								{t('clientSettings.emailAddress')}
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
								{t('clientSettings.emailCannotBeChanged')}
							</p>
						</div>

						<div>
							<label
								htmlFor="phone"
								className="block text-sm font-medium text-gray-700 mb-2"
							>
								{t('clientSettings.phoneNumber')}
							</label>
							<input
								type="tel"
								id="phone"
								name="phone"
								value={formData.phone}
								onChange={handleInputChange}
								className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent"
								placeholder={t('clientSettings.phonePlaceholder')}
							/>
						</div>

						<div className="flex justify-end pt-4">
							<button
								type="submit"
								disabled={isSaving}
								className="px-6 py-2 bg-[#ff5b5b] text-white rounded-lg font-medium hover:bg-[#e04a4a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{isSaving ? t('clientSettings.saving') : t('clientSettings.saveChanges')}
							</button>
						</div>
					</form>
				</section>

				{/* Change Password */}
				<section className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
					<h2 className="text-xl font-semibold text-gray-900 mb-6">
						{t('clientSettings.changePassword')}
					</h2>

					<form onSubmit={handleChangePassword} className="space-y-4">
						<div>
							<label
								htmlFor="currentPassword"
								className="block text-sm font-medium text-gray-700 mb-2"
							>
								{t('clientSettings.currentPassword')}
							</label>
							<input
								type="password"
								id="currentPassword"
								name="currentPassword"
								value={passwordData.currentPassword}
								onChange={handlePasswordChange}
								className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent"
								placeholder={t('clientSettings.currentPasswordPlaceholder')}
							/>
						</div>

						<div>
							<label
								htmlFor="newPassword"
								className="block text-sm font-medium text-gray-700 mb-2"
							>
								{t('clientSettings.newPassword')}
							</label>
							<input
								type="password"
								id="newPassword"
								name="newPassword"
								value={passwordData.newPassword}
								onChange={handlePasswordChange}
								className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent"
								placeholder={t('clientSettings.newPasswordPlaceholder')}
							/>
							<p className="text-sm text-gray-500 mt-1">
								{t('clientSettings.passwordMinLength')}
							</p>
						</div>

						<div>
							<label
								htmlFor="confirmPassword"
								className="block text-sm font-medium text-gray-700 mb-2"
							>
								{t('clientSettings.confirmNewPassword')}
							</label>
							<input
								type="password"
								id="confirmPassword"
								name="confirmPassword"
								value={passwordData.confirmPassword}
								onChange={handlePasswordChange}
								className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent"
								placeholder={t('clientSettings.confirmPasswordPlaceholder')}
							/>
						</div>

						<div className="flex justify-end pt-4">
							<button
								type="submit"
								disabled={isSaving}
								className="px-6 py-2 bg-[#ff5b5b] text-white rounded-lg font-medium hover:bg-[#e04a4a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{isSaving ? t('clientSettings.changing') : t('clientSettings.changePasswordButton')}
							</button>
						</div>
					</form>
				</section>
			</div>
		</main>
	);
}
