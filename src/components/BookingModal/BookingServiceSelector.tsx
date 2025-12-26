'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Clock, Search, X } from 'lucide-react';
import { Service } from '@/types';
import { formatVND } from '@/utils/currency';
import { useLanguage } from '@/contexts/LanguageContext';
import {
	getLocalizedServiceName,
	getLocalizedServiceDescription,
} from '@/utils/serviceLocalization';

interface BookingServiceSelectorProps {
	selectedService: Service | null;
	services: Service[];
	showServiceSelector: boolean;
	isServiceDropdownOpen: boolean;
	onServiceSelect: (service: Service) => void;
	onToggleServiceDropdown: () => void;
	isOwnerMode?: boolean;
}

export default function BookingServiceSelector({
	selectedService,
	services,
	showServiceSelector,
	isServiceDropdownOpen,
	onServiceSelect,
	onToggleServiceDropdown,
	isOwnerMode = false,
}: BookingServiceSelectorProps) {
	const { language, t } = useLanguage();
	const [searchQuery, setSearchQuery] = useState('');
	const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const suggestionsRef = useRef<HTMLDivElement>(null);

	// Filter services based on search query
	const filteredServices = React.useMemo(() => {
		if (!searchQuery.trim()) return services;
		const query = searchQuery.toLowerCase();
		return services.filter((service) => {
			const name = getLocalizedServiceName(service, language).toLowerCase();
			return name.includes(query);
		});
	}, [searchQuery, services, language]);

	// Close suggestions when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				suggestionsRef.current &&
				!suggestionsRef.current.contains(event.target as Node) &&
				inputRef.current &&
				!inputRef.current.contains(event.target as Node)
			) {
				setIsSuggestionsOpen(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	// Update search query when selected service changes
	useEffect(() => {
		if (selectedService && isOwnerMode) {
			setSearchQuery(getLocalizedServiceName(selectedService, language));
		}
	}, [selectedService, isOwnerMode, language]);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		setSearchQuery(value);
		setIsSuggestionsOpen(true);
	};

	const handleServiceSelect = (service: Service) => {
		onServiceSelect(service);
		setSearchQuery(getLocalizedServiceName(service, language));
		setIsSuggestionsOpen(false);
	};

	const handleInputFocus = () => {
		setIsSuggestionsOpen(true);
	};

	const handleClear = () => {
		setSearchQuery('');
		setIsSuggestionsOpen(true);
		onServiceSelect(null as any);
		inputRef.current?.focus();
	};

	if (!showServiceSelector) {
		return (
			<div className="mb-6 sm:mb-8 pt-4 md:pt-0">
				<div>
					<h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
						{selectedService
							? getLocalizedServiceName(selectedService, language)
							: t('booking.selectAService')}
					</h2>
					<p className="text-sm sm:text-base text-gray-700 mb-4">
						{selectedService
							? getLocalizedServiceDescription(selectedService, language) ||
								t('booking.chooseFromAvailableServices')
							: t('booking.chooseFromAvailableServices')}
					</p>
					<div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
						<div className="flex gap-1">
							<span className="text-gray-500">
								<Clock className="w-4 h-4 mt-[1px]" />
							</span>
							<span className="text-sm text-gray-600">
								{selectedService?.duration
									? `${selectedService.duration} ${t('common.minutesShort') || t('homepage.minutesShort') || 'min'}`
									: t('booking.duration')}
							</span>
						</div>
						<div className="flex items-center gap-2">
							<span className="text-base sm:text-lg font-bold text-[#ff5b5b]">
								{selectedService?.price
									? formatVND(selectedService.price)
									: t('booking.price')}
							</span>
						</div>
					</div>
				</div>
			</div>
		);
	}

	// Owner mode: Autocomplete input
	if (isOwnerMode) {
		return (
			<div className="mb-6 sm:mb-8 pt-4 md:pt-0">
				<div>
					{/* Service Autocomplete Input */}
					<div className="relative mb-4">
						<div className="relative">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
							<input
								ref={inputRef}
								type="text"
								value={searchQuery}
								onChange={handleInputChange}
								onFocus={handleInputFocus}
								placeholder={t('booking.selectAService')}
								className="w-full pl-10 pr-10 py-3 sm:py-4 border border-gray-300 rounded-lg bg-white text-base sm:text-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#ea4b4b] focus:border-transparent"
							/>
							{searchQuery && (
								<button
									type="button"
									onClick={handleClear}
									className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
								>
									<X className="w-5 h-5" />
								</button>
							)}
						</div>

						{/* Suggestions Dropdown */}
						{isSuggestionsOpen && filteredServices.length > 0 && (
							<div
								ref={suggestionsRef}
								className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-[195px] overflow-y-auto scrollbar-hide"
							>
								{filteredServices.map((serviceOption) => {
									const localizedName = getLocalizedServiceName(
										serviceOption,
										language
									);
									return (
										<button
											key={serviceOption.id}
											type="button"
											onClick={() => handleServiceSelect(serviceOption)}
											className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
										>
											<div className="font-medium text-gray-900">
												{localizedName}
											</div>
											<div className="text-sm text-gray-500 mt-1">
												{serviceOption.duration} min •{' '}
												{formatVND(serviceOption.price)}
											</div>
										</button>
									);
								})}
							</div>
						)}
					</div>

					{/* Service Details */}
					{selectedService && (
						<div className="flex items-center gap-6">
							<div className="flex items-center gap-2">
								<span className="text-gray-500">
									<Clock className="w-4 h-4" />
								</span>
								<span className="text-sm text-gray-600">
									{selectedService.duration}{' '}
									{t('common.minutesShort') ||
										t('homepage.minutesShort') ||
										'min'}
								</span>
							</div>
							<div className="flex items-center gap-2">
								<span className="text-lg font-bold text-[#ff5b5b]">
									{formatVND(selectedService.price)}
								</span>
							</div>
						</div>
					)}
				</div>
			</div>
		);
	}

	// Client mode: Dropdown (existing behavior)
	return (
		<div className="mb-6 sm:mb-8 pt-4 md:pt-0">
			<div>
				{/* Service Selector Dropdown */}
				<div className="relative mb-4">
					<button
						type="button"
						onClick={onToggleServiceDropdown}
						className="w-full flex items-center justify-between p-3 sm:p-4 border border-gray-300 rounded-lg bg-white text-left focus:outline-none focus:ring-2 focus:ring-[#ea4b4b] focus:border-transparent"
					>
						<div className="flex-1 min-w-0">
							<div className="text-base sm:text-lg font-semibold text-gray-900 truncate">
								{selectedService
									? getLocalizedServiceName(selectedService, language)
									: t('booking.selectAService')}
							</div>
							<div className="text-xs sm:text-sm text-gray-600 truncate">
								{selectedService
									? getLocalizedServiceDescription(selectedService, language) ||
										t('booking.chooseFromAvailableServices')
									: t('booking.chooseFromAvailableServices')}
							</div>
						</div>
						<ChevronDown
							className={`w-5 h-5 text-gray-400 transition-transform ${
								isServiceDropdownOpen ? 'rotate-180' : ''
							}`}
						/>
					</button>

					{isServiceDropdownOpen && (
						<div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto scrollbar-hide">
							{services.map((serviceOption) => {
								const localizedName = getLocalizedServiceName(
									serviceOption,
									language
								);
								return (
									<button
										key={serviceOption.id}
										type="button"
										onClick={() => {
											onServiceSelect(serviceOption);
										}}
										className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
									>
										<div className="font-medium text-gray-900">
											{localizedName}
										</div>
										<div className="text-sm text-gray-500 mt-1">
											{serviceOption.duration} min •{' '}
											{formatVND(serviceOption.price)}
										</div>
									</button>
								);
							})}
						</div>
					)}
				</div>

				{/* Service Details */}
				{selectedService && (
					<div className="flex items-center gap-6">
						<div className="flex items-center gap-2">
							<span className="text-gray-500">
								<Clock className="w-4 h-4" />
							</span>
							<span className="text-sm text-gray-600">
								{selectedService.duration}{' '}
								{t('common.minutesShort') ||
									t('homepage.minutesShort') ||
									'min'}
							</span>
						</div>
						<div className="flex items-center gap-2">
							<span className="text-lg font-bold text-[#ff5b5b]">
								{formatVND(selectedService.price)}
							</span>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
