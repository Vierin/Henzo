'use client';

import React from 'react';
import { ChevronDown, Clock } from 'lucide-react';
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
}

export default function BookingServiceSelector({
	selectedService,
	services,
	showServiceSelector,
	isServiceDropdownOpen,
	onServiceSelect,
	onToggleServiceDropdown,
}: BookingServiceSelectorProps) {
	const { language, t } = useLanguage();

	if (!showServiceSelector) {
		return (
			<div className="mb-6 sm:mb-8 pt-4 md:pt-0">
				<div>
					<h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
						{selectedService
							? getLocalizedServiceName(selectedService, language)
							: t.booking.selectAService}
					</h2>
					<p className="text-sm sm:text-base text-gray-700 mb-4">
						{selectedService
							? getLocalizedServiceDescription(selectedService, language) ||
								t.booking.chooseFromAvailableServices
							: t.booking.chooseFromAvailableServices}
					</p>
					<div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
						<div className="flex gap-1">
							<span className="text-gray-500">
								<Clock className="w-4 h-4 mt-[1px]" />
							</span>
							<span className="text-sm text-gray-600">
								{selectedService?.duration
									? `${selectedService.duration} ${t('common.minutesShort') || t('homepage.minutesShort') || 'min'}`
									: t.booking.duration}
							</span>
						</div>
						<div className="flex items-center gap-2">
							<span className="text-base sm:text-lg font-bold text-[#ff5b5b]">
								{selectedService?.price
									? formatVND(selectedService.price)
									: t.booking.price}
							</span>
						</div>
					</div>
				</div>
			</div>
		);
	}

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
									: t.booking.selectAService}
							</div>
							<div className="text-xs sm:text-sm text-gray-600 truncate">
								{selectedService
									? getLocalizedServiceDescription(selectedService, language) ||
										t.booking.chooseFromAvailableServices
									: t.booking.chooseFromAvailableServices}
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
								const localizedDescription = getLocalizedServiceDescription(
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
										{localizedDescription && (
											<div className="text-sm text-gray-600">
												{localizedDescription}
											</div>
										)}
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
