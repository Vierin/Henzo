// Utility functions for salon operations
import { Salon, WorkingHours } from '@/types';

// Type guard to check if working hours are properly formatted
function isValidWorkingHours(workingHours: any): workingHours is WorkingHours {
	if (!workingHours || typeof workingHours !== 'object') return false;

	const days = [
		'monday',
		'tuesday',
		'wednesday',
		'thursday',
		'friday',
		'saturday',
		'sunday',
	];
	return days.every((day) => {
		const dayHours = workingHours[day];
		return (
			dayHours &&
			typeof dayHours.open === 'string' &&
			typeof dayHours.close === 'string' &&
			typeof dayHours.closed === 'boolean'
		);
	});
}

// Normalize working hours to ensure all fields are present
function normalizeWorkingHours(workingHours: any): WorkingHours | null {
	if (!workingHours || typeof workingHours !== 'object') return null;

	const days = [
		'monday',
		'tuesday',
		'wednesday',
		'thursday',
		'friday',
		'saturday',
		'sunday',
	];
	const normalized: any = {};

	for (const day of days) {
		const dayHours = workingHours[day];
		if (dayHours) {
			normalized[day] = {
				open: dayHours.open || '09:00',
				close: dayHours.close || '18:00',
				closed: dayHours.closed !== undefined ? dayHours.closed : false,
			};
		} else {
			normalized[day] = {
				open: '09:00',
				close: '18:00',
				closed: false,
			};
		}
	}

	return normalized as WorkingHours;
}

/**
 * Check if a salon is open on a specific date and time
 */
export function isSalonOpenOnDateTime(
	salon: Salon,
	date: Date,
	timeInterval?: string
): boolean {
	const workingHours = normalizeWorkingHours(salon.workingHours);
	if (!workingHours) {
		return true; // Assume open if no working hours specified
	}

	const dayOfWeek = getDayOfWeek(date);
	const dayHours = workingHours[dayOfWeek as keyof WorkingHours];

	if (!dayHours || dayHours.closed) {
		return false;
	}

	if (!timeInterval || timeInterval === 'any') {
		return true; // If no specific time, just check if salon is open on that day
	}

	// Parse time interval (e.g., "morning", "afternoon", "evening")
	const timeRange = getTimeRangeFromInterval(timeInterval);
	if (!timeRange) {
		return true; // If we can't parse the interval, assume available
	}

	// Check if the salon's working hours overlap with the requested time range
	return isTimeRangeOverlapping(
		dayHours.open,
		dayHours.close,
		timeRange.start,
		timeRange.end
	);
}

/**
 * Get day of week as string key for working hours
 */
function getDayOfWeek(date: Date): string {
	const days = [
		'sunday',
		'monday',
		'tuesday',
		'wednesday',
		'thursday',
		'friday',
		'saturday',
	];
	return days[date.getDay()];
}

/**
 * Convert time interval string to time range
 */
function getTimeRangeFromInterval(
	interval: string
): { start: string; end: string } | null {
	const intervals: { [key: string]: { start: string; end: string } } = {
		morning: { start: '06:00', end: '12:00' },
		afternoon: { start: '12:00', end: '18:00' },
		evening: { start: '18:00', end: '22:00' },
		night: { start: '22:00', end: '06:00' },
	};

	return intervals[interval.toLowerCase()] || null;
}

/**
 * Check if two time ranges overlap
 */
function isTimeRangeOverlapping(
	openTime: string,
	closeTime: string,
	requestStart: string,
	requestEnd: string
): boolean {
	const parseTime = (time: string) => {
		const [hours, minutes] = time.split(':').map(Number);
		return hours * 60 + minutes;
	};

	const openMinutes = parseTime(openTime);
	const closeMinutes = parseTime(closeTime);
	const requestStartMinutes = parseTime(requestStart);
	const requestEndMinutes = parseTime(requestEnd);

	// Handle overnight shifts (e.g., 22:00 - 06:00)
	if (closeMinutes < openMinutes) {
		// Salon works overnight
		return (
			requestStartMinutes >= openMinutes ||
			requestEndMinutes <= closeMinutes ||
			requestStartMinutes <= closeMinutes ||
			requestEndMinutes >= openMinutes
		);
	}

	// Normal working hours
	return requestStartMinutes < closeMinutes && requestEndMinutes > openMinutes;
}

/**
 * Calculate average rating for a salon
 */
export function calculateAverageRating(salon: Salon): number {
	if (!salon.reviews || salon.reviews.length === 0) {
		return 0;
	}

	const totalRating = salon.reviews.reduce(
		(sum, review) => sum + review.rating,
		0
	);
	return Math.round((totalRating / salon.reviews.length) * 10) / 10; // Round to 1 decimal
}

/**
 * Get number of reviews for a salon
 */
export function getReviewCount(salon: Salon): number {
	return salon.reviews?.length || 0;
}

/**
 * Check if a salon has reviews
 */
export function hasReviews(salon: Salon): boolean {
	return (salon.reviews?.length || 0) > 0;
}

/**
 * Get time slots that overlap with salon working hours
 */
export function getAvailableTimeSlots(
	salon: Salon,
	date: Date,
	timeInterval?: string
): string[] {
	if (!isSalonOpenOnDateTime(salon, date, timeInterval)) {
		return [];
	}

	const workingHours = normalizeWorkingHours(salon.workingHours);
	if (!workingHours) {
		// Return default time slots if no working hours specified
		// But filter out past slots if today
		const now = new Date();
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const selectedDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
		const isToday = today.getTime() === selectedDay.getTime();
		
		if (isToday) {
			const currentHour = now.getHours();
			const currentMinute = now.getMinutes();
			const currentTimeInMinutes = currentHour * 60 + currentMinute;
			
			const slots = ['morning', 'afternoon', 'evening'];
			return slots.filter((slot) => {
				const ranges: { [key: string]: { start: string; end: string } } = {
					morning: { start: '06:00', end: '12:00' },
					afternoon: { start: '12:00', end: '18:00' },
					evening: { start: '18:00', end: '22:00' },
				};
				const range = ranges[slot];
				if (!range) return false;
				
				const [endHour, endMinute] = range.end.split(':').map(Number);
				const endTimeInMinutes = endHour * 60 + endMinute;
				
				// Only include slot if it hasn't ended yet (with 15 min buffer)
				return endTimeInMinutes > currentTimeInMinutes + 15;
			});
		}
		
		return ['morning', 'afternoon', 'evening'];
	}

	const dayOfWeek = getDayOfWeek(date);
	const dayHours = workingHours[dayOfWeek as keyof WorkingHours];

	if (!dayHours || dayHours.closed) {
		return [];
	}

	const availableSlots: string[] = [];
	const timeSlots = [
		{ name: 'morning', range: { start: '06:00', end: '12:00' } },
		{ name: 'afternoon', range: { start: '12:00', end: '18:00' } },
		{ name: 'evening', range: { start: '18:00', end: '22:00' } },
	];

	// Check if selected date is today
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const selectedDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
	const isToday = today.getTime() === selectedDay.getTime();
	
	// Get current time in minutes if today
	let currentTimeInMinutes: number | null = null;
	if (isToday) {
		const currentHour = now.getHours();
		const currentMinute = now.getMinutes();
		currentTimeInMinutes = currentHour * 60 + currentMinute;
	}

	timeSlots.forEach((slot) => {
		if (
			isTimeRangeOverlapping(
				dayHours.open,
				dayHours.close,
				slot.range.start,
				slot.range.end
			)
		) {
			// If today, filter out past time slots
			if (isToday && currentTimeInMinutes !== null) {
				const [endHour, endMinute] = slot.range.end.split(':').map(Number);
				const endTimeInMinutes = endHour * 60 + endMinute;
				
				// Only include slot if it hasn't ended yet (with 15 min buffer)
				if (endTimeInMinutes > currentTimeInMinutes + 15) {
					availableSlots.push(slot.name);
				}
			} else {
				availableSlots.push(slot.name);
			}
		}
	});

	return availableSlots;
}
