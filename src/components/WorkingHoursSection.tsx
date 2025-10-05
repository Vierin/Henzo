'use client';

import { useState } from 'react';

// Кастомный компонент для выбора времени в 24-часовом формате
const TimePicker24h = ({
	value,
	onChange,
	className = '',
}: {
	value: string;
	onChange: (value: string) => void;
	className?: string;
}) => {
	const [hours, minutes] = value.split(':').map(Number);

	const handleHoursChange = (newHours: number) => {
		const formattedHours = newHours.toString().padStart(2, '0');
		onChange(`${formattedHours}:${minutes.toString().padStart(2, '0')}`);
	};

	const handleMinutesChange = (newMinutes: number) => {
		const formattedMinutes = newMinutes.toString().padStart(2, '0');
		onChange(`${hours.toString().padStart(2, '0')}:${formattedMinutes}`);
	};

	return (
		<div className={`flex items-center space-x-1 ${className}`}>
			<select
				value={hours}
				onChange={(e) => handleHoursChange(Number(e.target.value))}
				className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#ff5b5b] focus:border-[#ff5b5b]"
			>
				{Array.from({ length: 24 }, (_, i) => (
					<option key={i} value={i}>
						{i.toString().padStart(2, '0')}
					</option>
				))}
			</select>
			<span className="text-gray-500">:</span>
			<select
				value={minutes}
				onChange={(e) => handleMinutesChange(Number(e.target.value))}
				className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#ff5b5b] focus:border-[#ff5b5b]"
			>
				{Array.from({ length: 60 }, (_, i) => (
					<option key={i} value={i}>
						{i.toString().padStart(2, '0')}
					</option>
				))}
			</select>
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

const days = [
	{ key: 'monday', label: 'Monday' },
	{ key: 'tuesday', label: 'Tuesday' },
	{ key: 'wednesday', label: 'Wednesday' },
	{ key: 'thursday', label: 'Thursday' },
	{ key: 'friday', label: 'Friday' },
	{ key: 'saturday', label: 'Saturday' },
	{ key: 'sunday', label: 'Sunday' },
];

export default function WorkingHoursSection({
	workingHours,
	onChange,
	className = '',
}: WorkingHoursSectionProps) {
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

	const setAllOpen = () => {
		const newWorkingHours = { ...workingHours };
		Object.keys(newWorkingHours).forEach((day) => {
			newWorkingHours[day as keyof WorkingHours] = {
				open: '09:00',
				close: '18:00',
				closed: false,
			};
		});
		onChange(newWorkingHours);
	};

	const setAllClosed = () => {
		const newWorkingHours = { ...workingHours };
		Object.keys(newWorkingHours).forEach((day) => {
			newWorkingHours[day as keyof WorkingHours] = {
				open: '',
				close: '',
				closed: true,
			};
		});
		onChange(newWorkingHours);
	};

	return (
		<div className={`space-y-4 ${className}`}>
			<div>
				<label className="block text-sm font-medium text-gray-900 mb-4">
					Set Your Working Hours
				</label>
				<div className="space-y-3">
					{days.map((day) => {
						const dayData = workingHours[day.key as keyof WorkingHours];
						return (
							<div
								key={day.key}
								className={`flex items-center justify-between p-4 rounded-lg border transition-all duration-200 ${
									dayData.closed
										? 'bg-gray-50 border-gray-200'
										: 'bg-green-50 border-green-200 hover:bg-green-100'
								}`}
							>
								<div className="flex items-center space-x-3">
									<label className="flex items-center space-x-3 cursor-pointer">
										<input
											type="checkbox"
											checked={!dayData.closed}
											onChange={() => toggleDayClosed(day.key)}
											className="w-4 h-4 rounded border-gray-300 text-[#ff5b5b] focus:ring-[#ff5b5b] focus:ring-2"
										/>
										<span className="text-base font-medium text-gray-800">
											{day.label}
										</span>
									</label>
								</div>

								{!dayData.closed ? (
									<div className="flex items-center space-x-3">
										<div className="flex items-center space-x-2">
											<span className="text-sm text-gray-600">Open:</span>
											<TimePicker24h
												value={dayData.open}
												onChange={(value) =>
													handleTimeChange(day.key, 'open', value)
												}
											/>
										</div>
										<span className="text-gray-400">—</span>
										<div className="flex items-center space-x-2">
											<span className="text-sm text-gray-600">Close:</span>
											<TimePicker24h
												value={dayData.close}
												onChange={(value) =>
													handleTimeChange(day.key, 'close', value)
												}
											/>
										</div>
									</div>
								) : (
									<div className="flex items-center space-x-2 text-gray-500">
										<span className="text-sm">🚫</span>
										<span className="text-sm font-medium">Closed</span>
									</div>
								)}
							</div>
						);
					})}
				</div>
			</div>

			{/* Quick Actions */}
			<div className="pt-4 border-t border-gray-200">
				<div className="flex gap-2">
					<button
						type="button"
						onClick={setAllOpen}
						className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
					>
						Set All Open
					</button>
					<button
						type="button"
						onClick={setAllClosed}
						className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
					>
						Set All Closed
					</button>
				</div>
			</div>
		</div>
	);
}
