'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth-unified';
import { useTranslation } from '@/contexts/LanguageContext';

export default function BusinessRegisterClient() {
	const t = useTranslation();
	const searchParams = useSearchParams();
	const inviteCodeFromUrl = searchParams.get('invite') || '';
	const emailFromUrl = searchParams.get('email') || '';

	// Check if coming from invite link (both invite code and email present)
	const isInviteLink = !!(inviteCodeFromUrl && emailFromUrl);

	const [formData, setFormData] = useState({
		email: emailFromUrl,
		password: '',
		confirmPassword: '',
		name: '',
		inviteCode: inviteCodeFromUrl,
	});
	const [loading, setLoading] = useState(false);
	const [validatingCode, setValidatingCode] = useState(false);
	const [codeValid, setCodeValid] = useState<boolean | null>(null);
	const router = useRouter();
	const { registerOwner, isAuthenticated, user } = useAuth();

	// Редирект если уже авторизован
	useEffect(() => {
		if (isAuthenticated && user) {
			switch (user.role) {
				case 'ADMIN':
					router.push('/admin-panel');
					break;
				case 'OWNER':
					router.push('/business/complete-setup');
					break;
				case 'CLIENT':
					router.push('/dashboard');
					break;
				default:
					router.push('/');
					break;
			}
		}
	}, [isAuthenticated, user, router]);

	// Валидация инвайт-кода при изменении
	useEffect(() => {
		const validateInviteCode = async () => {
			if (!formData.inviteCode) {
				setCodeValid(null);
				return;
			}

			setValidatingCode(true);
			try {
				const API_URL =
					process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
				const response = await fetch(
					`${API_URL}/invite-codes/validate/${formData.inviteCode}`
				);
				const result = await response.json();
				setCodeValid(result.valid);
				if (!result.valid) {
					toast.error(result.error || t.business.register.invalidInviteCode);
				}
			} catch (error) {
				setCodeValid(false);
				console.error('Code validation error:', error);
			} finally {
				setValidatingCode(false);
			}
		};

		const debounce = setTimeout(validateInviteCode, 500);
		return () => clearTimeout(debounce);
	}, [formData.inviteCode]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);

		// Проверка инвайт-кода
		if (!formData.inviteCode) {
			toast.error(t.business.register.inviteCodeRequiredError);
			setLoading(false);
			return;
		}

		if (codeValid === false) {
			toast.error(t.business.register.pleaseEnterValidCode);
			setLoading(false);
			return;
		}

		if (formData.password !== formData.confirmPassword) {
			toast.error(t.business.register.passwordsDoNotMatch);
			setLoading(false);
			return;
		}

		if (formData.password.length < 6) {
			toast.error(t.business.register.passwordTooShort);
			setLoading(false);
			return;
		}

		try {
			const result = await registerOwner({
				email: formData.email,
				password: formData.password,
				name: formData.name,
				inviteCode: formData.inviteCode,
				fromInviteLink: isInviteLink,
			});

			if (result.success) {
				// Если email уже подтвержден (регистрация по инвайт-ссылке), редиректим на complete-setup
				if (result.emailConfirmed) {
					toast.success(t.business.register.registrationSuccessful);
					router.push('/business/complete-setup');
				} else {
					// Обычная регистрация - требуется подтверждение email
					toast.success(t.business.register.registrationSuccessfulEmail);
					router.push(
						`/check-email?email=${encodeURIComponent(formData.email)}&type=business`
					);
				}
			} else {
				toast.error(result.error || t.business.register.failedToRegister);
			}
		} catch (error: any) {
			console.error('Business registration error:', error);
			toast.error(error.message || t.business.register.failedToRegister);
		} finally {
			setLoading(false);
		}
	};

	const handleGoogleRegister = async () => {
		if (!formData.inviteCode) {
			toast.error(t.business.register.pleaseEnterInviteCode);
			return;
		}

		if (codeValid === false) {
			toast.error(t.business.register.pleaseEnterValidCode);
			return;
		}

		setLoading(true);
		try {
			// Store invite code for OAuth flow
			sessionStorage.setItem('inviteCode', formData.inviteCode);
			localStorage.setItem('registrationType', 'business');
			sessionStorage.setItem('registrationType', 'business');

			const frontendUrl =
				process.env.NEXT_PUBLIC_FRONTEND_URL || window.location.origin;
			const { data, error } = await supabase.auth.signInWithOAuth({
				provider: 'google',
				options: {
					redirectTo: `${frontendUrl}/auth/callback?type=business`,
					queryParams: {
						access_type: 'offline',
						prompt: 'consent',
					},
				},
			});

			if (error) {
				throw error;
			}
		} catch (error: any) {
			console.error('Google business registration error:', error);
			toast.error(error.message || t.business.register.failedToRegisterGoogle);
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
					<h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
						{t.business.register.title}
					</h2>
					<p className="mt-2 text-center text-sm text-gray-600">
						{t.business.register.subtitle}
					</p>
				</div>
				<form className="mt-8 space-y-6" onSubmit={handleSubmit}>
					<div className="space-y-4">
						{/* Owner Name */}
						<div>
							<label
								htmlFor="name"
								className="block text-sm font-medium text-gray-700"
							>
								{t.business.register.ownerFullName}
							</label>
							<input
								id="name"
								name="name"
								type="text"
								required
								className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm text-gray-900"
								placeholder={t.business.register.ownerFullNamePlaceholder}
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
								{t.business.register.emailAddress}
							</label>
							<input
								id="email"
								name="email"
								type="email"
								autoComplete="email"
								required
								readOnly={isInviteLink}
								className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm text-gray-900 ${
									isInviteLink ? 'bg-gray-100 cursor-not-allowed' : ''
								}`}
								placeholder={t.business.register.emailPlaceholder}
								value={formData.email}
								onChange={handleInputChange}
							/>
							{isInviteLink && (
								<p className="mt-1 text-xs text-gray-500">
									{t.business.register.emailVerified}
								</p>
							)}
						</div>

						{/* Password */}
						<div>
							<label
								htmlFor="password"
								className="block text-sm font-medium text-gray-700"
							>
								{t.business.register.password}
							</label>
							<input
								id="password"
								name="password"
								type="password"
								autoComplete="new-password"
								required
								className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm text-gray-900"
								placeholder={t.business.register.passwordPlaceholder}
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
								{t.business.register.confirmPassword}
							</label>
							<input
								id="confirmPassword"
								name="confirmPassword"
								type="password"
								autoComplete="new-password"
								required
								className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm text-gray-900"
								placeholder={t.business.register.confirmPasswordPlaceholder}
								value={formData.confirmPassword}
								onChange={handleInputChange}
							/>
						</div>

						{/* Invite Code */}
						<div>
							<label
								htmlFor="inviteCode"
								className="block text-sm font-medium text-gray-700"
							>
								{t.business.register.inviteCode}{' '}
								<span className="text-red-500">*</span>
							</label>
							<div className="mt-1 relative">
								<input
									id="inviteCode"
									name="inviteCode"
									type="text"
									required
									readOnly={isInviteLink}
									className={`block w-full px-3 py-2 pr-10 border ${
										codeValid === true
											? 'border-green-500 focus:ring-green-500 focus:border-green-500'
											: codeValid === false
												? 'border-red-500 focus:ring-red-500 focus:border-red-500'
												: 'border-gray-300 focus:ring-orange-500 focus:border-orange-500'
									} rounded-md shadow-sm focus:outline-none sm:text-sm text-gray-900 ${
										isInviteLink ? 'bg-gray-100 cursor-not-allowed' : ''
									}`}
									placeholder={t.business.register.inviteCodePlaceholder}
									value={formData.inviteCode}
									onChange={handleInputChange}
								/>
								{/* Validation Icon */}
								<div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
									{validatingCode && (
										<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500"></div>
									)}
									{!validatingCode && codeValid === true && (
										<svg
											className="h-5 w-5 text-green-500"
											fill="currentColor"
											viewBox="0 0 20 20"
										>
											<path
												fillRule="evenodd"
												d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
												clipRule="evenodd"
											/>
										</svg>
									)}
									{!validatingCode && codeValid === false && (
										<svg
											className="h-5 w-5 text-red-500"
											fill="currentColor"
											viewBox="0 0 20 20"
										>
											<path
												fillRule="evenodd"
												d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
												clipRule="evenodd"
											/>
										</svg>
									)}
								</div>
							</div>
							<p className="mt-1 text-xs text-gray-500">
								{isInviteLink
									? t.business.register.inviteCodeApplied
									: t.business.register.inviteCodeRequired}
							</p>
						</div>
					</div>

					<div>
						<button
							type="submit"
							disabled={loading || validatingCode || codeValid === false}
							className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{loading ? (
								<div className="flex items-center gap-2">
									<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
									<span>{t.business.register.creatingAccount}</span>
								</div>
							) : (
								t.business.register.createBusinessAccount
							)}
						</button>
					</div>

					{/* Divider */}
					<div className="relative">
						<div className="absolute inset-0 flex items-center">
							<div className="w-full border-t border-gray-300" />
						</div>
						<div className="relative flex justify-center text-sm">
							<span className="px-2 bg-gray-50 text-gray-500">
								{t.business.register.orContinueWith}
							</span>
						</div>
					</div>

					{/* Google OAuth Button */}
					<div>
						<button
							type="button"
							onClick={handleGoogleRegister}
							disabled={loading || !formData.inviteCode || codeValid === false}
							className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
								<path
									fill="#4285F4"
									d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
								/>
								<path
									fill="#34A853"
									d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
								/>
								<path
									fill="#FBBC05"
									d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
								/>
								<path
									fill="#EA4335"
									d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
								/>
							</svg>
							{t.business.register.continueWithGoogle}
						</button>
					</div>

					<div className="text-center space-y-4">
						<p className="text-sm text-gray-600">
							{t.business.register.alreadyHaveAccount}{' '}
							<a
								href="/login"
								className="font-medium text-orange-600 hover:text-orange-700"
							>
								{t.business.register.signIn}
							</a>
						</p>
						<div className="border-t border-gray-200 pt-4">
							<p className="text-sm text-gray-600 mb-2">
								{t.business.register.lookingToBook}
							</p>
							<a
								href="/register"
								className="text-sm font-medium text-[#ff5b5b] hover:text-[#ff4545]"
							>
								{t.business.register.registerAsClient}
							</a>
						</div>
					</div>
				</form>
			</div>
		</div>
	);
}
