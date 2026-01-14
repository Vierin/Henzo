'use client';

import { lazy, Suspense } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useTranslation } from '@/contexts/LanguageContext';

// Lazy load only when needed
const EnhancedFileUpload = lazy(
	() => import('@/components/EnhancedFileUpload')
);

interface LogoSectionProps {
	logo: string;
	onUpload: (filePath: string) => void;
	onRemove: () => void;
	loading: boolean;
}

export default function LogoSection({
	logo,
	onUpload,
	onRemove,
	loading,
}: LogoSectionProps) {
	const t = useTranslation();

	return (
		<div className="bg-white border border-gray-200 rounded-lg p-3 md:p-6">
			<h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-4 md:mb-6">
				{t('owner.salonInfo.salonLogo')}
			</h2>

			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">
					{t('owner.salonInfo.salonLogo')}
				</label>
				<Suspense fallback={<LoadingSpinner />}>
					<EnhancedFileUpload
						onUpload={onUpload}
						onRemove={onRemove}
						currentFile={logo}
						accept="image/*"
						maxSize={2}
						placeholder={t('owner.salonInfo.logoPlaceholder')}
						disabled={loading}
					/>
				</Suspense>
			</div>
		</div>
	);
}

