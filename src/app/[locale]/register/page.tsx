'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth-unified';
import { useTranslation } from '@/contexts/LanguageContext';
import { withLocale, extractLocaleFromPath } from '@/i18n/routing';
import Link from 'next/link';

export default function RegisterPage() {
	const [formData, setFormData] = useState({
		name: '',
		email: '',
		phone: '',
		password: '',
		confirmPassword: '',
	});
	const [loading, setLoading] = useState(false);
	const router = useRouter();
	const pathname = usePathname();
	const { registerClient, isAuthenticated, user } = useAuth();
	const t = useTranslation();

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

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		// Валидация
		if (formData.password !== formData.confirmPassword) {
			toast.error(t.auth.passwordsDoNotMatch);
			return;
		}

		if (formData.password.length < 6) {
			toast.error(t.auth.passwordTooShort);
			return;
		}

		if (!formData.email || !formData.password || !formData.name) {
			toast.error(t.auth.fillAllFields);
			return;
		}

		setLoading(true);

		try {
			const result = await registerClient({
				email: formData.email,
				password: formData.password,
				name: formData.name,
				phone: formData.phone || undefined,
			});

			if (result.success) {
				toast.success(t.auth.registrationSuccessful);
				router.push(
					withLocale(
						'/check-email?email=' + encodeURIComponent(formData.email),
						(extractLocaleFromPath(pathname) ?? 'en') as 'en' | 'ru' | 'vi'
					)
				);
			} else {
				toast.error(result.error || t.auth.registrationFailed);
			}
		} catch (error) {
			toast.error(t.auth.registrationFailed);
		} finally {
			setLoading(false);
		}
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setFormData({
			...formData,
			[e.target.name]: e.target.value,
		});
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
			<div className="max-w-md w-full space-y-8">
				<div>
					<div className="mx-auto h-12 w-12 flex items-center justify-center">
						<span className="text-3xl">💇‍♀️</span>
					</div>
					<h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
						{t.auth.signUpTitle}
					</h2>
					<p className="mt-2 text-center text-sm text-gray-600">
						{t.auth.signUpSubtitle}
					</p>
				</div>
				<form className="mt-8 space-y-6" onSubmit={handleSubmit}>
					{/* Name */}
					<div>
						<label
							htmlFor="name"
							className="block text-sm font-medium text-gray-700 mb-2"
						>
							{t.auth.fullName} *
						</label>
						<input
							id="name"
							name="name"
							type="text"
							required
							value={formData.name}
							onChange={handleInputChange}
							className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-[#ff5b5b] focus:border-[#ff5b5b] focus:z-10 sm:text-sm"
							placeholder={t.auth.fullName}
						/>
					</div>

					{/* Email */}
					<div>
						<label
							htmlFor="email"
							className="block text-sm font-medium text-gray-700 mb-2"
						>
							{t.auth.emailAddress} *
						</label>
						<input
							id="email"
							name="email"
							type="email"
							required
							value={formData.email}
							onChange={handleInputChange}
							className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-[#ff5b5b] focus:border-[#ff5b5b] focus:z-10 sm:text-sm"
							placeholder={t.auth.emailAddress}
						/>
					</div>

					{/* Phone */}
					<div>
						<label
							htmlFor="phone"
							className="block text-sm font-medium text-gray-700 mb-2"
						>
							{t.auth.phoneNumber}
						</label>
						<input
							id="phone"
							name="phone"
							type="tel"
							value={formData.phone}
							onChange={handleInputChange}
							className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-[#ff5b5b] focus:border-[#ff5b5b] focus:z-10 sm:text-sm"
							placeholder={t.auth.phoneNumber}
						/>
					</div>

					{/* Password */}
					<div>
						<label
							htmlFor="password"
							className="block text-sm font-medium text-gray-700 mb-2"
						>
							{t.auth.password} *
						</label>
						<input
							id="password"
							name="password"
							type="password"
							required
							value={formData.password}
							onChange={handleInputChange}
							className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-[#ff5b5b] focus:border-[#ff5b5b] focus:z-10 sm:text-sm"
							placeholder={t.auth.password}
						/>
					</div>

					{/* Confirm Password */}
					<div>
						<label
							htmlFor="confirmPassword"
							className="block text-sm font-medium text-gray-700 mb-2"
						>
							{t.auth.confirmPassword} *
						</label>
						<input
							id="confirmPassword"
							name="confirmPassword"
							type="password"
							required
							value={formData.confirmPassword}
							onChange={handleInputChange}
							className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-[#ff5b5b] focus:border-[#ff5b5b] focus:z-10 sm:text-sm"
							placeholder={t.auth.confirmPassword}
						/>
					</div>

					{/* Submit Button */}
					<div>
						<button
							type="submit"
							disabled={loading}
							className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#ff5b5b] hover:bg-[#ff5b5b] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ff5b5b] disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{loading ? (
								<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
							) : (
								t.auth.createAccount
							)}
						</button>
					</div>

					{/* Links */}
					<div className="text-center space-y-4">
						<p className="text-sm text-gray-600">
							{t.auth.alreadyHaveAccount}{' '}
							<Link
								href={withLocale(
									'/login',
									(extractLocaleFromPath(pathname) ?? 'en') as
										| 'en'
										| 'ru'
										| 'vi'
								)}
								className="font-medium text-[#ff5b5b] hover:text-[#ff5b5b]"
							>
								{t.auth.signIn}
							</Link>
						</p>
						<div className="border-t border-gray-200 pt-4">
							<p className="text-sm text-gray-600 mb-2">
								{t.auth.areYouSalonOwner}
							</p>
							<Link
								href={withLocale(
									'/business/register',
									(extractLocaleFromPath(pathname) ?? 'en') as
										| 'en'
										| 'ru'
										| 'vi'
								)}
								className="text-sm font-medium text-orange-600 hover:text-orange-700"
							>
								{t.auth.registerBusinessAccount}
							</Link>
						</div>
					</div>
				</form>
			</div>
		</div>
	);
}
