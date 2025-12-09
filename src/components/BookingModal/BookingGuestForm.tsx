'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface BookingGuestFormProps {
	clientEmail: string;
	clientName: string;
	clientPhone: string;
	onEmailChange: (email: string) => void;
	onNameChange: (name: string) => void;
	onPhoneChange: (phone: string) => void;
}

export default function BookingGuestForm({
	clientEmail,
	clientName,
	clientPhone,
	onEmailChange,
	onNameChange,
	onPhoneChange,
}: BookingGuestFormProps) {
	const { t } = useLanguage();

	return (
		<div className="mb-6 sm:mb-8">
			<h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">
				{t('booking.clientInfo')}
			</h3>
			<div className="space-y-4">
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">
						{t('booking.clientEmail')} <span className="text-red-500">*</span>
					</label>
					<input
						type="email"
						value={clientEmail}
						onChange={(e) => onEmailChange(e.target.value)}
						className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-sm"
						placeholder={t('booking.clientEmailPlaceholder') || 'client@example.com'}
						required
					/>
				</div>
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">
						{t('booking.clientNameOptional')}
					</label>
					<input
						type="text"
						value={clientName}
						onChange={(e) => onNameChange(e.target.value)}
						className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-sm"
						placeholder={t('booking.clientNamePlaceholder') || 'Client name'}
					/>
				</div>
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">
						{t('booking.clientPhoneOptional')}
					</label>
					<input
						type="tel"
						value={clientPhone}
						onChange={(e) => onPhoneChange(e.target.value)}
						className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-sm"
						placeholder={t('booking.clientPhonePlaceholder') || '+84...'}
					/>
				</div>
			</div>
		</div>
	);
}

