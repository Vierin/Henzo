interface SetupNavigationProps {
	currentStep: number;
	totalSteps: number;
	loading: boolean;
	onPrevStep: () => void;
	onNextStep: () => void;
	onSkipStep: () => void;
	onSubmit: () => void;
	nextStepTitle?: string;
	t: (key: string) => string;
}

export default function SetupNavigation({
	currentStep,
	totalSteps,
	loading,
	onPrevStep,
	onNextStep,
	onSkipStep,
	onSubmit,
	nextStepTitle,
	t,
}: SetupNavigationProps) {
	if (currentStep === 4) {
		// Special layout for step 4 with Skip button
		return (
			<div className="flex justify-between items-center">
				<button
					type="button"
					onClick={onPrevStep}
					className="px-6 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-500 transition-colors"
				>
					{t('business.completeSetup.navigation.previous')}
				</button>

				<div className="flex gap-3">
					<button
						type="button"
						onClick={onSkipStep}
						className="px-6 py-3 border border-gray-500 bg-white text-gray-900 rounded-lg font-medium hover:bg-gray-50 transition-colors"
					>
						{t('business.completeSetup.navigation.skipThisStep')}
					</button>
					<button
						type="button"
						onClick={onNextStep}
						className="px-6 py-3 bg-[#ff5b5b] text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
					>
						{t('business.completeSetup.navigation.next')}:{' '}
						{nextStepTitle || t('business.completeSetup.navigation.continue')}
					</button>
				</div>
			</div>
		);
	}

	// Standard layout for other steps
	return (
		<div className="flex justify-between">
			<button
				type="button"
				onClick={onPrevStep}
				disabled={currentStep === 1}
				className="px-6 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{t('business.completeSetup.navigation.previous')}
			</button>

			{currentStep === totalSteps ? (
				<button
					type="button"
					onClick={onSubmit}
					disabled={loading}
					className="px-6 py-3 bg-[#ff5b5b] text-white rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{loading
						? t('business.completeSetup.navigation.creatingSalon')
						: t('business.completeSetup.navigation.completeSetup')}
				</button>
			) : (
				<button
					type="button"
					onClick={onNextStep}
					className="px-6 py-3 bg-[#ff5b5b] text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
				>
					{t('business.completeSetup.navigation.next')}:{' '}
					{nextStepTitle || t('business.completeSetup.navigation.continue')}
				</button>
			)}
		</div>
	);
}

