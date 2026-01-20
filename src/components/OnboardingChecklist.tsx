'use client';

import { useState, useMemo } from 'react';
import { Check, X, ExternalLink,  ChevronRight, ChevronDown } from 'lucide-react';
import { useTranslation, useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';
import { useServices } from '@/hooks/useServices';
import { useStaffBySalon, useCreateStaff } from '@/hooks/useStaff';
import { useOwnerLayout } from '@/contexts/OwnerLayoutContext';
import { useSalonSlug } from '@/hooks/useSalonSlug';
import { useAuth } from '@/lib/auth-unified';
import { useQueryClient } from '@tanstack/react-query';
import { salonKeys } from '@/hooks/useSalons';

interface OnboardingChecklistProps {
	salonId: string;
	salonSlug?: string;
}

interface OnboardingStep {
	id: string;
	title: string;
	description: string;
	completed: boolean;
	action?: () => void;
	externalLink?: string;
	stepNumber: number;
}

export default function OnboardingChecklist({
	salonId,
	salonSlug,
}: OnboardingChecklistProps) {
	const t = useTranslation();
	const { language } = useLanguage();
	const router = useRouter();
	const [isPublishing, setIsPublishing] = useState(false);
	const [showCongratulations, setShowCongratulations] = useState(false);
	const [ownerIsStaff, setOwnerIsStaff] = useState<boolean | null>(null);
	const [isCreatingOwnerStaff, setIsCreatingOwnerStaff] = useState(false);
	const [isCollapsed, setIsCollapsed] = useState(false);
	const [bookingPageViewed, setBookingPageViewed] = useState(false);
	const [localSalonStatus, setLocalSalonStatus] = useState<'DRAFT' | 'READY' | 'ACTIVE' | null>(null);
	const { salonData } = useOwnerLayout();
	const { user } = useAuth();
	const { data: services = [] } = useServices(salonId || '', {});
	const { data: staffMembers = [] } = useStaffBySalon(salonId || '');
	const { getSalonUrl } = useSalonSlug();
	const createStaffMutation = useCreateStaff();
	const queryClient = useQueryClient();

	const salonStatus = localSalonStatus || (salonData?.status as 'DRAFT' | 'READY' | 'ACTIVE') || 'DRAFT';
	const hasSchedule = salonData?.workingHours && Object.keys(salonData.workingHours).length > 0;
	const salonPublicUrl = salonData ? getSalonUrl(salonData) : (salonSlug ? `/salon/${salonSlug}` : undefined);

	const steps: OnboardingStep[] = useMemo(() => [
		{
			id: 'staff',
			title: t('owner.onboarding.steps.addStaff.title'),
			description: t('owner.onboarding.steps.addStaff.description'),
			completed: staffMembers.length > 0,
			action: () => router.push('/staff'),
			stepNumber: 1,
		},
		{
			id: 'services',
			title: t('owner.onboarding.steps.addServices.title'),
			description: t('owner.onboarding.steps.addServices.description'),
			completed: services.length > 0,
			action: () => router.push('/services/new'),
			stepNumber: 2,
		},
		{
			id: 'schedule',
			title: t('owner.onboarding.steps.checkSchedule.title'),
			description: t('owner.onboarding.steps.checkSchedule.description'),
			completed: !!hasSchedule,
			action: () => router.push('/calendar'),
			stepNumber: 3,
		},
		{
			id: 'booking-page',
			title: t('owner.onboarding.steps.checkBookingPage.title'),
			description: t('owner.onboarding.steps.checkBookingPage.description'),
			completed: false,
			externalLink: salonPublicUrl,
			stepNumber: 4,
		},
		{
			id: 'publish',
			title: t('owner.onboarding.steps.publishSalon.title'),
			description: t('owner.onboarding.steps.publishSalon.description'),
			completed: salonStatus === 'ACTIVE',
			stepNumber: 5,
		},
	], [services.length, staffMembers.length, hasSchedule, salonPublicUrl, salonStatus, router, t]);

	const handlePublish = async () => {
		setIsPublishing(true);
		try {
			await apiClient.patch(`/salons/${salonId}/publish`);
			// Update local status immediately
			setLocalSalonStatus('ACTIVE');
			// Invalidate and refetch salon data
			queryClient.invalidateQueries({ queryKey: salonKeys.current() });
			queryClient.invalidateQueries({ queryKey: salonKeys.all });
			// Show congratulations
			setShowCongratulations(true);
			toast.success(t('owner.onboarding.salonPublished'));
		} catch (error: any) {
			console.error('Error publishing salon:', error);
			toast.error(error.message || t('owner.onboarding.publishError'));
		} finally {
			setIsPublishing(false);
		}
	};

	const handleStepClick = (step: OnboardingStep) => {
		if (step.externalLink) {
			window.open(step.externalLink, '_blank');
			// Если это этап booking-page, помечаем его как просмотренный и переключаемся на следующий
			if (step.id === 'booking-page') {
				setBookingPageViewed(true);
			}
		} else if (step.action) {
			step.action();
		}
	};

	const handleOwnerIsStaffChoice = async (isStaff: boolean) => {
		if (!salonId || !user) return;

		setOwnerIsStaff(isStaff);

		if (isStaff) {
			// Создаем сотрудника с данными владельца
			setIsCreatingOwnerStaff(true);
			try {
				await createStaffMutation.mutateAsync({
					name: user.name || user.email?.split('@')[0] || 'Owner',
					email: user.email || undefined,
					phone: user.phone || undefined,
					accessLevel: 'ADMIN',
					salonId: salonId,
				});
				toast.success(t('owner.onboarding.ownerStaffCreated'));
				// Обновляем список работников
				setTimeout(() => {
					window.location.reload();
				}, 500);
			} catch (error: any) {
				console.error('Error creating owner staff:', error);
				toast.error(error.message || t('owner.onboarding.failedToCreateOwnerStaff'));
				setOwnerIsStaff(null);
			} finally {
				setIsCreatingOwnerStaff(false);
			}
		} else {
			// Открываем форму создания сотрудника
			router.push('/staff/new');
		}
	};

	const allStepsCompleted = steps.slice(0, 4).every((step) => step.completed || step.id === 'booking-page');
	const canPublish = allStepsCompleted && salonStatus !== 'ACTIVE';

	// Determine current active step (first incomplete step in order)
	const activeStepIndex = useMemo(() => {
		// Find first incomplete step that should be shown next
		for (let i = 0; i < steps.length; i++) {
			const step = steps[i];
			// For booking-page, we consider it completed if all previous steps are done
			if (step.id === 'booking-page') {
				const previousStepsCompleted = steps.slice(0, i).every((s) => s.completed);
				if (previousStepsCompleted && !bookingPageViewed) {
					return i;
				}
				// If booking page was viewed, skip to next step
				if (bookingPageViewed) {
					continue;
				}
			} else if (!step.completed) {
				return i;
			}
		}
		// If all steps are completed, show publish step
		return steps.length - 1;
	}, [steps, bookingPageViewed]);

	const currentStep = steps[activeStepIndex];
	const isLastStep = activeStepIndex === steps.length - 1;
	const totalSteps = steps.length;
	const remainingSteps = Math.max(0, totalSteps - (activeStepIndex + 1));

	// Calculate progress: if we're on the last step and all previous steps are completed, progress = 100%
	const completedStepsCount = steps.filter((step) => step.completed || step.id === 'booking-page').length;
	const progressPercentage = isLastStep && allStepsCompleted 
		? 100 
		: (completedStepsCount / totalSteps) * 100;

	if (showCongratulations) {
		const hasPhotos = salonData?.photos && Array.isArray(salonData.photos) && salonData.photos.length > 0;
		
		return (
			<div className="fixed bottom-4 left-4 z-[500] bg-white rounded-lg shadow-lg p-6 max-w-sm border border-gray-200">
				<div className="text-center">
					<div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
						<Check className="h-6 w-6 text-green-600" />
					</div>
					<h3 className="text-lg font-semibold text-gray-900 mb-2">
						{t('owner.onboarding.congratulations')}
					</h3>
					<p className="text-sm text-gray-600 mb-4">
						{t('owner.onboarding.salonPublishedSuccess')}
					</p>
					
					{/* Photo tip section - показываем только если нет фотографий */}
					{!hasPhotos && (
						<div className="mt-4 pt-4 border-t border-gray-200">
							<div className="bg-blue-50 rounded-lg p-3 mb-3">
								<p className="text-xs text-blue-900 font-medium mb-1">
									{t('owner.onboarding.photoTip.title')}
								</p>
								<p className="text-xs text-blue-700">
									{t('owner.onboarding.photoTip.description')}
								</p>
							</div>
							<button
								onClick={() => {
									setShowCongratulations(false);
									router.push('/salon-info');
								}}
								className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium mb-3"
							>
								{t('owner.onboarding.photoTip.addPhotos')}
							</button>
						</div>
					)}
					
					<button
						onClick={() => setShowCongratulations(false)}
						className={`w-full bg-[#ff5b5b] text-white px-4 py-2 rounded-lg hover:bg-[#e04a4a] transition-colors ${!hasPhotos ? '' : 'mt-4'}`}
					>
						{t('common.close')}
					</button>
				</div>
			</div>
		);
	}

	if (salonStatus === 'ACTIVE') {
		return null;
	}

	return (
		<div className="fixed bottom-4 left-4 z-[500] bg-white rounded-lg shadow-lg p-3 max-w-md border border-gray-200">
			{/* Progress Bar Header */}
			<div className="mb-4">
				<div className="flex items-center justify-between mb-2">
					<h3 className="text-sm font-semibold text-gray-900">
						{t('owner.onboarding.setupChecklist')}
					</h3>
					<button
						type="button"
						onClick={() => setIsCollapsed(!isCollapsed)}
						className="p-1 rounded-full hover:bg-gray-100 text-gray-400"
						aria-label="Toggle checklist"
					>
						<ChevronDown
							className={`h-4 w-4 transition-transform ${
								isCollapsed ? 'rotate-180' : ''
							}`}
						/>
					</button>
				</div>
				<div className="flex items-center gap-3">
					<div className="w-full bg-gray-200 rounded-full h-2">
						<div
							className="bg-[#ff5b5b] h-2 rounded-full transition-all duration-300"
							style={{ width: `${progressPercentage}%` }}
						/>
					</div>
					<span className="text-sm text-gray-500 whitespace-nowrap">
						{(() => {
							let pluralText = '';
							if (language === 'ru') {
								if (remainingSteps === 1) {
									pluralText = 'шаг';
								} else if (remainingSteps >= 2 && remainingSteps <= 4) {
									pluralText = 'шага';
								} else {
									pluralText = 'шагов';
								}
							} else if (language === 'vi') {
								pluralText = 'bước';
							} else {
								pluralText = remainingSteps === 1 ? 'step' : 'steps';
							}
							return t('owner.onboarding.stepsRemaining')
								.replace('{count}', String(remainingSteps))
								.replace('{plural}', pluralText);
						})()}
					</span>
				</div>
				
			</div>

			{/* Current Step Display */}
			{!isCollapsed && currentStep && (
				<div
					className={`border rounded-lg p-4 mb-4 transition-all ${
						currentStep.completed
							? 'border-green-200 bg-green-50/50'
							: 'border-gray-200 bg-white'
					}`}
				>
					<div className="flex items-start gap-3">
						{/* Step Number & Status Icon */}
						<div className="flex-shrink-0 mt-0.5">
							{currentStep.completed ? (
								<div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-600">
									<Check className="h-5 w-5 text-white" />
								</div>
							) : (
								<div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#ff5b5b] text-white text-sm font-semibold">
									{currentStep.stepNumber}
								</div>
							)}
						</div>

						{/* Step Content */}
						<div className="flex-1 min-w-0">
							<div className="flex items-start justify-between gap-2 mb-2">
								<div className="flex-1">
									<h4
										className={`text-base font-semibold mb-2 ${
											currentStep.completed ? 'text-gray-900' : 'text-gray-800'
										}`}
									>
										{currentStep.title}
									</h4>
									{/* Для первого шага (staff) показываем вопрос вместо описания */}
									{currentStep.id === 'staff' && !currentStep.completed ? (
										<div className="space-y-3 mt-3">
											<p className="text-sm font-medium text-gray-800 mb-3">
												{t('owner.onboarding.steps.addStaff.question')}
											</p>
											<div className="space-y-2">
												<button
													onClick={() => handleOwnerIsStaffChoice(true)}
													disabled={isCreatingOwnerStaff || ownerIsStaff !== null}
													className="w-full text-left px-4 py-3 border-2 border-[#ff5b5b] rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white"
												>
													<div className="flex items-center justify-between">
														<span className="text-sm font-medium text-gray-900">
															{t('owner.onboarding.steps.addStaff.yesIAmStaff')}
														</span>
														{isCreatingOwnerStaff && (
															<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#ff5b5b]"></div>
														)}
													</div>
												</button>
												<button
													onClick={() => handleOwnerIsStaffChoice(false)}
													disabled={isCreatingOwnerStaff || ownerIsStaff !== null}
													className="w-full text-left px-4 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white"
												>
													<span className="text-sm font-medium text-gray-900">
														{t('owner.onboarding.steps.addStaff.noAddOther')}
													</span>
												</button>
											</div>
										</div>
									) : (
										<p className="text-xs text-gray-600 leading-relaxed">
											{currentStep.description}
										</p>
									)}
								</div>
							</div>

							{/* Action Button for non-publish steps */}
							{currentStep.id !== 'publish' && 
							 !(currentStep.id === 'staff' && !currentStep.completed) && (
								<button
									onClick={() => handleStepClick(currentStep)}
									className="mt-3 w-full flex items-center justify-center gap-2 text-sm text-[#ff5b5b] hover:text-[#e04a4a] font-medium transition-colors border border-[#ff5b5b] rounded-lg px-4 py-2 hover:bg-red-50"
								>
									{currentStep.externalLink ? (
										<>
											{t('owner.onboarding.viewPage')}
											<ExternalLink className="h-4 w-4" />
										</>
									) : (
										<>
											{t('owner.onboarding.goToPage')}
											<ChevronRight className="h-4 w-4" />
										</>
									)}
								</button>
							)}
						</div>
					</div>
				</div>
			)}

			{/* Publish Button (only for last step) */}
			{!isCollapsed && isLastStep && (
				<button
					onClick={handlePublish}
					disabled={isPublishing || !canPublish}
					className="w-full bg-[#ff5b5b] text-white px-4 py-2 rounded-lg hover:bg-[#e04a4a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
				>
					{isPublishing ? t('owner.onboarding.publishing') : t('owner.onboarding.publishSalon')}
				</button>
			)}
		</div>
	);
}

