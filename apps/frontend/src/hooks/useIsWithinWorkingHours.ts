import { useMemo } from 'react';
import { WorkingHours } from '@/types';
import { weekdayFullMap } from '@/utils/dateConstants';

/**
 * Hook to check if current time is within salon's working hours
 * @param workingHours - Salon working hours
 * @param timezone - Salon timezone (optional, defaults to local time)
 * @returns boolean indicating if current time is within working hours
 */
export function useIsWithinWorkingHours(
	workingHours?: WorkingHours | null,
	timezone?: string
): boolean {
	return useMemo(() => {
		if (!workingHours) {
			return true; // Assume open if no working hours specified
		}

		const now = new Date();
		const dayOfWeek = now.getDay();
		const dayName = weekdayFullMap[dayOfWeek];
		const dayHours = workingHours[dayName];

		if (!dayHours || dayHours.closed) {
			return false; // Salon is closed on this day
		}

		const currentHour = now.getHours();
		const currentMinute = now.getMinutes();
		const currentTimeInMinutes = currentHour * 60 + currentMinute;

		const [openHour, openMinute] = (dayHours.open || '09:00')
			.split(':')
			.map(Number);
		const [closeHour, closeMinute] = (dayHours.close || '18:00')
			.split(':')
			.map(Number);

		const openTimeInMinutes = openHour * 60 + openMinute;
		const closeTimeInMinutes = closeHour * 60 + closeMinute;

		// Handle overnight shifts (e.g., 22:00 - 06:00)
		if (closeTimeInMinutes < openTimeInMinutes) {
			return (
				currentTimeInMinutes >= openTimeInMinutes ||
				currentTimeInMinutes <= closeTimeInMinutes
			);
		}

		// Normal working hours
		return (
			currentTimeInMinutes >= openTimeInMinutes &&
			currentTimeInMinutes < closeTimeInMinutes
		);
	}, [workingHours, timezone]);
}

