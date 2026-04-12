'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface BookingGuestFormProps {
	clientEmail: string;
	clientName: string;
	clientPhone: string;
	onEmailChange: (email: string) => void;
	onNameChange: (name: string) => void;
	onPhoneChange: (phone: string) => void;
	/** Invalid email format (owner flow) — red ring on email field */
	emailFieldError?: boolean;
}

export default function BookingGuestForm({
	clientEmail,
	clientName,
	clientPhone,
	onEmailChange,
	onNameChange,
	onPhoneChange,
	emailFieldError = false,
}: BookingGuestFormProps) {
	const { t } = useLanguage();
	const hasEmail = clientEmail && clientEmail.trim().length > 0;

	return (
		<div className="mb-6 sm:mb-8">
			<h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">
				{t('booking.clientInfo')}
			</h3>
			<div className="space-y-4">
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">
						{t('booking.clientEmail')} {t('booking.optional') || '(Optional)'}
					</label>
					<input
						type="email"
						value={clientEmail}
						onChange={(e) => onEmailChange(e.target.value)}
						className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-sm ${
							emailFieldError
								? 'border-red-500 ring-2 ring-red-500/40'
								: 'border-gray-300'
						}`}
						placeholder={t('booking.clientEmailPlaceholder') || 'client@example.com'}
						aria-invalid={emailFieldError}
					/>
					{!hasEmail && (
						<div className="mt-2 flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
							<AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
							<p className="text-xs text-amber-800">
								{t('booking.noEmailWarning') || 'Reminders will not be sent without an email address.'}
							</p>
						</div>
					)}
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

