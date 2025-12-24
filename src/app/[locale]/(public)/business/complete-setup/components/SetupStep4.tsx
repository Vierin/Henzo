import EnhancedFileUpload from '@/components/EnhancedFileUpload';
import EnhancedPhotoUpload from '@/components/EnhancedPhotoUpload';
import { SalonSetupData } from '@/hooks/useSalonSetup';

interface SetupStep4Props {
	formData: SalonSetupData;
	onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
	onSocialMediaChange: (platform: string, value: string) => void;
	onLogoChange: (filePath: string) => void;
	onLogoRemove: () => void;
	onPhotosChange: (photos: string[]) => void;
	t: (key: string) => string;
}

export default function SetupStep4({
	formData,
	onInputChange,
	onSocialMediaChange,
	onLogoChange,
	onLogoRemove,
	onPhotosChange,
	t,
}: SetupStep4Props) {
	return (
		<div className="space-y-6">
			<div>
				<label
					htmlFor="description"
					className="block text-sm font-medium text-gray-900 mb-2"
				>
					{t('business.completeSetup.step4.salonDescription')}
				</label>
				<textarea
					id="description"
					name="description"
					rows={3}
					value={formData.description}
					onChange={onInputChange}
					maxLength={250}
					className="w-full px-4 py-3 bg-white border border-gray-600 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent"
					placeholder={t('business.completeSetup.step4.descriptionPlaceholder')}
				/>
				<div className="mt-1 flex justify-end">
					<span className="text-xs text-gray-400">
						{formData.description.length}/250
					</span>
				</div>
			</div>

			<div>
				<label className="block text-sm font-medium text-gray-900 mb-2">
					{t('business.completeSetup.step4.logoUpload')}
				</label>
				<EnhancedFileUpload
					onUpload={onLogoChange}
					onRemove={onLogoRemove}
					currentFile={formData.logo || undefined}
					accept="image/*"
					maxSize={2}
					placeholder={t('business.completeSetup.step4.uploadSalonLogo')}
				/>
			</div>

			<div>
				<label className="block text-sm font-medium text-gray-900 mb-2">
					{t('business.completeSetup.step4.photos')}
				</label>
				<EnhancedPhotoUpload
					photos={formData.photos}
					onPhotosChange={onPhotosChange}
					maxPhotos={3}
					maxSize={2}
				/>
			</div>

			<div className="space-y-4">
				<label className="block text-sm font-medium text-gray-900 mb-2">
					{t('business.completeSetup.step4.socialMedia')}
				</label>
				<div>
					<input
						type="url"
						placeholder={t('business.completeSetup.step4.websiteUrl')}
						value={formData.socialMedia.website}
						onChange={(e) => onSocialMediaChange('website', e.target.value)}
						className="w-full px-4 py-3 bg-white border border-gray-600 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent mb-3"
					/>
					<input
						type="text"
						placeholder={t('business.completeSetup.step4.instagramHandle')}
						value={formData.socialMedia.instagram}
						onChange={(e) => onSocialMediaChange('instagram', e.target.value)}
						className="w-full px-4 py-3 bg-white border border-gray-600 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent"
					/>
				</div>
			</div>
		</div>
	);
}

