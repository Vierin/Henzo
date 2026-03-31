'use client';

import { Booking, WorkingHours, TimeBlock } from '@/types';
import { safeParseDate, parseBookingTimeAsLocal } from '@/utils/date';
import { useTranslation } from '@/contexts/LanguageContext';

interface CalendarViewProps {
	currentMonth: number;
	currentYear: number;
	bookings: Booking[];
	timeBlocks?: TimeBlock[];
	workingHours?: WorkingHours;
	onPreviousMonth: () => void;
	onNextMonth: () => void;
	onDateClick: (day: number) => void;
}

export default function CalendarView({
	currentMonth,
	currentYear,
	bookings,
	timeBlocks = [],
	workingHours,
	onPreviousMonth,
	onNextMonth,
	onDateClick,
}: CalendarViewProps) {
	const t = useTranslation();

	const monthNames = [
		'january',
		'february',
		'march',
		'april',
		'may',
		'june',
		'july',
		'august',
		'september',
		'october',
		'november',
		'december',
	];

	// Weekday short keys matching JavaScript Date.getDay() order (0=Sunday, 1=Monday, etc.)
	// Maps to weekdays.json short keys: sun, mon, tue, wed, thu, fri, sat
	const weekdayShortKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

	const getMonthName = (month: number, year: number) => {
		const monthKey = monthNames[month];
		const monthName = t(`months.${monthKey}`);
		return `${monthName} ${year}`;
	};

	const hasAppointmentsOnDate = (date: Date) => {
		return bookings.some((booking) => {
			const bookingDate = parseBookingTimeAsLocal(booking.time);
			if (!bookingDate) return false;
			return bookingDate.toDateString() === date.toDateString();
		});
	};

	const hasTimeBlockOnDate = (date: Date) => {
		return timeBlocks.some((block) => {
			const blockStart = new Date(block.startDate);
			const blockEnd = new Date(block.endDate);

			// Reset time to compare just dates
			const dateOnly = new Date(
				date.getFullYear(),
				date.getMonth(),
				date.getDate()
			);
			const blockStartDate = new Date(
				blockStart.getFullYear(),
				blockStart.getMonth(),
				blockStart.getDate()
			);
			const blockEndDate = new Date(
				blockEnd.getFullYear(),
				blockEnd.getMonth(),
				blockEnd.getDate()
			);

			return dateOnly >= blockStartDate && dateOnly <= blockEndDate;
		});
	};

	const isDayOff = (date: Date) => {
		if (!workingHours) return false;

		const dayOfWeek = date.getDay();
		const dayNames: (keyof WorkingHours)[] = [
			'sunday', // 0
			'monday', // 1
			'tuesday', // 2
			'wednesday', // 3
			'thursday', // 4
			'friday', // 5
			'saturday', // 6
		];
		const dayName = dayNames[dayOfWeek];

		return workingHours[dayName]?.closed === true;
	};

	return (
		<div
			className="mt-6 w-full"
			role="region"
			aria-labelledby="calendar-heading"
		>
			<h2 id="calendar-heading" className="sr-only">
				Calendar View
			</h2>

			<div className="rounded-xl max-w-4xl mx-auto border border-[#f1d9d7] bg-white p-6">
				{/* Calendar Header */}
				<div className="flex items-center justify-between mb-6">
					<h3 className="text-lg font-semibold text-gray-900">
						{getMonthName(currentMonth, currentYear)}
					</h3>
					<div
						className="flex items-center gap-2"
						role="group"
						aria-label="Month navigation"
					>
						<button
							onClick={onPreviousMonth}
							className="p-1 hover:bg-gray-100 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-[#ea4b4b] focus:ring-offset-2"
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
						<button
							onClick={onNextMonth}
							className="p-1 hover:bg-gray-100 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-[#ea4b4b] focus:ring-offset-2"
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
				</div>

				{/* Calendar Grid */}
				<div className="grid grid-cols-7 gap-1 mb-2" role="rowgroup">
					{weekdayShortKeys.map((dayKey, index) => (
						<div
							key={dayKey}
							className="p-2 text-center text-sm font-medium text-gray-500"
							role="columnheader"
						>
							{t(`weekdays.short.${dayKey}`)}
						</div>
					))}
				</div>

				<div className="grid grid-cols-7 gap-1" role="grid">
					{(() => {
						const today = new Date();

						// Get first day of selected month and number of days
						const firstDay = new Date(currentYear, currentMonth, 1);
						const lastDay = new Date(currentYear, currentMonth + 1, 0);
						const daysInMonth = lastDay.getDate();
						const startDay = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.

						// Generate calendar grid (6 weeks = 42 days)
						const calendarDays = [];

						// Previous month days (empty cells)
						for (let i = 0; i < startDay; i++) {
							calendarDays.push(null);
						}

						// Current month days
						for (let day = 1; day <= daysInMonth; day++) {
							calendarDays.push(day);
						}

						// Fill remaining cells to complete 6 weeks
						while (calendarDays.length < 42) {
							calendarDays.push(null);
						}

						return calendarDays.map((day, i) => {
							if (day === null) {
								return <div key={i} className="p-2" role="gridcell"></div>;
							}

							const currentDate = new Date(currentYear, currentMonth, day);
							const isToday =
								day === today.getDate() &&
								currentMonth === today.getMonth() &&
								currentYear === today.getFullYear();
							const isPast =
								currentDate <
								new Date(
									today.getFullYear(),
									today.getMonth(),
									today.getDate()
								);
							const isFuture =
								currentDate >
								new Date(
									today.getFullYear(),
									today.getMonth(),
									today.getDate()
								);
							const hasAppointment = hasAppointmentsOnDate(currentDate);
							const hasTimeBlock = hasTimeBlockOnDate(currentDate);
							const isDayOffToday = isDayOff(currentDate);
							const isDisabled = isPast || isDayOffToday;

							return (
								<button
									key={i}
									disabled={isDisabled}
									onClick={() => onDateClick(day)}
									className={`p-2 text-center text-sm relative rounded transition-colors ${
										isToday
											? 'bg-white text-gray-900 border-2 border-[#ea4b4b] font-semibold'
											: isPast
												? 'text-gray-400 cursor-not-allowed'
												: isDayOffToday
													? 'text-gray-400 cursor-not-allowed bg-gray-50'
													: isFuture
														? 'text-gray-900 hover:bg-gray-100 cursor-pointer'
														: 'text-gray-700 hover:bg-gray-100 cursor-pointer'
									} focus:outline-none focus:ring-2 focus:ring-[#ea4b4b] focus:ring-offset-2`}
									role="gridcell"
									aria-label={`${day} ${getMonthName(currentMonth, currentYear)} ${
										isDayOffToday
											? 'closed day'
											: hasTimeBlock
												? 'has blocked time'
												: hasAppointment
													? 'has appointments'
													: 'no appointments'
									}`}
									aria-current={isToday ? 'date' : undefined}
								>
									{day}
									<div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 flex gap-0.5">
										{hasAppointment && !isToday && !isDayOffToday && (
											<div
												className="w-1 h-1 bg-[#ea4b4b] rounded-full"
												aria-hidden="true"
												title="Has appointments"
											></div>
										)}
										{hasTimeBlock && !isToday && !isDayOffToday && (
											<div
												className="w-1 h-1 bg-gray-600 rounded-full"
												aria-hidden="true"
												title="Has blocked time"
											></div>
										)}
									</div>
								</button>
							);
						});
					})()}
				</div>
			</div>
		</div>
	);
}
