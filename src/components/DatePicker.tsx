'use client';

import { useState, useRef, useEffect } from 'react';
import { Calendar } from 'lucide-react';

interface DatePickerProps {
	value: Date | null;
	onChange: (date: Date | null) => void;
	placeholder?: string;
	className?: string;
	disabled?: boolean;
	selectedTimeInterval?: string;
}

export default function DatePicker({
	value,
	onChange,
	placeholder = 'Select date',
	className = '',
	disabled = false,
	selectedTimeInterval,
}: DatePickerProps) {
	const [showCalendar, setShowCalendar] = useState(false);
	const calendarRef = useRef<HTMLDivElement>(null);

	// Close calendar when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				calendarRef.current &&
				!calendarRef.current.contains(event.target as Node)
			) {
				setShowCalendar(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, []);

	const handleDateSelect = (date: Date) => {
		onChange(date);
		setShowCalendar(false);
	};

	const getTimeRangeLabel = (interval: string) => {
		const timeRanges: Record<string, string> = {
			morning: '6:00 - 12:00',
			afternoon: '12:00 - 18:00',
			evening: '18:00 - 24:00',
		};
		return timeRanges[interval] || '';
	};

	const formatDate = (date: Date | null) => {
		if (!date) return placeholder;

		const formattedDate = date.toLocaleDateString('en-US', {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
		});

		if (selectedTimeInterval && selectedTimeInterval !== 'any') {
			const timeRange = getTimeRangeLabel(selectedTimeInterval);
			return `${formattedDate}, ${timeRange}`;
		}

		return formattedDate;
	};

	const generateCalendarDays = () => {
		const today = new Date();
		const currentMonth = today.getMonth();
		const currentYear = today.getFullYear();
		const firstDay = new Date(currentYear, currentMonth, 1);
		const lastDay = new Date(currentYear, currentMonth + 1, 0);
		const daysInMonth = lastDay.getDate();
		// Adjust for Monday start: Sunday (0) becomes 6, Monday (1) becomes 0, etc.
		const startingDayOfWeek = (firstDay.getDay() + 6) % 7;

		const days = [];

		// Add empty cells for days before the first day of the month
		for (let i = 0; i < startingDayOfWeek; i++) {
			days.push(<div key={`empty-${i}`} className="h-10"></div>);
		}

		// Add days of the month
		for (let day = 1; day <= daysInMonth; day++) {
			const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
			const dateObj = new Date(currentYear, currentMonth, day);
			const isToday = day === today.getDate();
			const isSelected =
				value &&
				dateObj.getDate() === value.getDate() &&
				dateObj.getMonth() === value.getMonth() &&
				dateObj.getFullYear() === value.getFullYear();
			const isPast =
				dateObj <
				new Date(today.getFullYear(), today.getMonth(), today.getDate());

			days.push(
				<button
					key={day}
					onClick={() => !isPast && handleDateSelect(dateObj)}
					disabled={isPast || disabled}
					className={`h-10 w-10 rounded-full text-sm font-medium transition-colors ${
						isSelected
							? 'bg-[#ff5b5b] text-white'
							: isToday
								? 'bg-gray-100 text-gray-900'
								: isPast
									? 'text-gray-300 cursor-not-allowed'
									: 'text-gray-700 hover:bg-gray-100'
					}`}
				>
					{day}
				</button>
			);
		}

		return days;
	};

	return (
		<div className={`relative h-full ${className}`}>
			<div className="relative h-full">
				<Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-6 h-6" />
				<button
					type="button"
					onClick={() => !disabled && setShowCalendar(!showCalendar)}
					disabled={disabled}
					className={`w-full h-full pl-12 pr-4 text-sm py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-left text-gray-900 hover:bg-gray-50 ${
						disabled ? 'bg-gray-50 text-gray-900 cursor-not-allowed' : ''
					}`}
				>
					{formatDate(value)}
				</button>
			</div>

			{/* Calendar Modal */}
			{showCalendar && !disabled && (
				<div
					ref={calendarRef}
					className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 min-w-[300px]"
				>
					<div className="text-center mb-4">
						<h3 className="text-lg font-semibold text-gray-900">
							{new Date().toLocaleDateString('en-US', {
								month: 'long',
								year: 'numeric',
							})}
						</h3>
					</div>
					<div className="grid grid-cols-7 gap-1 mb-2">
						{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
							<div
								key={day}
								className="h-10 flex items-center justify-center text-sm font-medium text-gray-500"
							>
								{day}
							</div>
						))}
					</div>
					<div className="grid grid-cols-7 gap-1">{generateCalendarDays()}</div>
				</div>
			)}
		</div>
	);
}
