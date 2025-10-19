'use client';

import { useState, useRef, useEffect } from 'react';
import { Calendar, Clock } from 'lucide-react';
import { TIME_INTERVALS } from '@/constants/timeIntervals';

interface DateTimePickerProps {
	date: Date | null;
	timeInterval: string;
	onDateChange: (date: Date | null) => void;
	onTimeChange: (timeInterval: string) => void;
	placeholder?: string;
	className?: string;
	disabled?: boolean;
	inline?: boolean;
}

export default function DateTimePicker({
	date,
	timeInterval,
	onDateChange,
	onTimeChange,
	placeholder = 'Select date and time',
	className = '',
	disabled = false,
	inline = false,
}: DateTimePickerProps) {
	const [showCalendar, setShowCalendar] = useState(false);
	const [showTimeIntervals, setShowTimeIntervals] = useState(false);
	const calendarRef = useRef<HTMLDivElement>(null);
	const timeIntervalsRef = useRef<HTMLDivElement>(null);
	const buttonRef = useRef<HTMLButtonElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	// Close modals when clicking outside the entire component
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as Node;

			// Check if click is inside our entire component container
			const isInsideComponent = containerRef.current?.contains(target);

			// Close both modals if clicking outside the entire component
			if (!isInsideComponent && (showCalendar || showTimeIntervals)) {
				setShowCalendar(false);
				setShowTimeIntervals(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [showCalendar, showTimeIntervals]);

	// Close modal when pressing Escape key
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape' && (showCalendar || showTimeIntervals)) {
				setShowCalendar(false);
				setShowTimeIntervals(false);
			}
		};

		document.addEventListener('keydown', handleKeyDown);
		return () => {
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [showCalendar, showTimeIntervals]);

	const handleDateSelect = (selectedDate: Date) => {
		console.log('📅 DateTimePicker - selected date:', selectedDate);
		console.log(
			'📅 DateTimePicker - selected date.getDate():',
			selectedDate.getDate()
		);
		console.log(
			'📅 DateTimePicker - selected date.getMonth():',
			selectedDate.getMonth()
		);
		console.log(
			'📅 DateTimePicker - selected date.getFullYear():',
			selectedDate.getFullYear()
		);
		onDateChange(selectedDate);
		setShowCalendar(false);
		setShowTimeIntervals(true);
	};

	const handleTimeIntervalSelect = (interval: string) => {
		onTimeChange(interval);
		setShowTimeIntervals(false);
	};

	const formatDate = (date: Date | null) => {
		if (!date) return placeholder;
		return date.toLocaleDateString('en-US', {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
		});
	};

	const getTimeIntervalLabel = (interval: string) => {
		if (!interval) return '';
		const timeInterval = TIME_INTERVALS.find((ti) => ti.value === interval);
		return timeInterval ? timeInterval.label : '';
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
				date &&
				dateObj.getDate() === date.getDate() &&
				dateObj.getMonth() === date.getMonth() &&
				dateObj.getFullYear() === date.getFullYear();
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

	const displayText = () => {
		if (!date) return placeholder;
		const dateStr = formatDate(date);
		const timeStr = getTimeIntervalLabel(timeInterval);
		return timeStr ? `${dateStr} • ${timeStr}` : dateStr;
	};

	return (
		<div ref={containerRef} className={`relative ${className}`}>
			<div className="relative h-full">
				<Calendar
					className={
						inline
							? 'absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5'
							: 'absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-6 h-6'
					}
				/>
				<button
					ref={buttonRef}
					type="button"
					onClick={() => {
						if (!disabled) {
							setShowTimeIntervals(false); // Close time intervals when opening calendar
							setShowCalendar(!showCalendar);
						}
					}}
					disabled={disabled}
					className={
						inline
							? `w-full h-full pl-10 pr-3 py-2 text-sm truncate border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-left text-gray-900 hover:bg-gray-50 placeholder:text-gray-500 ${
									disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''
								}`
							: `w-full h-full pl-12 pr-4 py-3 text-sm truncate border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-left text-gray-900 hover:bg-gray-50 ${
									disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''
								}`
					}
				>
					{displayText()}
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

			{/* Time Intervals Modal */}
			{showTimeIntervals && !disabled && (
				<div
					ref={timeIntervalsRef}
					className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 min-w-[250px]"
				>
					<div className="text-center mb-3">
						<h3 className="text-lg font-semibold text-gray-900">Time</h3>
					</div>
					<div className="space-y-2">
						{TIME_INTERVALS.map((interval) => (
							<button
								key={interval.value}
								onClick={() => handleTimeIntervalSelect(interval.value)}
								className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
									timeInterval === interval.value
										? 'bg-[#ff5b5b] text-white'
										: 'hover:bg-gray-100 text-gray-700'
								}`}
							>
								<div className="flex items-center">
									<Clock className="w-4 h-4 mr-2" />
									{interval.label}
								</div>
							</button>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
