'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useLanguage } from '@/contexts/LanguageContext';
import { Service, WorkingHours } from '@/types';
import toast from 'react-hot-toast';
import { logger } from '@/lib/logger';

interface BookingAuthFormProps {
	onSuccess: () => void;
	onSendMagicLink: (email: string) => void;
	onCancel: () => void;
	bookingData?: {
		service: Service | null;
		date: string;
		time: string;
		staff: string;
		salonId: string | null;
		salonName?: string;
		workingHours?: WorkingHours;
	};
}

export default function BookingAuthForm({
	onSuccess,
	onSendMagicLink,
	onCancel,
	bookingData,
}: BookingAuthFormProps) {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [showPasswordField, setShowPasswordField] = useState(false);
	const [loading, setLoading] = useState(false);
	const [magicLinkLoading, setMagicLinkLoading] = useState(false);
	const { login } = useAuthStore();
	const { t } = useLanguage();

	const handleGoogleLogin = async () => {
		try {
			setLoading(true);

			// Save booking data before redirecting to Google OAuth
			if (bookingData?.service && bookingData?.date && bookingData?.time) {
				const bookingState = {
					service: bookingData.service,
					date: bookingData.date,
					time: bookingData.time,
					staff: bookingData.staff,
					salonId: bookingData.salonId,
					salonName: bookingData.salonName,
					workingHours: bookingData.workingHours,
					timestamp: Date.now(),
					returnUrl: window.location.href,
				};
				localStorage.setItem('pendingBooking', JSON.stringify(bookingState));
				logger.log('✅ Booking state saved before OAuth redirect');
			} else {
				logger.warn('⚠️ Cannot save booking state: missing required fields');
			}

			// Get current locale from pathname
			const pathname = window.location.pathname;
			const localeMatch = pathname.match(/^\/(en|ru|vi)/);
			const locale = localeMatch ? localeMatch[1] : 'en';

			// Use simpler redirect URL - Supabase will handle the callback
			// Store returnUrl and locale in localStorage instead of URL params
			const returnUrl = window.location.href;
			localStorage.setItem('oauthReturnUrl', returnUrl);
			localStorage.setItem('oauthLocale', locale);

			// Use same format as other OAuth calls - without locale in path
			const frontendUrl = (
				process.env.NEXT_PUBLIC_FRONTEND_URL || window.location.origin
			).trim();
			const redirectTo = `${frontendUrl}/auth/callback`;

			logger.log('🔐 Initiating Google OAuth:', {
				redirectTo,
				returnUrl,
				locale,
			});

			const { data, error } = await supabase.auth.signInWithOAuth({
				provider: 'google',
				options: {
					redirectTo,
					queryParams: {
						access_type: 'offline',
						prompt: 'consent',
					},
				},
			});

			if (error) {
				logger.error('❌ Google OAuth error:', error);
				throw error;
			}

			// OAuth redirect will happen, so we don't need to do anything else
			// The user will be redirected to Google, then back to our callback
			logger.log('✅ Google OAuth initiated, redirecting...');
			// Don't set loading to false - OAuth will redirect
		} catch (error: any) {
			logger.error('❌ Google login error:', error);
			const errorMessage = error?.message || 'Unknown error occurred';
			toast.error(`${t.auth.googleSignInFailed}: ${errorMessage}`);
			setLoading(false);
		}
	};

	const handleMagicLinkSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!email) {
			toast.error('Please enter your email');
			return;
		}

		setMagicLinkLoading(true);
		try {
			await onSendMagicLink(email);
		} finally {
			setMagicLinkLoading(false);
		}
	};

	const handleLoginSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!email || !password) {
			toast.error(t.booking.pleaseFillAllFields);
			return;
		}

		setLoading(true);

		try {
			const result = await login(email, password);

			if (result.success) {
				toast.success('Login successful!');
				onSuccess();
			} else {
				toast.error(result.error || 'Login failed');
			}
		} catch (error) {
			toast.error('Login failed. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="space-y-4">
			{/* Google OAuth Button */}
			<button
				type="button"
				onClick={handleGoogleLogin}
				disabled={loading}
				className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
			>
				<svg className="w-5 h-5" viewBox="0 0 24 24">
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
				<span className="font-medium text-gray-700">{t.auth.continueWithGoogle}</span>
			</button>

			<div className="relative">
				<div className="absolute inset-0 flex items-center">
					<div className="w-full border-t border-gray-300"></div>
				</div>
				<div className="relative flex justify-center text-sm">
					<span className="px-2 bg-white text-gray-500">{t.auth.orContinueWith || 'or'}</span>
				</div>
			</div>

			{/* Email Input for Magic Link */}
			{!showPasswordField ? (
				<form onSubmit={handleMagicLinkSubmit} className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							{t.auth.emailAddress}
						</label>
						<input
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent"
							placeholder={t.auth.emailPlaceholder || 'your@email.com'}
							required
						/>
					</div>

					<div className="flex gap-3 mt-6">
						<button
							type="button"
							onClick={onCancel}
							className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
						>
							{t.common.cancel}
						</button>
						<button
							type="submit"
							disabled={magicLinkLoading}
							className="flex-1 px-4 py-2 bg-[#ff5b5b] text-white rounded-lg hover:bg-[#e04a4a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{magicLinkLoading ? (t.contact.sending || 'Sending...') : t.auth.continueWithEmail}
						</button>
					</div>

					<button
						type="button"
						onClick={() => setShowPasswordField(true)}
						className="w-full text-sm text-center text-[#ff5b5b] hover:underline"
					>
						{t.auth.alreadyHaveAccount}? {t.auth.signIn}
					</button>
				</form>
			) : (
				<form onSubmit={handleLoginSubmit} className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							{t.auth.emailAddress}
						</label>
						<input
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent"
							placeholder={t.auth.emailPlaceholder || 'your@email.com'}
							required
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							{t.auth.password}
						</label>
						<input
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent"
							placeholder="••••••••"
							required
						/>
					</div>

					<div className="flex gap-3 mt-6">
						<button
							type="button"
							onClick={onCancel}
							className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
						>
							{t.common.cancel}
						</button>
						<button
							type="submit"
							disabled={loading}
							className="flex-1 px-4 py-2 bg-[#ff5b5b] text-white rounded-lg hover:bg-[#e04a4a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{loading ? (t.auth.signInFailed || 'Logging in...') : t.auth.signIn}
						</button>
					</div>

					<button
						type="button"
						onClick={() => setShowPasswordField(false)}
						className="w-full text-sm text-center text-[#ff5b5b] hover:underline"
					>
						{t.booking.useEmailLinkInstead || 'Use email link instead'}
					</button>

					<p className="text-sm text-center text-gray-600 mt-4">
						{t.auth.dontHaveAccount}{' '}
						<Link href="/register" className="text-[#ff5b5b] hover:underline">
							{t.auth.signUp}
						</Link>
					</p>
				</form>
			)}
		</div>
	);
}

