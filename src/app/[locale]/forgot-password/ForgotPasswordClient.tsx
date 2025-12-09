'use client';

import Link from 'next/link';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useTranslation } from '@/contexts/LanguageContext';
import { withLocale, extractLocaleFromPath } from '@/i18n/routing';
import { usePathname } from 'next/navigation';

export default function ForgotPasswordClient() {
	const [email, setEmail] = useState('');
	const [loading, setLoading] = useState(false);
	const [success, setSuccess] = useState(false);
	const [error, setError] = useState('');
	const t = useTranslation();
	const pathname = usePathname();
	const locale = extractLocaleFromPath(pathname) ?? 'en';

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError('');

		try {
			const frontendUrl = (
				process.env.NEXT_PUBLIC_FRONTEND_URL || window.location.origin
			).trim();
			const redirectUrl = `${frontendUrl}/auth/callback?type=recovery`;
			const { error } = await supabase.auth.resetPasswordForEmail(email, {
				redirectTo: redirectUrl,
			});

			if (error) throw error;

			setSuccess(true);
		} catch (err: unknown) {
			setError(
				err instanceof Error
					? err.message
					: t('auth.failedToSendResetEmail')
			);
		} finally {
			setLoading(false);
		}
	};

	if (success) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 pt-24">
				<div className="max-w-md w-full space-y-8">
					<div className="text-center">
						<div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-[#ff5b5b]">
							<span className="text-white text-xl font-bold">H</span>
						</div>
						<h2 className="mt-6 text-3xl font-extrabold text-gray-900">
							{t('auth.checkYourEmail')}
						</h2>
						<p className="mt-2 text-sm text-gray-600">
							{t('auth.passwordResetSentDescription').replace('{email}', email)}
						</p>
					</div>

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
							{t('auth.passwordResetSent')}
						</p>
						<p className="text-sm text-gray-600 mb-6">
							{t('auth.checkEmailDescription')}
						</p>
						<Link
							href={withLocale('/login', locale as 'en' | 'ru' | 'vi')}
							className="text-sm text-[#ff5b5b] hover:text-[#e04a4a] font-medium"
						>
							{t('auth.backToSignIn')}
						</Link>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 pt-24">
			<div className="max-w-md w-full space-y-8">
				<div>
					<h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
						{t('auth.forgotPasswordTitle')}
					</h2>
					<p className="mt-2 text-center text-sm text-gray-600">
						{t('auth.forgotPasswordSubtitle')}
					</p>
				</div>

				<form className="mt-8 space-y-6" onSubmit={handleSubmit}>
					<div>
						<label
							htmlFor="email"
							className="block text-sm font-medium text-gray-700"
						>
							{t('auth.emailAddress')}
						</label>
						<input
							id="email"
							name="email"
							type="email"
							autoComplete="email"
							required
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-[#ff5b5b] focus:border-[#ff5b5b] focus:z-10 sm:text-sm"
							placeholder={t('auth.emailPlaceholder')}
						/>
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
							{loading ? t('auth.sending') : t('auth.sendResetLink')}
						</button>
					</div>

					<div className="text-center">
						<Link
							href={withLocale('/login', locale as 'en' | 'ru' | 'vi')}
							className="text-sm text-[#ff5b5b] hover:text-[#e04a4a]"
						>
							{t('auth.backToSignIn')}
						</Link>
					</div>
				</form>
			</div>
		</div>
	);
}

