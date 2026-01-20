'use client';

import { useState, useMemo, useEffect } from 'react';
import { X, Search, Check } from 'lucide-react';
import { Staff } from '@/types';
import { useTranslation } from '@/contexts/LanguageContext';

interface StaffSelectionModalProps {
	isOpen: boolean;
	onClose: () => void;
	staffMembers: Staff[];
	selectedStaffIds: string[];
	onChange: (staffIds: string[]) => void;
}

export default function StaffSelectionModal({
	isOpen,
	onClose,
	staffMembers,
	selectedStaffIds,
	onChange,
}: StaffSelectionModalProps) {
	const t = useTranslation();
	const [searchQuery, setSearchQuery] = useState('');
	const [tempSelectedIds, setTempSelectedIds] = useState<string[]>(selectedStaffIds);
	const [selectAll, setSelectAll] = useState(selectedStaffIds.length === staffMembers.length && staffMembers.length > 0);

	// Initialize temp selected when modal opens
	useEffect(() => {
		if (isOpen) {
			// If selectedStaffIds is empty, it means all staff are selected
			// So we need to populate tempSelectedIds with all staff IDs
			if (selectedStaffIds.length === 0) {
				setTempSelectedIds(staffMembers.map((staff) => staff.id));
				setSelectAll(true);
			} else {
				setTempSelectedIds(selectedStaffIds);
				setSelectAll(selectedStaffIds.length === staffMembers.length && staffMembers.length > 0);
			}
			setSearchQuery('');
		}
	}, [isOpen, selectedStaffIds, staffMembers]);

	// Filter staff based on search
	const filteredStaff = useMemo(() => {
		if (!searchQuery.trim()) {
			return staffMembers;
		}
		const query = searchQuery.toLowerCase().trim();
		return staffMembers.filter((staff) =>
			staff.name.toLowerCase().includes(query)
		);
	}, [staffMembers, searchQuery]);

	// Handle select all
	const handleSelectAll = () => {
		if (selectAll && tempSelectedIds.length === staffMembers.length) {
			// Deselect all
			setTempSelectedIds([]);
			setSelectAll(false);
		} else {
			// Select all staff members (not just filtered)
			setTempSelectedIds(staffMembers.map((staff) => staff.id));
			setSelectAll(true);
		}
	};

	// Handle individual staff toggle
	const handleToggleStaff = (staffId: string) => {
		if (tempSelectedIds.includes(staffId)) {
			const newSelected = tempSelectedIds.filter((id) => id !== staffId);
			setTempSelectedIds(newSelected);
			setSelectAll(newSelected.length === staffMembers.length && staffMembers.length > 0);
		} else {
			const newSelected = [...tempSelectedIds, staffId];
			setTempSelectedIds(newSelected);
			// Check if all staff are selected
			setSelectAll(newSelected.length === staffMembers.length && staffMembers.length > 0);
		}
	};

	// Handle save
	const handleSave = () => {
		// If all staff are selected, send empty array (means all staff)
		if (tempSelectedIds.length === staffMembers.length) {
			onChange([]);
		} else {
			onChange(tempSelectedIds);
		}
		onClose();
	};

	// Handle cancel
	const handleCancel = () => {
		setTempSelectedIds(selectedStaffIds);
		setSelectAll(selectedStaffIds.length === staffMembers.length && staffMembers.length > 0);
		setSearchQuery('');
		onClose();
	};

	if (!isOpen) return null;

	const allSelected = tempSelectedIds.length === staffMembers.length && staffMembers.length > 0;
	const someSelected = tempSelectedIds.length > 0 && tempSelectedIds.length < staffMembers.length;
	const displayText = allSelected
		? t('owner.servicesNew.allStaff')
		: someSelected
			? `${tempSelectedIds.length} ${t('owner.servicesNew.staffSelected')}`
			: t('owner.servicesNew.noStaff');

	return (
		<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
				{/* Header */}
				<div className="flex items-center justify-between p-4 border-b border-gray-200">
					<h2 className="text-lg font-semibold text-gray-900">
						{t('owner.servicesNew.selectStaff')}
					</h2>
					<button
						onClick={handleCancel}
						className="p-1 hover:bg-gray-100 rounded-full transition-colors"
						aria-label={t('common.close')}
					>
						<X className="w-5 h-5 text-gray-500" />
					</button>
				</div>

				{/* Search */}
				<div className="p-4 border-b border-gray-200">
					<div className="relative">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder={t('owner.servicesNew.searchStaff')}
							className={`w-full py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-gray-900 text-sm ${searchQuery ? 'pl-10 pr-10' : 'pl-10 pr-3'}`}
						/>
						{searchQuery && (
							<button
								onClick={() => setSearchQuery('')}
								className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
								type="button"
								aria-label={t('common.close')}
							>
								<X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
							</button>
						)}
					</div>
				</div>

				{/* Staff List */}
				<div className="flex-1 overflow-y-auto p-4 sm:min-h-[260px]">
					{/* Select All */}
					<label className="flex items-center space-x-3 p-3 mb-2 border-b border-gray-200 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
						<input
							type="checkbox"
							checked={allSelected}
							onChange={handleSelectAll}
							className="w-4 h-4 text-[#ff5b5b] border-gray-300 rounded focus:ring-[#ff5b5b]"
						/>
						<span className="text-sm font-medium text-gray-900">
							{t('owner.servicesNew.allStaff')}
						</span>
					</label>

					{/* Filtered Staff List */}
					{filteredStaff.length > 0 ? (
						<div className="space-y-1">
							{filteredStaff.map((staff) => (
								<label
									key={staff.id}
									className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
								>
									<input
										type="checkbox"
										checked={tempSelectedIds.includes(staff.id)}
										onChange={() => handleToggleStaff(staff.id)}
										className="w-4 h-4 text-[#ff5b5b] border-gray-300 rounded focus:ring-[#ff5b5b]"
									/>
									<span className="text-sm text-gray-900 flex-1">{staff.name}</span>
									{tempSelectedIds.includes(staff.id) && (
										<Check className="w-4 h-4 text-[#ff5b5b]" />
									)}
								</label>
							))}
						</div>
					) : (
						<div className="text-center py-8 text-gray-500 text-sm">
							{t('owner.servicesNew.noStaffFound')}
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="flex items-center justify-between p-4 border-t border-gray-200">
					<span className="text-sm text-gray-600">
						{displayText}
					</span>
				 
						<button
							onClick={handleSave}
							className="px-4 py-2 bg-[#ff5b5b] text-white rounded-lg hover:bg-[#e04a4a] transition-colors text-sm font-medium"
						>
							{t('common.save')}
						</button>
				</div>
			</div>
		</div>
	);
}

