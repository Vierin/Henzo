'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useTranslation } from '@/contexts/LanguageContext';
import { apiClient } from '@/lib/api-client';
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
			sessionStorage.setItem('businessRegistrationData', JSON.stringify({
				name: data.fullName,
				email: data.email,
				timestamp: Date.now(),
			}));

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
				errorMessage =
					t('business.betaForm.businessAccountAlreadyExists');
			}
			handleError(error, errorMessage);
		}
	};

	return (
		<section className="py-20 px-4 bg-muted/30 scroll-mt-20">
			<div className="container mx-auto max-w-3xl">
				<div className="text-center mb-16">
					<div className="inline-block px-4 py-2 border border-secondary rounded-full mb-4">
						<span className="text-primary text-medium">{t('business.betaForm.badge')}</span>
					</div>
					<h2 className="text-4xl lg:text-5xl tracking-tight mb-4">
						{t('business.betaForm.title')}
					</h2>
					<p className="text-xl text-muted-foreground">
						{t('business.betaForm.subtitle')}
					</p>
				</div>

				<div className="bg-card rounded-lg md:rounded-2xl border border-border shadow-lg p-4 md:p-12">
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
								: t('business.betaForm.requestBetaAccess')}
						</button>

						<p className="text-sm text-muted-foreground text-center">
							{t('business.betaForm.agreement')}
						</p>
					</form>
				</div>
			</div>
		</section>
	);
}
