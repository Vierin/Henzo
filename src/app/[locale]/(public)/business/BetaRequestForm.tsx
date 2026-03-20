'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useTranslation } from '@/contexts/LanguageContext';
import { apiClient } from '@/lib/api-client';
import { startBusinessGoogleOAuth } from '@/utils/oauth';
import { useErrorHandler } from '@/hooks/useErrorHandler';

// Zod schema factory для валидации формы
function createBetaRequestSchema(t: any) {
	return z
		.object({
			fullName: z
				.string()
				.min(2, t('business.betaForm.errors.fullNameMinLength'))
				.max(100, 'Full name must be no more than 100 characters'),
			email: z.string().email(t('business.betaForm.errors.invalidEmail')),
			password: z
				.string()
				.min(8, t('business.betaForm.errors.passwordMinLength'))
				.max(100, 'Password must be no more than 100 characters'),
			confirmPassword: z.string(),
		})
		.refine((data) => data.password === data.confirmPassword, {
			message: t('business.register.passwordsDoNotMatch'),
			path: ['confirmPassword'],
		});
}

export default function BetaRequestForm() {
	const t = useTranslation();
	const [googleLoading, setGoogleLoading] = useState(false);
	const betaRequestSchema = createBetaRequestSchema(t);
	type BetaRequestFormData = z.infer<typeof betaRequestSchema>;
	const { handleError } = useErrorHandler();
	const {
		register,
		handleSubmit: handleFormSubmit,
		formState: { errors, isSubmitting },
		reset,
	} = useForm<BetaRequestFormData>({
		resolver: zodResolver(betaRequestSchema),
		defaultValues: {
			fullName: '',
			email: '',
			password: '',
			confirmPassword: '',
		},
	});

	const onSubmit = async (data: BetaRequestFormData) => {
		try {
			// Сохраняем данные формы в sessionStorage для восстановления после magic link
			sessionStorage.setItem(
				'businessRegistrationData',
				JSON.stringify({
					name: data.fullName,
					email: data.email,
					timestamp: Date.now(),
				})
			);

			await apiClient.post('/auth/send-business-magic-link', {
				name: data.fullName,
				email: data.email,
				password: data.password,
			});

			toast.success(t('business.betaForm.magicLinkSent'), {
				duration: 5000,
			});

			// Reset form
			reset();
		} catch (error: any) {
			// Improve error messages for existing account
			let errorMessage = error.message || t('business.betaForm.errorMessage');
			if (
				errorMessage.includes('already exists') ||
				errorMessage.includes('business account')
			) {
				errorMessage = t('business.betaForm.businessAccountAlreadyExists');
			}
			handleError(error, errorMessage);
		}
	};

	const handleGoogleBusinessRequest = async () => {
		setGoogleLoading(true);
		try {
			const { error } = await startBusinessGoogleOAuth({
				source: 'business_beta_form',
			});
			if (error) throw error;
		} catch (error: any) {
			handleError(error, t('business.register.failedToRegisterGoogle'));
			setGoogleLoading(false);
		}
	};

	return (
		<section className="py-20 px-4 bg-muted/30 scroll-mt-20">
			<div className="container mx-auto max-w-3xl">
				<div className="text-center mb-16">
					<div className="inline-block px-4 py-2 border border-secondary rounded-full mb-4">
						<span className="text-primary text-medium">
							{t('business.betaForm.badge')}
						</span>
					</div>
					<h2 className="text-4xl lg:text-5xl tracking-tight mb-4">
						{t('business.betaForm.title')}
					</h2>
					<p className="text-xl text-muted-foreground">
						{t('business.betaForm.subtitle')}
					</p>
					<p className="text-base text-muted-foreground mt-3">
						{t('business.betaForm.onboardingNote')}
					</p>
				</div>

				<div className="bg-card rounded-lg md:rounded-2xl border border-border shadow-lg p-4 md:p-12 space-y-6">
					<form onSubmit={handleFormSubmit(onSubmit)} className="space-y-6">
						{/* Grid for desktop: 2 columns */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							{/* Full Name */}
							<div>
								<label
									htmlFor="fullName"
									className="block text-sm font-medium text-foreground mb-2"
								>
									{t('business.betaForm.fullName')}{' '}
									<span className="text-destructive">
										{t('business.betaForm.required')}
									</span>
								</label>
								<input
									type="text"
									id="fullName"
									{...register('fullName')}
									placeholder={t('business.betaForm.fullNamePlaceholder')}
									className={`block w-full px-4 py-3 border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors ${
										errors.fullName ? 'border-destructive' : 'border-border'
									}`}
								/>
								{errors.fullName && (
									<p className="mt-1 text-sm text-destructive">
										{errors.fullName.message}
									</p>
								)}
							</div>

							{/* Email */}
							<div>
								<label
									htmlFor="email"
									className="block text-sm font-medium text-foreground mb-2"
								>
									{t('business.betaForm.email')}{' '}
									<span className="text-destructive">
										{t('business.betaForm.required')}
									</span>
								</label>
								<input
									type="email"
									id="email"
									{...register('email')}
									placeholder={t('business.betaForm.emailPlaceholder')}
									className={`block w-full px-4 py-3 border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors ${
										errors.email ? 'border-destructive' : 'border-border'
									}`}
								/>
								{errors.email && (
									<p className="mt-1 text-sm text-destructive">
										{errors.email.message}
									</p>
								)}
							</div>

							{/* Password */}
							<div>
								<label
									htmlFor="password"
									className="block text-sm font-medium text-foreground mb-2"
								>
									{t('business.betaForm.password') || 'Password'}{' '}
									<span className="text-destructive">
										{t('business.betaForm.required')}
									</span>
								</label>
								<input
									type="password"
									id="password"
									{...register('password')}
									placeholder={
										t('business.betaForm.passwordPlaceholder') ||
										'Enter your password'
									}
									className={`block w-full px-4 py-3 border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors ${
										errors.password ? 'border-destructive' : 'border-border'
									}`}
								/>
								{errors.password && (
									<p className="mt-1 text-sm text-destructive">
										{errors.password.message}
									</p>
								)}
							</div>

							{/* Confirm Password */}
							<div>
								<label
									htmlFor="confirmPassword"
									className="block text-sm font-medium text-foreground mb-2"
								>
									{t('business.betaForm.confirmPassword') || 'Confirm Password'}{' '}
									<span className="text-destructive">
										{t('business.betaForm.required')}
									</span>
								</label>
								<input
									type="password"
									id="confirmPassword"
									{...register('confirmPassword')}
									placeholder={
										t('business.betaForm.confirmPasswordPlaceholder') ||
										'Confirm your password'
									}
									className={`block w-full px-4 py-3 border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors ${
										errors.confirmPassword
											? 'border-destructive'
											: 'border-border'
									}`}
								/>
								{errors.confirmPassword && (
									<p className="mt-1 text-sm text-destructive">
										{errors.confirmPassword.message}
									</p>
								)}
							</div>
						</div>

						{/* Submit Button */}
						<button
							type="submit"
							disabled={isSubmitting}
							className="w-full bg-primary text-white px-8 py-4 rounded-lg text-lg font-medium hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
						>
							{isSubmitting
								? t('business.betaForm.submitting')
								: t('business.betaForm.requestBetaEmailAccess')}
						</button>

						<p className="text-sm text-muted-foreground text-center">
							{t('business.betaForm.agreement')}
						</p>
					</form>

					<div className="relative">
						<div className="absolute inset-0 flex items-center">
							<div className="w-full border-t border-border" />
						</div>
						<div className="relative flex justify-center text-sm">
							<span className="px-2 bg-card text-muted-foreground">
								{t('business.register.orContinueWith')}
							</span>
						</div>
					</div>

					<button
						type="button"
						onClick={handleGoogleBusinessRequest}
						disabled={isSubmitting || googleLoading}
						className="w-full flex justify-center items-center py-3 px-4 border border-border rounded-lg bg-background text-sm font-medium text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<svg
							className="w-5 h-5 mr-2 shrink-0"
							viewBox="0 0 24 24"
							aria-hidden
						>
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
						{googleLoading
							? t('business.betaForm.googleRedirecting')
							: t('business.register.continueWithGoogle')}
					</button>
				</div>
			</div>
		</section>
	);
}
