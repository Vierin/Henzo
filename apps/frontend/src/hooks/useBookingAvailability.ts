import { useMemo } from 'react';
import { Service, Staff } from '@/types';
import { parseBookingTimeAsLocal, getTimeBlockRangeOnDate } from '@/utils/date';

export interface TimeBlockForAvailability {
	startDate: string;
	endDate: string;
	staffId?: string | null;
}

interface UseBookingAvailabilityProps {
	selectedService: Service | null;
	selectedDate: string;
	selectedStaff: string;
	existingBookings: any[];
	staffMembers: Staff[];
	bookingsLoadError: boolean;
	timeBlocks?: TimeBlockForAvailability[];
	salonTimezone?: string;
}

export function useBookingAvailability({
	selectedService,
	selectedDate,
	selectedStaff,
	existingBookings,
	staffMembers,
	bookingsLoadError,
	timeBlocks = [],
	salonTimezone = 'Asia/Ho_Chi_Minh',
}: UseBookingAvailabilityProps) {
	// Memoized availability map to avoid recalculating for the same slots
	const availabilityCache = useMemo(() => {
		const cache = new Map<string, boolean>();

		if (!selectedService || bookingsLoadError) {
			return cache;
		}

		return cache;
	}, [
		selectedService,
		existingBookings,
		staffMembers,
		bookingsLoadError,
		selectedDate,
		selectedStaff,
		timeBlocks,
		salonTimezone,
	]);

	// Check if a time slot is available
	const isTimeSlotAvailable = useMemo(() => {
		return (timeSlot: string, selectedStaffId?: string): boolean => {
			if (!selectedService) return true;

			if (bookingsLoadError) {
				return true;
			}

			const serviceDuration = selectedService.duration;
			const [slotHour, slotMinute] = timeSlot.split(':').map(Number);
			const slotStartMinutes = slotHour * 60 + slotMinute;
			const slotEndMinutes = slotStartMinutes + serviceDuration;

			const cacheKey = `${timeSlot}-${selectedStaffId || 'any'}-${selectedDate}`;

			if (availabilityCache.has(cacheKey)) {
				return availabilityCache.get(cacheKey)!;
			}

			// Time blocks: salon-wide block makes slot unavailable for everyone; staff block only for that staff
			if (selectedDate && timeBlocks.length > 0) {
				for (const block of timeBlocks) {
					const range = getTimeBlockRangeOnDate(
						block.startDate,
						block.endDate,
						selectedDate,
						salonTimezone
					);
					if (!range) continue;
					const overlaps =
						slotStartMinutes < range.endMinutes && slotEndMinutes > range.startMinutes;
					if (!overlaps) continue;

					const isSalonBlock = !block.staffId;
					if (isSalonBlock) {
						availabilityCache.set(cacheKey, false);
						return false;
					}
					if (selectedStaffId && selectedStaffId !== 'Any Staff') {
						if (block.staffId === selectedStaffId) {
							availabilityCache.set(cacheKey, false);
							return false;
						}
					}
				}
			}

			// If specific staff is selected, check only that staff's conflicts
			if (selectedStaffId && selectedStaffId !== 'Any Staff') {
				const hasConflict = existingBookings.some((booking) => {
					const bookingDateTime = parseBookingTimeAsLocal(
						booking.time || booking.dateTime
					);
					if (!bookingDateTime) return false;

					const bookingStartMinutes =
						bookingDateTime.getHours() * 60 + bookingDateTime.getMinutes();
					const bookingEndMinutes =
						bookingStartMinutes + (booking.service?.duration || 60);

					const timeConflict =
						slotStartMinutes < bookingEndMinutes &&
						slotEndMinutes > bookingStartMinutes;

					const staffConflict = booking.staffId === selectedStaffId;
					return staffConflict && timeConflict;
				});

				const result = !hasConflict;
				availabilityCache.set(cacheKey, result);
				return result;
			}

			// If "Any Staff" is selected, check if ALL staff members are busy
			const conflictingBookings = existingBookings.filter((booking) => {
				const bookingDateTime = parseBookingTimeAsLocal(
					booking.time || booking.dateTime
				);
				if (!bookingDateTime) return false;

				const bookingStartMinutes =
					bookingDateTime.getHours() * 60 + bookingDateTime.getMinutes();
				const bookingEndMinutes =
					bookingStartMinutes + (booking.service?.duration || 60);

				const timeConflict =
					slotStartMinutes < bookingEndMinutes &&
					slotEndMinutes > bookingStartMinutes;

				return timeConflict;
			});

			const busyStaffIds = new Set(
				conflictingBookings.map((booking) => booking.staffId).filter(Boolean)
			);

			const allStaffIds = new Set(staffMembers.map((staff) => staff.id));

			const hasFreeStaff = Array.from(allStaffIds).some(
				(staffId) => !busyStaffIds.has(staffId)
			);

			const result = hasFreeStaff;
			availabilityCache.set(cacheKey, result);
			return result;
		};
	}, [
		selectedService,
		existingBookings,
		staffMembers,
		bookingsLoadError,
		selectedDate,
		selectedStaff,
		availabilityCache,
		timeBlocks,
		salonTimezone,
	]);

	return {
		isTimeSlotAvailable,
		availabilityCache,
	};
}

