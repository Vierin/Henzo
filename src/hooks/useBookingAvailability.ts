import { useMemo } from 'react';
import { Service, Staff } from '@/types';
import { parseBookingTimeAsLocal } from '@/utils/date';

interface UseBookingAvailabilityProps {
	selectedService: Service | null;
	selectedDate: string;
	selectedStaff: string;
	existingBookings: any[];
	staffMembers: Staff[];
	bookingsLoadError: boolean;
}

export function useBookingAvailability({
	selectedService,
	selectedDate,
	selectedStaff,
	existingBookings,
	staffMembers,
	bookingsLoadError,
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
	]);

	return {
		isTimeSlotAvailable,
		availabilityCache,
	};
}

