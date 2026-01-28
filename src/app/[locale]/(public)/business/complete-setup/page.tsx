'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslation } from '@/contexts/LanguageContext';
import { useSalonSetup } from '@/hooks/useSalonSetup';
import LoadingFallback from '@/components/LoadingFallback';
import WorkingHoursSection from '@/components/WorkingHoursSection';
import SetupStep1 from './components/SetupStep1';
import SetupStep3 from './components/SetupStep3';
import SetupProgress from './components/SetupProgress';
import SetupNavigation from './components/SetupNavigation';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';

function BusinessCompleteSetupContent() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const token = searchParams.get('token');
	
	// Обработка hash фрагмента с токенами от Supabase (если пользователь попал сюда через Supabase magic link)
	useEffect(() => {
		const handleHashTokens = async () => {
			// Проверяем hash фрагмент на наличие токенов
			const hash = window.location.hash.substring(1);
			if (!hash) return;

			const hashParams = new URLSearchParams(hash);
			const accessToken = hashParams.get('access_token');
			const refreshToken = hashParams.get('refresh_token');
			const type = hashParams.get('type');

			// Если это magic link для бизнес-регистрации
			if (accessToken && refreshToken && type === 'magiclink') {
				try {
					console.log('✅ Found tokens in hash, setting session...');
					
					// Устанавливаем сессию
					const { data: sessionData, error: sessionError } =
						await supabase.auth.setSession({
							access_token: accessToken,
							refresh_token: refreshToken,
						});

					if (sessionError) {
						console.error('❌ Failed to set session from hash:', sessionError);
						toast.error('Failed to authenticate. Please try again.');
						// Очищаем hash и редиректим
						window.history.replaceState(null, '', '/business/complete-setup');
						return;
					}

					if (sessionData?.session) {
						console.log('✅ Session set successfully from hash tokens');
						// Очищаем hash из URL
						window.history.replaceState(null, '', '/business/complete-setup');
						// Обновляем страницу для применения изменений
						router.refresh();
					}
				} catch (error) {
					console.error('❌ Error handling hash tokens:', error);
					// Очищаем hash при ошибке
					window.history.replaceState(null, '', '/business/complete-setup');
				}
			}
		};

		handleHashTokens();
	}, [router]);

	// Обработка magic link токена из query параметров
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
					// Если есть loginUrl, НЕ используем его напрямую (он ведет на hash токены)
					// Вместо этого проверяем текущую сессию
					const { data: sessionData } = await supabase.auth.getSession();

					if (sessionData?.session) {
						// Сессия уже установлена
						toast.success('Email confirmed! Welcome!');
						// Убираем токен из URL
						router.replace('/business/complete-setup');
					} else if (result.loginUrl) {
						// Если сессии нет, но есть loginUrl, используем его
						// Но это должно быть редко, так как пользователь уже должен быть создан
						console.log('⚠️ No session found, redirecting to loginUrl');
						window.location.href = result.loginUrl;
						return;
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
		handleInputChange,
		handleMarkerMove,
		handleAddressChange,
		handleAddressSelect,
		handleWorkingHoursChange,
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
				return <SetupStep3 formData={formData} t={t} />;

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
