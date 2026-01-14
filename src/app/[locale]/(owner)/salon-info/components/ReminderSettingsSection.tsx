'use client';

import { useTranslation } from '@/contexts/LanguageContext';

interface ReminderSettingsSectionProps {
	intervals: number[];
	onChange: (intervals: number[]) => void;
}

export default function ReminderSettingsSection({
	intervals,
	onChange,
}: ReminderSettingsSectionProps) {
	const t = useTranslation();

	const handleToggle = (hours: number) => {
		if (intervals.includes(hours)) {
			// Prevent removing if it's the only option
			if (intervals.length > 1) {
				onChange(intervals.filter((i) => i !== hours));
			}
		} else {
			onChange([...intervals, hours].sort((a, b) => b - a));
		}
	};

	return (
		<div className="bg-white border border-gray-200 rounded-lg p-3 md:p-6">
			<h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-4 md:mb-6">
				{t('owner.salonInfo.reminderSettings') ||
					'Booking Reminder Settings'}
			</h2>
			<p className="text-sm text-gray-600 mb-4">
				{t('owner.salonInfo.reminderSettingsDescription') ||
					'Select when to send reminder notifications to clients before their appointments. At least one option must be selected.'}
			</p>
			<div className="space-y-3">
				{/* 3 hours option */}
				<label className="flex items-center space-x-3 cursor-pointer group">
					<input
						type="checkbox"
						checked={intervals.includes(3)}
						onChange={() => handleToggle(3)}
						disabled={
							intervals.length === 1 && intervals.includes(3)
						}
						className="sr-only"
					/>
					<div
						className={`relative w-4 h-4 border-2 border-[#ff5b5b] rounded flex items-center justify-center transition-colors ${
							intervals.includes(3)
								? 'bg-[#ff5b5b]'
								: 'bg-white'
						} ${
							intervals.length === 1 && intervals.includes(3)
								? 'opacity-50 cursor-not-allowed'
								: 'cursor-pointer'
						}`}
					>
						{intervals.includes(3) && (
							<svg
								className="w-3 h-3 text-white"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={3}
									d="M5 13l4 4L19 7"
								/>
							</svg>
						)}
					</div>
					<span className="text-gray-700">
						{t('owner.salonInfo.reminder3Hours') || '3 hours before'}
					</span>
				</label>

				{/* 24 hours (1 day) option - default */}
				<label className="flex items-center space-x-3 cursor-pointer group">
					<input
						type="checkbox"
						checked={intervals.includes(24)}
						onChange={() => handleToggle(24)}
						disabled={
							intervals.length === 1 && intervals.includes(24)
						}
						className="sr-only"
					/>
					<div
						className={`relative w-4 h-4 border-2 border-[#ff5b5b] rounded flex items-center justify-center transition-colors ${
							intervals.includes(24)
								? 'bg-[#ff5b5b]'
								: 'bg-white'
						} ${
							intervals.length === 1 && intervals.includes(24)
								? 'opacity-50 cursor-not-allowed'
								: 'cursor-pointer'
						}`}
					>
						{intervals.includes(24) && (
							<svg
								className="w-3 h-3 text-white"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={3}
									d="M5 13l4 4L19 7"
								/>
							</svg>
						)}
					</div>
					<span className="text-gray-700 font-medium">
						{t('owner.salonInfo.reminder1Day') ||
							'1 day (24 hours) before'}{' '}
						({t('owner.salonInfo.default') || 'Default'})
					</span>
				</label>

				{/* 168 hours (1 week) option */}
				<label className="flex items-center space-x-3 cursor-pointer group">
					<input
						type="checkbox"
						checked={intervals.includes(168)}
						onChange={() => handleToggle(168)}
						disabled={
							intervals.length === 1 && intervals.includes(168)
						}
						className="sr-only"
					/>
					<div
						className={`relative w-4 h-4 border-2 border-[#ff5b5b] rounded flex items-center justify-center transition-colors ${
							intervals.includes(168)
								? 'bg-[#ff5b5b]'
								: 'bg-white'
						} ${
							intervals.length === 1 && intervals.includes(168)
								? 'opacity-50 cursor-not-allowed'
								: 'cursor-pointer'
						}`}
					>
						{intervals.includes(168) && (
							<svg
								className="w-3 h-3 text-white"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={3}
									d="M5 13l4 4L19 7"
								/>
							</svg>
						)}
					</div>
					<span className="text-gray-700">
						{t('owner.salonInfo.reminder1Week') ||
							'1 week (168 hours) before'}
					</span>
				</label>
			</div>
			{intervals.length === 0 && (
				<p className="mt-2 text-sm text-red-600">
					{t('owner.salonInfo.atLeastOneReminderRequired') ||
						'At least one reminder option must be selected'}
				</p>
			)}
		</div>
	);
}

