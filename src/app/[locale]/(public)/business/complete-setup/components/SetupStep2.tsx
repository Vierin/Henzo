import {
	useCategories,
	getCategoryTranslatedName,
} from '@/hooks/useCategories';
import { SalonSetupData } from '@/hooks/useSalonSetup';

interface SetupStep2Props {
	formData: SalonSetupData;
	errors: { [key: string]: string };
	onCategoryToggle: (categoryId: number) => void;
	t: (key: string) => string;
}

export default function SetupStep2({
	formData,
	errors,
	onCategoryToggle,
	t,
}: SetupStep2Props) {
	const { data: categories = [], isLoading } = useCategories();

	if (isLoading) {
		return (
			<div className="space-y-6">
				<div className="animate-pulse">
					<div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						{[1, 2, 3, 4, 5, 6].map((i) => (
							<div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
						))}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div>
				<label className="block text-sm font-medium text-gray-900 mb-4">
					{t('business.completeSetup.step2.selectCategories')}
				</label>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					{categories.map((category) => (
						<button
							key={category.id}
							type="button"
							onClick={() => onCategoryToggle(category.id)}
							className={`p-4 border-1 rounded-lg text-left transition-all ${
								formData.categories.includes(category.id)
									? 'border-[#ff5b5b] bg-red-400/20'
									: 'border-gray-600 hover:border-gray-500 bg-white'
							}`}
						>
							<div className="flex items-center space-x-3">
								<div>
									<h3 className="font-bold text-gray-900">
										{getCategoryTranslatedName(category, t)}
									</h3>
								</div>
							</div>
						</button>
					))}
				</div>
				{errors.categories && (
					<p className="mt-2 text-sm text-red-400">{errors.categories}</p>
				)}
			</div>
		</div>
	);
}

