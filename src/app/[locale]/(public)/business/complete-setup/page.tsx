'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslation } from '@/contexts/LanguageContext';
import { useSalonSetup } from '@/hooks/useSalonSetup';
import LoadingFallback from '@/components/LoadingFallback';
import WorkingHoursSection from '@/components/WorkingHoursSection';
import SetupStep1 from './components/SetupStep1';
import SetupStep4 from './components/SetupStep4';
import SetupStep5 from './components/SetupStep5';
import SetupProgress from './components/SetupProgress';
import SetupNavigation from './components/SetupNavigation';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';

function BusinessCompleteSetupContent() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const token = searchParams.get('token');
	// Обработка magic link токена
	useEffect(() => {
		const handleMagicLink = async () => {
			if (!token) return;

			try {
				// Проверяем токен и подтверждаем email
				const result = await apiClient.get<{
					success: boolean;
					user: any;
					emailConfirmed: boolean;
					loginUrl?: string;
				}>(`/auth/verify-business-magic-link?token=${token}`);

				if (result.success && result.emailConfirmed) {
					// Если есть loginUrl, используем его для автоматического логина
					if (result.loginUrl) {
						// Редиректим на magic link для автоматического логина
						window.location.href = result.loginUrl;
						return;
					}

					// Если нет loginUrl, проверяем текущую сессию
					const { data: sessionData } = await supabase.auth.getSession();

					if (sessionData?.session) {
						// Сессия уже обновлена автоматически через Supabase
						toast.success('Email confirmed! Welcome!');
						// Убираем токен из URL
						router.replace('/business/complete-setup');
					} else {
						toast.success('Email confirmed! Please login to continue.');
						router.push(
							'/login?email=' + encodeURIComponent(result.user.email)
						);
					}
				}
			} catch (error: any) {
				console.error('Error verifying magic link:', error);
				toast.error(error.message || 'Failed to verify magic link');
				// Убираем токен из URL при ошибке
				router.replace('/business/complete-setup');
			}
		};

		handleMagicLink();
	}, [token, router]);
	const t = useTranslation();
	const {
		formData,
		currentStep,
		loading,
		errors,
		isUpdatingAddress,
		isLoading,
		isAuthenticated,
		user,
		steps,
		mapProps,
		nameInputRef,
		phoneInputRef,
		handleInputChange,
		handleMarkerMove,
		handleAddressChange,
		handleAddressSelect,
		handleSocialMediaChange,
		handleWorkingHoursChange,
		handleLogoChange,
		handleLogoRemove,
		handlePhotosChange,
		nextStep,
		prevStep,
		skipStep,
		handleSubmit,
	} = useSalonSetup();

	const renderStepContent = () => {
		switch (currentStep) {
			case 1:
				return (
					<SetupStep1
						formData={formData}
						errors={errors}
						mapProps={mapProps}
						isUpdatingAddress={isUpdatingAddress}
						nameInputRef={nameInputRef}
						phoneInputRef={phoneInputRef}
						onInputChange={handleInputChange}
						onMarkerMove={handleMarkerMove}
						onAddressChange={handleAddressChange}
						onAddressSelect={handleAddressSelect}
						t={t}
					/>
				);

			case 2:
				return (
					<div className="space-y-6">
						<WorkingHoursSection
							workingHours={formData.workingHours}
							onChange={handleWorkingHoursChange}
						/>
					</div>
				);

			case 3:
				return (
					<SetupStep4
						formData={formData}
						onInputChange={handleInputChange}
						onSocialMediaChange={handleSocialMediaChange}
						onLogoChange={handleLogoChange}
						onLogoRemove={handleLogoRemove}
						onPhotosChange={handlePhotosChange}
						t={t}
					/>
				);

			case 4:
				return <SetupStep5 formData={formData} t={t} />;

			default:
				return null;
		}
	};

	if (isLoading || !isAuthenticated || !user) {
		return <LoadingFallback message={t('business.completeSetup.loading')} />;
	}

	return (
		<div className="min-h-screen bg-[#F8F5F2] py-12 px-4 sm:px-6 lg:px-8">
			<div className="max-w-2xl mx-auto">
				{/* Header */}
				<div className="text-center mb-8">
					<h1 className="text-3xl font-bold text-gray-900 mb-2">
						{t('business.completeSetup.title')}
					</h1>
					<p className="text-gray-500">
						{t('business.completeSetup.subtitle')}
					</p>
				</div>

				{/* Form Card */}
				<div className="bg-white rounded-xl shadow-lg p-8">
					<SetupProgress
						currentStep={currentStep}
						totalSteps={steps.length}
						currentStepTitle={steps[currentStep - 1].title}
						t={t}
					/>

					{/* Step Content */}
					{renderStepContent()}

					{/* Navigation */}
					<div className="pt-8">
						<SetupNavigation
							currentStep={currentStep}
							totalSteps={steps.length}
							loading={loading}
							onPrevStep={prevStep}
							onNextStep={nextStep}
							onSkipStep={skipStep}
							onSubmit={handleSubmit}
							nextStepTitle={steps[currentStep]?.title}
							t={t}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}

export default function BusinessCompleteSetupPage() {
	return (
		<Suspense fallback={<LoadingFallback />}>
			<BusinessCompleteSetupContent />
		</Suspense>
	);
}
