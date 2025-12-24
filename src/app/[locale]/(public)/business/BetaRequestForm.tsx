'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from '@/contexts/LanguageContext';
import { apiClient } from '@/lib/api-client';
import { useErrorHandler } from '@/hooks/useErrorHandler';

export default function BetaRequestForm() {
	const t = useTranslation();
	const { handleError } = useErrorHandler();
	const [formData, setFormData] = useState({
		fullName: '',
		email: '',
	});
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);

		try {
			await apiClient.post('/auth/send-business-magic-link', {
				name: formData.fullName,
				email: formData.email,
			});

			toast.success(t('business.betaForm.magicLinkSent'), {
				duration: 5000,
			});

			// Reset form
			setFormData({
				fullName: '',
				email: '',
			});
		} catch (error: any) {
			// Improve error messages for existing account
			let errorMessage = error.message || t('business.betaForm.errorMessage');
			if (
				errorMessage.includes('already exists') ||
				errorMessage.includes('business account')
			) {
				errorMessage =
					'A business account with this email already exists. Please login instead.';
			}
			handleError(error, errorMessage);
		} finally {
			setLoading(false);
		}
	};

	return (
		<section className="py-20 px-4 bg-muted/30 scroll-mt-20">
			<div className="container mx-auto max-w-3xl">
				<div className="text-center mb-16">
					<div className="inline-block px-4 py-2 bg-secondary rounded-full mb-4">
						<span className="text-primary">{t('business.betaForm.badge')}</span>
					</div>
					<h2 className="text-4xl lg:text-5xl tracking-tight mb-4">
						{t('business.betaForm.title')}
					</h2>
					<p className="text-xl text-muted-foreground">
						{t('business.betaForm.subtitle')}
					</p>
				</div>

				<div className="bg-card rounded-lg md:rounded-2xl border border-border shadow-lg p-4 md:p-12">
					<form onSubmit={handleSubmit} className="space-y-6">
						{/* Full Name */}
						<div>
							<label
								htmlFor="fullName"
								className="block text-sm font-medium text-foreground mb-2"
							>
								{t('business.betaForm.fullName')} <span className="text-destructive">{t('business.betaForm.required')}</span>
							</label>
							<input
								type="text"
								id="fullName"
								required
								value={formData.fullName}
								onChange={(e) =>
									setFormData({ ...formData, fullName: e.target.value })
								}
								placeholder={t('business.betaForm.fullNamePlaceholder')}
								className="block w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors"
							/>
						</div>

						{/* Email */}
						<div>
							<label
								htmlFor="email"
								className="block text-sm font-medium text-foreground mb-2"
							>
								{t('business.betaForm.email')} <span className="text-destructive">{t('business.betaForm.required')}</span>
							</label>
							<input
								type="email"
								id="email"
								required
								value={formData.email}
								onChange={(e) =>
									setFormData({ ...formData, email: e.target.value })
								}
								placeholder={t('business.betaForm.emailPlaceholder')}
								className="block w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors"
							/>
						</div>

						{/* Submit Button */}
						<button
							type="submit"
							disabled={loading}
							className="w-full bg-primary text-white px-8 py-4 rounded-lg text-lg font-medium hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
						>
							{loading ? t('business.betaForm.submitting') : t('business.betaForm.requestBetaAccess')}
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
