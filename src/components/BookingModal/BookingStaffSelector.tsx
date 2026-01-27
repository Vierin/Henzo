'use client';

import React from 'react';
import { Staff } from '@/types';
import { useTranslation } from '@/contexts/LanguageContext';

interface BookingStaffSelectorProps {
	selectedStaff: string;
	allStaffMembers: Staff[];
	isStaffDropdownOpen: boolean;
	onStaffSelect: (staffName: string) => void;
	onToggleStaffDropdown: () => void;
}

export default function BookingStaffSelector({
	selectedStaff,
	allStaffMembers,
	isStaffDropdownOpen,
	onStaffSelect,
	onToggleStaffDropdown,
	staffLoading = false,
}: BookingStaffSelectorProps & { staffLoading?: boolean }) {
	const t = useTranslation();

	return (
		<div className="mb-6 sm:mb-8">
			<h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">
				{t.booking.selectAStaffMember}
			</h3>
			<div className="relative staff-dropdown">
				<button
					onClick={onToggleStaffDropdown}
					className="w-full p-3 sm:p-4 rounded-lg text-left bg-white border border-gray-200 hover:bg-gray-50 transition-colors flex items-center justify-between"
				>
					<div className="flex items-center gap-3">
						<span className="font-medium text-gray-900">{selectedStaff}</span>
					</div>
					<svg
						className={`w-5 h-5 text-gray-400 transition-transform ${
							isStaffDropdownOpen ? 'rotate-180' : ''
						}`}
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M19 9l-7 7-7-7"
						/>
					</svg>
				</button>

				{isStaffDropdownOpen && (
					<div className="absolute bottom-full sm:top-full left-0 right-0 mb-1 sm:mb-0 sm:mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-[225px] min-h-[112px] overflow-y-auto scrollbar-hide">
						{staffLoading ? (
							<div className="p-4 text-center text-gray-500 text-sm">
								{t('booking.loadingStaff')}
							</div>
						) : allStaffMembers.length === 0 ? (
							<div className="p-4 text-center text-gray-500 text-sm">
								{t('booking.noStaffAvailable')}
							</div>
						) : (
							allStaffMembers.map((staff) => (
								<button
									key={staff.id}
									onClick={() => {
										onStaffSelect(staff.name);
									}}
									className="w-full p-4 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 first:rounded-t-lg last:rounded-b-lg"
								>
									<span className="font-medium text-gray-900">
										{staff.name}
									</span>
								</button>
							))
						)}
					</div>
				)}
			</div>
		</div>
	);
}
