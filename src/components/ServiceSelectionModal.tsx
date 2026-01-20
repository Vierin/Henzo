'use client';

import { useState, useMemo, useEffect } from 'react';
import { X, Search, Check } from 'lucide-react';
import { Service } from '@/types';
import { useTranslation } from '@/contexts/LanguageContext';

interface ServiceSelectionModalProps {
	isOpen: boolean;
	onClose: () => void;
	services: Service[];
	selectedServiceIds: string[];
	onChange: (serviceIds: string[]) => void;
}

export default function ServiceSelectionModal({
	isOpen,
	onClose,
	services,
	selectedServiceIds,
	onChange,
}: ServiceSelectionModalProps) {
	const t = useTranslation();
	const [searchQuery, setSearchQuery] = useState('');
	const [tempSelectedIds, setTempSelectedIds] = useState<string[]>(selectedServiceIds);
	const [selectAll, setSelectAll] = useState(selectedServiceIds.length === services.length && services.length > 0);

	// Initialize temp selected when modal opens
	useEffect(() => {
		if (isOpen) {
			// If selectedServiceIds is empty, it means all services are selected
			// So we need to populate tempSelectedIds with all service IDs
			if (selectedServiceIds.length === 0) {
				setTempSelectedIds(services.map((service) => service.id));
				setSelectAll(true);
			} else {
				setTempSelectedIds(selectedServiceIds);
				setSelectAll(selectedServiceIds.length === services.length && services.length > 0);
			}
			setSearchQuery('');
		}
	}, [isOpen, selectedServiceIds, services]);

	// Filter services based on search
	const filteredServices = useMemo(() => {
		if (!searchQuery.trim()) {
			return services;
		}
		const query = searchQuery.toLowerCase().trim();
		return services.filter((service) =>
			service.name.toLowerCase().includes(query)
		);
	}, [services, searchQuery]);

	// Handle select all
	const handleSelectAll = () => {
		if (selectAll && tempSelectedIds.length === services.length) {
			// Deselect all
			setTempSelectedIds([]);
			setSelectAll(false);
		} else {
			// Select all services (not just filtered)
			setTempSelectedIds(services.map((service) => service.id));
			setSelectAll(true);
		}
	};

	// Handle individual service toggle
	const handleToggleService = (serviceId: string) => {
		if (tempSelectedIds.includes(serviceId)) {
			const newSelected = tempSelectedIds.filter((id) => id !== serviceId);
			setTempSelectedIds(newSelected);
			setSelectAll(newSelected.length === services.length && services.length > 0);
		} else {
			const newSelected = [...tempSelectedIds, serviceId];
			setTempSelectedIds(newSelected);
			// Check if all services are selected
			setSelectAll(newSelected.length === services.length && services.length > 0);
		}
	};

	// Handle save
	const handleSave = () => {
		// If all services are selected, send empty array (means all services)
		if (tempSelectedIds.length === services.length) {
			onChange([]);
		} else {
			onChange(tempSelectedIds);
		}
		onClose();
	};

	// Handle cancel
	const handleCancel = () => {
		setTempSelectedIds(selectedServiceIds);
		setSelectAll(selectedServiceIds.length === services.length && services.length > 0);
		setSearchQuery('');
		onClose();
	};

	if (!isOpen) return null;

	const allSelected = tempSelectedIds.length === services.length && services.length > 0;
	const someSelected = tempSelectedIds.length > 0 && tempSelectedIds.length < services.length;
	
	const allServicesText = t('owner.staff.allServices') || t('owner.staffNew.allServices') || 'Все услуги';
	const servicesSelectedText = t('owner.staff.servicesSelected') || t('owner.staffNew.servicesSelected') || 'услуг выбрано';
	
	const displayText = allSelected
		? allServicesText
		: someSelected
			? `${tempSelectedIds.length} ${servicesSelectedText}`
			: allServicesText;

	return (
		<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
				{/* Header */}
				<div className="flex items-center justify-between p-4 border-b border-gray-200">
					<h2 className="text-lg font-semibold text-gray-900">
						{t('owner.staff.selectServices') || t('owner.staffNew.selectServices') || 'Выбрать услуги'}
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
							placeholder={t('owner.staff.searchServices') || t('owner.staffNew.searchServices') || 'Поиск услуг...'}
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

				{/* Services List */}
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
							{allServicesText}
						</span>
					</label>

					{/* Filtered Services List */}
					{filteredServices.length > 0 ? (
						<div className="space-y-1">
							{filteredServices.map((service) => (
								<label
									key={service.id}
									className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
								>
									<input
										type="checkbox"
										checked={tempSelectedIds.includes(service.id)}
										onChange={() => handleToggleService(service.id)}
										className="w-4 h-4 text-[#ff5b5b] border-gray-300 rounded focus:ring-[#ff5b5b]"
									/>
									<span className="text-sm text-gray-900 flex-1">{service.name}</span>
									{tempSelectedIds.includes(service.id) && (
										<Check className="w-4 h-4 text-[#ff5b5b]" />
									)}
								</label>
							))}
						</div>
					) : (
						<div className="text-center py-8 text-gray-500 text-sm">
							{t('owner.staff.noServicesFound') || t('owner.staffNew.noServicesFound') || 'Услуги не найдены'}
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

