'use client';

import { useState, useRef, useEffect } from 'react';
import { Calendar, Clock } from 'lucide-react';
import { TIME_INTERVALS } from '@/constants/timeIntervals';
import { useLanguage, useTranslation } from '@/contexts/LanguageContext';

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
	placeholder,
	className = '',
	disabled = false,
	inline = false,
}: DateTimePickerProps) {
	const { language } = useLanguage();
	const t = useTranslation();
	const locale =
		language === 'ru' ? 'ru-RU' : language === 'vi' ? 'vi-VN' : 'en-US';
	const effectivePlaceholder =
		placeholder ||
		`${t('homepage.datePlaceholder')} • ${t('homepage.timePlaceholder')}`;
	const [showCalendar, setShowCalendar] = useState(false);
	const [showTimeIntervals, setShowTimeIntervals] = useState(false);
	const [displayMonth, setDisplayMonth] = useState(new Date().getMonth());
	const [displayYear, setDisplayYear] = useState(new Date().getFullYear());
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

	const handleAnyNearestTime = () => {
		const today = new Date();
		onDateChange(today);
		onTimeChange('any');
		setShowCalendar(false);
		setShowTimeIntervals(false);
	};

	const formatDate = (date: Date | null) => {
		if (!date) return effectivePlaceholder;
		return date.toLocaleDateString(locale, {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
		});
	};

	const getTimeIntervalLabel = (interval: string) => {
		if (!interval) return '';
		switch (interval) {
			case 'any':
				return t('booking.timeIntervals.any');
			case 'morning':
				return t('booking.timeIntervals.morning');
			case 'afternoon':
				return t('booking.timeIntervals.afternoon');
			case 'evening':
				return t('booking.timeIntervals.evening');
			default: {
				const timeInterval = TIME_INTERVALS.find((ti) => ti.value === interval);
				return timeInterval ? timeInterval.label : '';
			}
		}
	};

	const goToPreviousMonth = () => {
		if (displayMonth === 0) {
			setDisplayMonth(11);
			setDisplayYear(displayYear - 1);
		} else {
			setDisplayMonth(displayMonth - 1);
		}
	};

	const goToNextMonth = () => {
		if (displayMonth === 11) {
			setDisplayMonth(0);
			setDisplayYear(displayYear + 1);
		} else {
			setDisplayMonth(displayMonth + 1);
		}
	};

	const generateCalendarDays = () => {
		const today = new Date();
		const firstDay = new Date(displayYear, displayMonth, 1);
		const lastDay = new Date(displayYear, displayMonth + 1, 0);
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
			const dateObj = new Date(displayYear, displayMonth, day);
			const isToday = 
				day === today.getDate() &&
				displayMonth === today.getMonth() &&
				displayYear === today.getFullYear();
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

	// Check if a time interval is disabled (past time for today)
	const isTimeIntervalDisabled = (intervalValue: string): boolean => {
		if (!date || intervalValue === 'any') return false;

		// Check if selected date is today
		const today = new Date();
		const isToday =
			date.getDate() === today.getDate() &&
			date.getMonth() === today.getMonth() &&
			date.getFullYear() === today.getFullYear();

		if (!isToday) return false;

		// Get current time
		const currentHour = today.getHours();
		const currentMinute = today.getMinutes();
		const currentTimeInMinutes = currentHour * 60 + currentMinute;

		// Check if interval has passed
		switch (intervalValue) {
			case 'morning':
				// Morning: 6:00 - 12:00, disable if current time >= 12:00
				return currentTimeInMinutes >= 12 * 60; // 12:00 = 720 minutes
			case 'afternoon':
				// Afternoon: 12:00 - 18:00, disable if current time >= 18:00
				return currentTimeInMinutes >= 18 * 60; // 18:00 = 1080 minutes
			case 'evening':
				// Evening: 18:00 - 24:00, always available (never disable)
				return false;
			default:
				return false;
		}
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
							// Reset to current month when opening calendar
							if (!showCalendar) {
								const today = new Date();
								setDisplayMonth(today.getMonth());
								setDisplayYear(today.getFullYear());
							}
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
					{/* Any Nearest Time Button */}
					<button
						onClick={handleAnyNearestTime}
						className="w-full mb-3 px-3 py-2 text-sm font-medium text-[#ff5b5b] bg-[#ff5b5b]/10 hover:bg-[#ff5b5b]/20 rounded-lg transition-colors border border-[#ff5b5b]/20"
					>
						{t('homepage.anyNearestTime')}
					</button>
					<div className="flex items-center justify-between mb-4">
						<button
							onClick={goToPreviousMonth}
							className="p-1 hover:bg-gray-100 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:ring-offset-2"
							aria-label="Previous month"
						>
							<svg
								className="w-5 h-5 text-gray-800"
								fill="currentColor"
								viewBox="0 0 20 20"
								aria-hidden="true"
							>
								<path
									fillRule="evenodd"
									d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
									clipRule="evenodd"
								/>
							</svg>
						</button>
						<h3 className="text-lg font-semibold text-gray-900">
							{new Date(displayYear, displayMonth).toLocaleDateString(locale, {
								month: 'long',
								year: 'numeric',
							})}
						</h3>
						<button
							onClick={goToNextMonth}
							className="p-1 hover:bg-gray-100 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:ring-offset-2"
							aria-label="Next month"
						>
							<svg
								className="w-5 h-5 text-gray-800"
								fill="currentColor"
								viewBox="0 0 20 20"
								aria-hidden="true"
							>
								<path
									fillRule="evenodd"
									d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
									clipRule="evenodd"
								/>
							</svg>
						</button>
					</div>
					<div className="grid grid-cols-7 gap-1 mb-2">
						{[
							t('weekdays.short.mon'),
							t('weekdays.short.tue'),
							t('weekdays.short.wed'),
							t('weekdays.short.thu'),
							t('weekdays.short.fri'),
							t('weekdays.short.sat'),
							t('weekdays.short.sun'),
						].map((day) => (
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
						<h3 className="text-lg font-semibold text-gray-900">
							{t('booking.selectTime')}
						</h3>
					</div>
					<div className="space-y-2">
						{TIME_INTERVALS.map((interval) => {
							const isDisabled = isTimeIntervalDisabled(interval.value);
							return (
								<button
									key={interval.value}
									onClick={() => !isDisabled && handleTimeIntervalSelect(interval.value)}
									disabled={isDisabled}
									className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
										isDisabled
											? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-400'
											: timeInterval === interval.value
												? 'bg-[#ff5b5b] text-white'
												: 'hover:bg-gray-100 text-gray-700'
									}`}
								>
									<div className="flex items-center">
										<Clock className="w-4 h-4 mr-2" />
										{getTimeIntervalLabel(interval.value)}
									</div>
								</button>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
}
