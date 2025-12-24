interface SetupProgressProps {
	currentStep: number;
	totalSteps: number;
	currentStepTitle: string;
	t: (key: string) => string;
}

export default function SetupProgress({
	currentStep,
	totalSteps,
	currentStepTitle,
	t,
}: SetupProgressProps) {
	return (
		<>
			{/* Progress */}
			<div className="flex justify-between items-center mb-6">
				<span className="text-gray-900 font-medium">
					{t('business.completeSetup.step')} {currentStep}{' '}
					{t('business.completeSetup.of')} {totalSteps}
				</span>
				<span className="text-gray-500">{currentStepTitle}</span>
			</div>

			{/* Progress Bar */}
			<div className="w-full bg-gray-300 rounded-full h-2 mb-8">
				<div
					className="bg-[#ff5b5b] h-2 rounded-full transition-all duration-300"
					style={{ width: `${(currentStep / totalSteps) * 100}%` }}
				></div>
			</div>
		</>
	);
}

