'use client';

import { useState } from 'react';
import { Service } from '@/types';
import { useTranslation } from '@/contexts/LanguageContext';
import ServiceSelectionModal from './ServiceSelectionModal';

interface ServiceSelectorProps {
	services: Service[];
	selectedServiceIds: string[];
	onChange: (serviceIds: string[]) => void;
	label?: string;
	helpText?: string;
	optional?: boolean;
}

export default function ServiceSelector({
	services,
	selectedServiceIds,
	onChange,
	label,
	helpText,
	optional = true,
}: ServiceSelectorProps) {
	const t = useTranslation();
	const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);

	if (services.length === 0) {
		return null;
	}

	const allServicesText = t('owner.staff.allServices') || t('owner.staffNew.allServices') || 'Все услуги';
	const servicesSelectedText = t('owner.staff.servicesSelected') || t('owner.staffNew.servicesSelected') || 'услуг выбрано';
	
	// Empty array means all services are selected (like StaffSelector)
	const displayText =
		selectedServiceIds.length === 0 ||
		(selectedServiceIds.length === services.length && services.length > 0)
			? allServicesText
			: `${selectedServiceIds.length} ${servicesSelectedText}`;

	return (
		<>
			<div className="w-full">
				<label
					htmlFor="staff-services"
					className="block text-sm font-medium text-gray-700 mb-2"
				>
					{label || t('owner.staff.services') || t('owner.staffNew.services')}
					{optional && (
						<span className="text-xs text-gray-500 ml-1">
							({t('owner.staff.servicesOptional') || t('owner.staffNew.servicesOptional')})
						</span>
					)}
				</label>
				<button
					type="button"
					id="staff-services"
					onClick={() => setIsServiceModalOpen(true)}
					className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-gray-900 text-sm text-left bg-white hover:bg-gray-50 transition-colors"
				>
					{displayText}
				</button>
				{helpText && (
					<p className="text-xs text-gray-500 mt-1">{helpText}</p>
				)}
			</div>

			<ServiceSelectionModal
				isOpen={isServiceModalOpen}
				onClose={() => setIsServiceModalOpen(false)}
				services={services}
				selectedServiceIds={selectedServiceIds}
				onChange={onChange}
			/>
		</>
	);
}

