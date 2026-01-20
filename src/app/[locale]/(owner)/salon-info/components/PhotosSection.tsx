'use client';

import { lazy, Suspense } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useTranslation } from '@/contexts/LanguageContext';

// Lazy load only when needed
const EnhancedPhotoUpload = lazy(
	() => import('@/components/EnhancedPhotoUpload')
);

interface PhotosSectionProps {
	photos: string[];
	onPhotosChange: (photos: string[]) => void;
	loading: boolean;
}

export default function PhotosSection({
	photos,
	onPhotosChange,
	loading,
}: PhotosSectionProps) {
	const t = useTranslation();

	return (
		<div id="photos" className="bg-white border border-gray-200 rounded-lg p-3 md:p-6 scroll-mt-20">
			<h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-4 md:mb-6">
				{t('owner.salonInfo.salonPhotos')}
			</h2>

			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">
					{t('owner.salonInfo.photosLabel')}
				</label>
				<Suspense fallback={<LoadingSpinner />}>
					<EnhancedPhotoUpload
						photos={photos}
						onPhotosChange={onPhotosChange}
						maxPhotos={3}
						maxSize={2}
						disabled={loading}
					/>
				</Suspense>
			</div>
		</div>
	);
}

