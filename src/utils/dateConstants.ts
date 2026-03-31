import { WorkingHours } from '@/types';

/**
 * Map of day index (0-6, where 0 = Sunday) to WorkingHours key
 */
export const weekdayFullMap: { [key: number]: keyof WorkingHours } = {
	0: 'sunday',
	1: 'monday',
	2: 'tuesday',
	3: 'wednesday',
	4: 'thursday',
	5: 'friday',
	6: 'saturday',
};

/**
 * Array of weekday short keys for translations (matches weekdays.json short keys)
 * Index corresponds to date.getDay() (0 = Sunday, 1 = Monday, etc.)
 */
export const weekdayShortKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/**
 * Array of full weekday names in order (Sunday to Saturday)
 * Index corresponds to date.getDay() (0 = Sunday, 1 = Monday, etc.)
 */
export const weekdayNames = [
	'sunday',
	'monday',
	'tuesday',
	'wednesday',
	'thursday',
	'friday',
	'saturday',
];

/**
 * Array of weekday names in display order (Monday to Sunday)
 * Used for displaying working hours in a more natural order
 */
export const weekdaysOrder: (keyof WorkingHours)[] = [
	'monday',
	'tuesday',
	'wednesday',
	'thursday',
	'friday',
	'saturday',
	'sunday',
];

/**
 * Map of month index (0-11) to month key for translations
 */
export const monthMap: { [key: number]: string } = {
	0: 'january',
	1: 'february',
	2: 'march',
	3: 'april',
	4: 'may',
	5: 'june',
	6: 'july',
	7: 'august',
	8: 'september',
	9: 'october',
	10: 'november',
	11: 'december',
};

/**
 * Array of month names in order (January to December)
 * Index corresponds to date.getMonth() (0 = January, 11 = December)
 */
export const monthNames = [
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

