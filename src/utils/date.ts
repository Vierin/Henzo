import { toZonedTime } from 'date-fns-tz';

/**
 * Safely parse a date string and return a Date object or null if invalid
 */
export function safeParseDate(
	input: string | Date | number | null | undefined
): Date | null {
	if (input == null) return null;

	try {
		if (input instanceof Date) {
			return isNaN(input.getTime()) ? null : input;
		}
		if (typeof input === 'number') {
			const d = new Date(input);
			return isNaN(d.getTime()) ? null : d;
		}
		if (typeof input !== 'string') return null;

		const dateString = input;
		// If it's in YYYY-MM-DD format, parse as local date to avoid timezone issues
		if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
			const [year, month, day] = dateString.split('-').map(Number);
			const date = new Date(year, month - 1, day);
			return isNaN(date.getTime()) ? null : date;
		}

		// Fallback to regular parsing for other formats
		const date = new Date(dateString);
		return isNaN(date.getTime()) ? null : date;
	} catch (error) {
		console.error('Error parsing date:', error, input);
		return null;
	}
}

export type FormatDateSafeOptions = {
	/** When false, omits weekday (e.g. review cards). @default true */
	includeWeekday?: boolean;
};

/**
 * Format a date string for display, with fallback for invalid dates
 * @param dateString - Date string to format
 * @param fallback - Fallback text if date is invalid
 * @param locale - Locale for date formatting (e.g., 'en', 'ru', 'vi'). Defaults to 'en'
 */
export function formatDateSafe(
	dateString: string | null | undefined,
	fallback: string = 'Date not available',
	locale: string = 'en',
	options?: FormatDateSafeOptions
): string {
	const date = safeParseDate(dateString);
	if (!date) return fallback;

	// Map locale codes to Intl locale strings
	const localeMap: Record<string, string> = {
		en: 'en-US',
		ru: 'ru-RU',
		vi: 'vi-VN',
	};

	const intlLocale = localeMap[locale] || locale;

	const includeWeekday = options?.includeWeekday !== false;
	const intlOptions: Intl.DateTimeFormatOptions = {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	};
	if (includeWeekday) {
		intlOptions.weekday = 'long';
	}

	return date.toLocaleDateString(intlLocale, intlOptions);
}

/**
 * Format a date string in short format (DD.MM.YYYY), with fallback for invalid dates
 * @param salonTimezone - IANA timezone identifier (e.g., "Asia/Ho_Chi_Minh")
 */
export function formatDateShort(
	dateString: string | null | undefined,
	fallback: string = 'Date not available',
	salonTimezone?: string
): string {
	// Use parseBookingTimeAsLocal to treat UTC times as local times in salon's timezone
	const date =
		parseBookingTimeAsLocal(dateString, salonTimezone) ||
		safeParseDate(dateString);
	if (!date) return fallback;

	return date.toLocaleDateString('ru-RU', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
	});
}

/**
 * Format a time string for display, with fallback for invalid dates
 * Uses parseBookingTimeAsLocal to avoid timezone conversion issues
 * @param salonTimezone - IANA timezone identifier (e.g., "Asia/Ho_Chi_Minh")
 */
export function formatTimeSafe(
	dateString: string | null | undefined,
	fallback: string = 'Time not available',
	salonTimezone?: string
): string {
	// Use parseBookingTimeAsLocal to treat UTC times as local times in salon's timezone
	const date =
		parseBookingTimeAsLocal(dateString, salonTimezone) ||
		safeParseDate(dateString);
	if (!date) return fallback;

	return date.toLocaleTimeString('en-US', {
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
	});
}

/**
 * Format a date and time string for display, with fallback for invalid dates
 */
export function formatDateTimeSafe(
	dateString: string | null | undefined,
	fallback: string = 'Date not available'
): string {
	const date = safeParseDate(dateString);
	if (!date) return fallback;

	return date.toLocaleDateString('en-US', {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
	});
}

/**
 * Format date and time separately for booking cards
 * Uses parseBookingTimeAsLocal to avoid timezone conversion issues
 */
export function formatBookingDateTime(dateString: string | null | undefined): {
	date: string;
	time: string;
} {
	// Use parseBookingTimeAsLocal to treat UTC times as local times
	const date = parseBookingTimeAsLocal(dateString) || safeParseDate(dateString);
	if (!date) {
		return {
			date: 'Date not available',
			time: 'Time not available',
		};
	}

	const formattedDate = date.toLocaleDateString('en-US', {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});

	const formattedTime = date.toLocaleTimeString('en-US', {
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
	});

	return {
		date: formattedDate,
		time: formattedTime,
	};
}

/**
 * Check if a date string represents a past date
 */
export function isPastDate(dateString: string | null | undefined): boolean {
	const date = safeParseDate(dateString);
	if (!date) return false;

	return date < new Date();
}

/**
 * Check if a date string represents today
 */
export function isToday(dateString: string | null | undefined): boolean {
	const date = safeParseDate(dateString);
	if (!date) return false;

	const today = new Date();
	return date.toDateString() === today.toDateString();
}

/**
 * Get a relative date badge (Tomorrow, In 3 days, etc.)
 */
export function getDateBadge(
	dateString: string | null | undefined
): string | null {
	const date = safeParseDate(dateString);
	if (!date) return null;

	const today = new Date();
	const tomorrow = new Date(today);
	tomorrow.setDate(today.getDate() + 1);

	const dayAfterTomorrow = new Date(today);
	dayAfterTomorrow.setDate(today.getDate() + 2);

	const in3Days = new Date(today);
	in3Days.setDate(today.getDate() + 3);

	// Reset time to compare only dates
	const targetDate = new Date(date);
	targetDate.setHours(0, 0, 0, 0);
	const todayDate = new Date(today);
	todayDate.setHours(0, 0, 0, 0);
	const tomorrowDate = new Date(tomorrow);
	tomorrowDate.setHours(0, 0, 0, 0);
	const dayAfterTomorrowDate = new Date(dayAfterTomorrow);
	dayAfterTomorrowDate.setHours(0, 0, 0, 0);
	const in3DaysDate = new Date(in3Days);
	in3DaysDate.setHours(0, 0, 0, 0);

	if (targetDate.getTime() === todayDate.getTime()) {
		return 'Today';
	} else if (targetDate.getTime() === tomorrowDate.getTime()) {
		return 'Tomorrow';
	} else if (targetDate.getTime() === dayAfterTomorrowDate.getTime()) {
		return 'In 2 days';
	} else if (targetDate.getTime() === in3DaysDate.getTime()) {
		return 'In 3 days';
	}

	return null;
}

/**
 * Get the date part of a date string (YYYY-MM-DD format)
 */
export function getDatePart(dateString: string | null | undefined): string {
	const date = safeParseDate(dateString);
	if (!date) return '';

	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');

	return `${year}-${month}-${day}`;
}

/**
 * Parse a UTC date string and convert it to salon's local timezone
 * This ensures that bookings are displayed in the salon's timezone regardless of browser timezone
 */
export function parseBookingTimeAsLocal(
	dateString: string | null | undefined,
	salonTimezone: string = 'Asia/Ho_Chi_Minh'
): Date | null {
	if (!dateString) return null;

	try {
		// IMPORTANT: All bookings are stored in UTC but represent salon's local time
		// When displaying, we need to convert from UTC to salon's timezone
		// Example: 13:15 UTC in Asia/Ho_Chi_Minh = 20:15 local time

		// If it's a UTC string like "2024-01-15T13:00:00.000Z"
		if (dateString.includes('Z')) {
			// Parse the UTC date
			const utcDate = new Date(dateString);
			if (isNaN(utcDate.getTime())) return null;

			// Use date-fns-tz to convert from UTC to salon's timezone
			// toZonedTime converts a UTC date to the equivalent date in the specified timezone
			// The returned date will have the correct local time components for that timezone
			const zonedDate = toZonedTime(utcDate, salonTimezone);

			// Extract components from zoned date (these are in salon's timezone)
			const year = zonedDate.getFullYear();
			const month = zonedDate.getMonth();
			const day = zonedDate.getDate();
			const hours = zonedDate.getHours();
			const minutes = zonedDate.getMinutes();
			const seconds = zonedDate.getSeconds();

			// Create a Date object that represents this time as if it were local time
			// We create it using the local timezone constructor, which will make getHours() return the correct value
			// This date will be displayed correctly by toLocaleTimeString
			const localDate = new Date(
				year,
				month,
				day,
				hours,
				minutes,
				seconds || 0,
				0
			);

			return isNaN(localDate.getTime()) ? null : localDate;
		}

		// Fallback to regular parsing
		const date = new Date(dateString);
		return isNaN(date.getTime()) ? null : date;
	} catch (error) {
		console.error('Error parsing booking time as local:', error, dateString);
		return null;
	}
}

/**
 * Get a time block's range on a specific date in minutes from midnight (salon timezone).
 * Returns null if the block does not overlap the date.
 */
export function getTimeBlockRangeOnDate(
	startDate: string,
	endDate: string,
	selectedDateStr: string,
	salonTimezone: string = 'Asia/Ho_Chi_Minh'
): { startMinutes: number; endMinutes: number } | null {
	try {
		const blockStart = new Date(startDate);
		const blockEnd = new Date(endDate);
		if (isNaN(blockStart.getTime()) || isNaN(blockEnd.getTime())) return null;

		const zonedStart = toZonedTime(blockStart, salonTimezone);
		const zonedEnd = toZonedTime(blockEnd, salonTimezone);

		const selectedYear = parseInt(selectedDateStr.slice(0, 4), 10);
		const selectedMonth = parseInt(selectedDateStr.slice(5, 7), 10) - 1;
		const selectedDay = parseInt(selectedDateStr.slice(8, 10), 10);

		const startDateMatch =
			zonedStart.getFullYear() === selectedYear &&
			zonedStart.getMonth() === selectedMonth &&
			zonedStart.getDate() === selectedDay;
		const endDateMatch =
			zonedEnd.getFullYear() === selectedYear &&
			zonedEnd.getMonth() === selectedMonth &&
			zonedEnd.getDate() === selectedDay;

		const startMinutes = startDateMatch
			? zonedStart.getHours() * 60 + zonedStart.getMinutes()
			: 0;
		const endMinutes = endDateMatch
			? zonedEnd.getHours() * 60 + zonedEnd.getMinutes()
			: 24 * 60;

		// Block doesn't touch this date if selected date is before block start or after block end
		const selectedDateOnly = new Date(selectedYear, selectedMonth, selectedDay);
		const blockStartDateOnly = new Date(
			zonedStart.getFullYear(),
			zonedStart.getMonth(),
			zonedStart.getDate()
		);
		const blockEndDateOnly = new Date(
			zonedEnd.getFullYear(),
			zonedEnd.getMonth(),
			zonedEnd.getDate()
		);
		if (
			selectedDateOnly < blockStartDateOnly ||
			selectedDateOnly > blockEndDateOnly
		) {
			return null;
		}

		return { startMinutes, endMinutes };
	} catch (error) {
		console.error('Error getting time block range:', error);
		return null;
	}
}
