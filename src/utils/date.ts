/**
 * Safely parse a date string and return a Date object or null if invalid
 */
export function safeParseDate(
	dateString: string | null | undefined
): Date | null {
	if (!dateString) return null;

	try {
		const date = new Date(dateString);
		return isNaN(date.getTime()) ? null : date;
	} catch (error) {
		console.error('Error parsing date:', error, dateString);
		return null;
	}
}

/**
 * Format a date string for display, with fallback for invalid dates
 */
export function formatDateSafe(
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
	});
}

/**
 * Format a date string in short format (DD.MM.YYYY), with fallback for invalid dates
 */
export function formatDateShort(
	dateString: string | null | undefined,
	fallback: string = 'Date not available'
): string {
	const date = safeParseDate(dateString);
	if (!date) return fallback;

	return date.toLocaleDateString('ru-RU', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
	});
}

/**
 * Format a time string for display, with fallback for invalid dates
 */
export function formatTimeSafe(
	dateString: string | null | undefined,
	fallback: string = 'Time not available'
): string {
	const date = safeParseDate(dateString);
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
 * Parse a UTC date string and extract time components without timezone conversion
 * This ensures that 10:00 UTC is treated as 10:00 local time
 */
export function parseBookingTimeAsLocal(
	dateString: string | null | undefined
): Date | null {
	if (!dateString) return null;

	try {
		// If it's a UTC string like "2024-01-15T10:00:00.000Z"
		if (dateString.includes('Z')) {
			// Extract the date and time parts
			const [datePart, timePart] = dateString.split('T');
			const [year, month, day] = datePart.split('-').map(Number);
			const [time, ms] = timePart.split('.');
			const [hours, minutes, seconds] = time.split(':').map(Number);

			// Create a local date with the same time components
			const localDate = new Date(
				year,
				month - 1,
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
