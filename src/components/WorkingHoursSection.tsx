'use client';

import { TimePicker } from 'rsuite';
import 'rsuite/dist/rsuite-no-reset.min.css';
import { useTranslation } from '@/contexts/LanguageContext';

// Wrapper для rsuite TimePicker
const TimePicker24h = ({
	value,
	onChange,
	className = '',
}: {
	value: string;
	onChange: (value: string) => void;
	className?: string;
}) => {
	// Конвертируем строку HH:MM в Date для rsuite
	const parseTimeToDate = (timeStr: string): Date | null => {
		if (!timeStr || !timeStr.includes(':')) return null;
		const [hours, minutes] = timeStr.split(':').map(Number);
		const date = new Date();
		date.setHours(hours, minutes, 0, 0);
		return date;
	};

	// Конвертируем Date обратно в строку HH:MM
	const formatDateToTime = (date: Date | null): string => {
		if (!date) return '';
		const hours = date.getHours().toString().padStart(2, '0');
		const minutes = date.getMinutes().toString().padStart(2, '0');
		return `${hours}:${minutes}`;
	};

	const handleChange = (date: Date | null) => {
		onChange(formatDateToTime(date));
	};

	return (
		<div className={className} style={{ width: '100%', minWidth: '80px' }}>
			<TimePicker
				value={parseTimeToDate(value)}
				onChange={handleChange}
				format="HH:mm"
				cleanable={false}
				placeholder="09:00"
				className="custom-time-picker"
				style={{ width: '100%', minWidth: '80px', maxWidth: '120px' }}
			/>
		</div>
	);
};

interface WorkingHours {
	monday: { open: string; close: string; closed: boolean };
	tuesday: { open: string; close: string; closed: boolean };
	wednesday: { open: string; close: string; closed: boolean };
	thursday: { open: string; close: string; closed: boolean };
	friday: { open: string; close: string; closed: boolean };
	saturday: { open: string; close: string; closed: boolean };
	sunday: { open: string; close: string; closed: boolean };
}

interface WorkingHoursSectionProps {
	workingHours: WorkingHours;
	onChange: (workingHours: WorkingHours) => void;
	className?: string;
}

export default function WorkingHoursSection({
	workingHours,
	onChange,
	className = '',
}: WorkingHoursSectionProps) {
	const t = useTranslation();
	
	const days = [
		{ key: 'monday', label: t('weekdays.monday') },
		{ key: 'tuesday', label: t('weekdays.tuesday') },
		{ key: 'wednesday', label: t('weekdays.wednesday') },
		{ key: 'thursday', label: t('weekdays.thursday') },
		{ key: 'friday', label: t('weekdays.friday') },
		{ key: 'saturday', label: t('weekdays.saturday') },
		{ key: 'sunday', label: t('weekdays.sunday') },
	];
	const toggleDayClosed = (day: string) => {
		const newWorkingHours = {
			...workingHours,
			[day]: {
				...workingHours[day as keyof WorkingHours],
				closed: !workingHours[day as keyof WorkingHours].closed,
				open: workingHours[day as keyof WorkingHours].closed ? '09:00' : '',
				close: workingHours[day as keyof WorkingHours].closed ? '18:00' : '',
			},
		};
		onChange(newWorkingHours);
	};

	const handleTimeChange = (
		day: string,
		field: 'open' | 'close',
		value: string
	) => {
		const newWorkingHours = {
			...workingHours,
			[day]: {
				...workingHours[day as keyof WorkingHours],
				[field]: value,
			},
		};
		onChange(newWorkingHours);
	};

	return (
		<div className={`space-y-3 ${className}`}>
			{days.map((day) => {
				const dayData = workingHours[day.key as keyof WorkingHours];
				return (
					<div
						key={day.key}
						className="flex flex-col sm:flex-row sm:items-center justify-between py-4 px-3 md:px-5 bg-[#ffe5e5]/30 rounded-lg gap-3 sm:gap-4"
					>
						{/* Toggle + Day Name */}
						<div className="flex items-center justify-between sm:justify-start gap-3 sm:min-w-[140px]">
							<div className="flex items-center gap-3">
								<button
									type="button"
									onClick={() => toggleDayClosed(day.key)}
									className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none flex-shrink-0 ${
										!dayData.closed ? 'bg-[#ff5b5b]' : 'bg-gray-300'
									}`}
								>
									<span
										className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
											!dayData.closed ? 'translate-x-6' : 'translate-x-1'
										}`}
									/>
								</button>
								<span className="text-sm md:text-base font-medium text-gray-700">
									{day.label}
								</span>
							</div>

							{/* Show closed status on mobile */}
							{dayData.closed && (
								<span className="text-[#ff5b5b] font-medium sm:hidden">
									{t('owner.salonInfo.closed') || t('business.completeSetup.step5.closed') || 'Closed'}
								</span>
							)}
						</div>

						{/* Time Pickers or Closed (hidden on mobile for closed days) */}
						{!dayData.closed && (
							<div className="flex items-center gap-2 md:gap-4 w-full sm:w-auto">
								<div className="flex-1 sm:flex-none">
									<TimePicker24h
										value={dayData.open}
										onChange={(value) =>
											handleTimeChange(day.key, 'open', value)
										}
									/>
								</div>
								<span className="text-gray-400 font-medium">-</span>
								<div className="flex-1 sm:flex-none">
									<TimePicker24h
										value={dayData.close}
										onChange={(value) =>
											handleTimeChange(day.key, 'close', value)
										}
									/>
								</div>
							</div>
						)}

						{/* Closed status for desktop */}
						{dayData.closed && (
							<span className="text-[#ff5b5b] font-medium hidden sm:block">
								{t('owner.salonInfo.closed') || t('business.completeSetup.step5.closed') || 'Closed'}
							</span>
						)}
					</div>
				);
			})}
		</div>
	);
}
