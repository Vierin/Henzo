import { STATIC_CATEGORIES } from '@/constants/categories';
import { SalonSetupData } from '@/hooks/useSalonSetup';

const WEEKDAYS = [
	{ key: 'monday', label: 'Monday' },
	{ key: 'tuesday', label: 'Tuesday' },
	{ key: 'wednesday', label: 'Wednesday' },
	{ key: 'thursday', label: 'Thursday' },
	{ key: 'friday', label: 'Friday' },
	{ key: 'saturday', label: 'Saturday' },
	{ key: 'sunday', label: 'Sunday' },
];

interface SetupStep5Props {
	formData: SalonSetupData;
	t: (key: string) => string;
}

export default function SetupStep5({ formData, t }: SetupStep5Props) {
	return (
		<div className="space-y-6">
			<div className="bg-white border-1 border-gray-300 rounded-lg p-6">
				<h3 className="text-lg font-semibold text-gray-900 mb-4">
					{t('business.completeSetup.step5.reviewInformation')}
				</h3>

				<div className="space-y-4 text-sm">
					<div>
						<span className="text-gray-500">
							{t('business.completeSetup.step5.salonName')}
						</span>
						<span className="text-gray-900 ml-2">{formData.name}</span>
					</div>
					<div>
						<span className="text-gray-500">
							{t('business.completeSetup.step5.address')}
						</span>
						<span className="text-gray-900 ml-2">{formData.address}</span>
					</div>
					<div>
						<span className="text-gray-500">
							{t('business.completeSetup.step5.phone')}
						</span>
						<span className="text-gray-900 ml-2">{formData.phone}</span>
					</div>
					<div>
						<span className="text-gray-500">
							{t('business.completeSetup.step5.categories')}
						</span>
						<span className="text-gray-900 ml-2">
							{formData.categories
								.map(
									(id) =>
										STATIC_CATEGORIES.find((cat) => cat.id === id)?.name
								)
								.join(', ')}
						</span>
					</div>
					{formData.description && (
						<div>
							<span className="text-gray-500">
								{t('business.completeSetup.step5.description')}
							</span>
							<span className="text-gray-900 ml-2">
								{formData.description}
							</span>
						</div>
					)}
				</div>
			</div>

			<div className="bg-white border-1 border-gray-300 rounded-lg p-6">
				<h3 className="text-lg font-semibold text-gray-900 mb-4">
					{t('business.completeSetup.step5.workingHours')}
				</h3>
				<div className="space-y-2 text-sm">
					{WEEKDAYS.map((day) => {
						const dayHours =
							formData.workingHours[
								day.key as keyof typeof formData.workingHours
							];
						return (
							<div key={day.key} className="flex justify-between">
								<span className="text-gray-500">{day.label}:</span>
								<span className="text-gray-900">
									{!dayHours.closed
										? `${dayHours.open} - ${dayHours.close}`
										: t('business.completeSetup.step5.closed')}
								</span>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}

