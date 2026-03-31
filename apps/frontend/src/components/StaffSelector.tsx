'use client';

import { useState } from 'react';
import { Staff } from '@/types';
import { useTranslation } from '@/contexts/LanguageContext';
import StaffSelectionModal from './StaffSelectionModal';

interface StaffSelectorProps {
	staffMembers: Staff[];
	selectedStaffIds: string[];
	onChange: (staffIds: string[]) => void;
	label?: string;
	helpText?: string;
	optional?: boolean;
}

export default function StaffSelector({
	staffMembers,
	selectedStaffIds,
	onChange,
	label,
	helpText,
	optional = true,
}: StaffSelectorProps) {
	const t = useTranslation();
	const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);

	if (staffMembers.length === 0) {
		return null;
	}

	// Try to get translations from owner.services first, fallback to owner.servicesNew
	const allStaffText = t('owner.services.allStaff') || t('owner.servicesNew.allStaff');
	const staffSelectedText = t('owner.services.staffSelected') || t('owner.servicesNew.staffSelected');
	
	const displayText =
		selectedStaffIds.length === 0 ||
		(selectedStaffIds.length === staffMembers.length && staffMembers.length > 0)
			? allStaffText
			: `${selectedStaffIds.length} ${staffSelectedText}`;

	return (
		<>
			<div className="w-full">
				<label
					htmlFor="service-staff"
					className="block text-sm font-medium text-gray-700 mb-2"
				>
					{label || t('owner.services.staff') || t('owner.servicesNew.staff')}
					{optional && (
						<span className="text-xs text-gray-500 ml-1">
							({t('owner.services.staffOptional') || t('owner.servicesNew.staffOptional')})
						</span>
					)}
				</label>
				<button
					type="button"
					id="service-staff"
					onClick={() => setIsStaffModalOpen(true)}
					className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-gray-900 text-sm text-left bg-white hover:bg-gray-50 transition-colors"
				>
					{displayText}
				</button>
				{helpText && (
					<p className="text-xs text-gray-500 mt-1">{helpText}</p>
				)}
			</div>

			<StaffSelectionModal
				isOpen={isStaffModalOpen}
				onClose={() => setIsStaffModalOpen(false)}
				staffMembers={staffMembers}
				selectedStaffIds={selectedStaffIds}
				onChange={onChange}
			/>
		</>
	);
}

