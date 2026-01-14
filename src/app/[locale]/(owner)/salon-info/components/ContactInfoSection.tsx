'use client';

import { useTranslation } from '@/contexts/LanguageContext';

interface ContactInfoSectionProps {
	formData: {
		phone: string;
		email: string;
		website: string;
		instagram: string;
	};
	onChange: (field: string, value: string) => void;
}

export default function ContactInfoSection({
	formData,
	onChange,
}: ContactInfoSectionProps) {
	const t = useTranslation();

	return (
		<div className="bg-white border border-gray-200 rounded-lg p-3 md:p-6">
			<h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-4 md:mb-6">
				{t('owner.salonInfo.contactInformation')}
			</h2>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						{t('owner.salonInfo.phoneNumber')}
					</label>
					<input
						type="tel"
						value={formData.phone}
						onChange={(e) => onChange('phone', e.target.value)}
						className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
						placeholder={t('owner.salonInfo.phonePlaceholder')}
					/>
				</div>

				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						{t('owner.salonInfo.emailAddress')}
					</label>
					<input
						type="email"
						value={formData.email}
						onChange={(e) => onChange('email', e.target.value)}
						className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
						placeholder={t('owner.salonInfo.emailPlaceholder')}
					/>
				</div>

				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						{t('owner.salonInfo.website')}
					</label>
					<input
						type="url"
						value={formData.website}
						onChange={(e) => onChange('website', e.target.value)}
						className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
						placeholder={t('owner.salonInfo.websitePlaceholder')}
					/>
				</div>

				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						{t('owner.salonInfo.instagram')}
					</label>
					<input
						type="text"
						value={formData.instagram}
						onChange={(e) => onChange('instagram', e.target.value)}
						className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
						placeholder={t('owner.salonInfo.instagramPlaceholder')}
					/>
				</div>
			</div>
		</div>
	);
}

