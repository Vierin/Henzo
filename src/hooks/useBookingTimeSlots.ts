import { useMemo } from 'react';
import { Service, WorkingHours, Staff } from '@/types';
import { parseBookingTimeAsLocal } from '@/utils/date';

interface TimeSlot {
	time: string;
	available: boolean;
}

interface UseBookingTimeSlotsProps {
	selectedDate: string;
	selectedService: Service | null;
	selectedStaff: string;
	workingHours?: WorkingHours | null;
	salonWorkingHours?: WorkingHours | null;
	existingBookings: any[];
	staffMembers: Staff[];
	isTimeSlotAvailable: (timeSlot: string, selectedStaffId?: string) => boolean;
	salonTimezone?: string;
	t: (key: string) => string;
}

export function useBookingTimeSlots({
	selectedDate,
	selectedService,
	selectedStaff,
	workingHours,
	salonWorkingHours,
	existingBookings,
	staffMembers,
	isTimeSlotAvailable,
	salonTimezone = 'Asia/Ho_Chi_Minh',
	t,
}: UseBookingTimeSlotsProps) {
	// Calculate global time range from all working days
	const getGlobalTimeRange = (): { startHour: number; endHour: number } => {
		const currentWorkingHours = workingHours || salonWorkingHours;

		if (!currentWorkingHours) {
			return { startHour: 6, endHour: 23 };
		}

		let minStartHour = 23;
		let maxEndHour = 0;

		const days: (keyof WorkingHours)[] = [
			'monday',
			'tuesday',
			'wednesday',
			'thursday',
			'friday',
			'saturday',
			'sunday',
		];

		days.forEach((dayName) => {
			const dayHours = currentWorkingHours[dayName];
			if (dayHours && !dayHours.closed && dayHours.open && dayHours.close) {
				const openHour = parseInt(dayHours.open.split(':')[0]);
				const closeHour = parseInt(dayHours.close.split(':')[0]);

				minStartHour = Math.min(minStartHour, openHour);
				maxEndHour = Math.max(maxEndHour, closeHour);
			}
		});

		if (minStartHour === 23 || maxEndHour === 0) {
			return { startHour: 6, endHour: 23 };
		}

		return { startHour: minStartHour, endHour: maxEndHour };
	};

	// Generate time slots based on salon working hours for selected date
	const generateTimeSlots = (date?: string): TimeSlot[] => {
		const slots: TimeSlot[] = [];

		let targetDate: Date;
		if (date) {
			const [year, month, day] = date.split('-').map(Number);
			targetDate = new Date(year, month - 1, day);
		} else {
			targetDate = new Date();
		}

		const dayOfWeek = targetDate.getDay();
		const dayNames: (keyof WorkingHours)[] = [
			'sunday',
			'monday',
			'tuesday',
			'wednesday',
			'thursday',
			'friday',
			'saturday',
		];
		const dayName = dayNames[dayOfWeek];

		const globalRange = getGlobalTimeRange();
		const startHour = globalRange.startHour;
		const endHour = globalRange.endHour;

		const currentWorkingHours = workingHours || salonWorkingHours;

		let dayOpenHour = startHour;
		let dayCloseHour = endHour;
		let isDayClosed = false;

		if (currentWorkingHours && currentWorkingHours[dayName]) {
			if (currentWorkingHours[dayName].closed) {
				isDayClosed = true;
			} else if (
				currentWorkingHours[dayName].open &&
				currentWorkingHours[dayName].close
			) {
				dayOpenHour = parseInt(
					currentWorkingHours[dayName].open!.split(':')[0]
				);
				dayCloseHour = parseInt(
					currentWorkingHours[dayName].close!.split(':')[0]
				);
			}
		}

		if (isDayClosed) {
			return [];
		}

		// Generate time slots in 24-hour format (every 15 minutes)
		for (let hour = startHour; hour < endHour; hour++) {
			const timeSlots = [
				`${hour.toString().padStart(2, '0')}:00`,
				`${hour.toString().padStart(2, '0')}:15`,
				`${hour.toString().padStart(2, '0')}:30`,
				`${hour.toString().padStart(2, '0')}:45`,
			];

			timeSlots.forEach((timeSlot) => {
				const timeHour = parseInt(timeSlot.split(':')[0]);
				const timeMinute = parseInt(timeSlot.split(':')[1]);
				const timeInMinutes = timeHour * 60 + timeMinute;

				const dayOpenInMinutes = dayOpenHour * 60;
				const dayCloseInMinutes = dayCloseHour * 60;

				const isWithinWorkingHours =
					timeInMinutes >= dayOpenInMinutes &&
					timeInMinutes < dayCloseInMinutes;

				if (!isWithinWorkingHours) {
					return;
				}

				// Check if the selected date is today and filter out past time slots
				const now = new Date();
				const today = new Date(
					now.getFullYear(),
					now.getMonth(),
					now.getDate()
				);
				const selectedDay = new Date(
					targetDate.getFullYear(),
					targetDate.getMonth(),
					targetDate.getDate()
				);
				const isToday = today.getTime() === selectedDay.getTime();

				if (isToday) {
					const currentHour = now.getHours();
					const currentMinute = now.getMinutes();
					const currentTimeInMinutes = currentHour * 60 + currentMinute;

					if (timeInMinutes < currentTimeInMinutes + 15) {
						return;
					}
				}

				// Determine staff ID for availability check
				let staffIdForCheck: string | undefined;
				if (selectedStaff && selectedStaff !== t('booking.anyStaff')) {
					const staffMember = staffMembers.find(
						(staff) => staff.name === selectedStaff
					);
					staffIdForCheck = staffMember?.id;
				}

				slots.push({
					time: timeSlot,
					available: isTimeSlotAvailable(timeSlot, staffIdForCheck),
				});
			});
		}
		return slots;
	};

	const generatedTimeSlots = useMemo(
		() => generateTimeSlots(selectedDate),
		[
			selectedDate,
			workingHours,
			salonWorkingHours,
			selectedService,
			selectedStaff,
			existingBookings,
			staffMembers,
			isTimeSlotAvailable,
			t,
		]
	);

	// Filter available time slots based on selected staff
	const getAvailableTimeSlots = useMemo(() => {
		return (timeSlots: TimeSlot[]): TimeSlot[] => {
			if (
				!selectedStaff ||
				selectedStaff === t('booking.anyStaff') ||
				!selectedService
			) {
				return timeSlots.filter((slot) =>
					isTimeSlotAvailable(slot.time, undefined)
				);
			}

			const staffMember = staffMembers.find(
				(staff) => staff.name === selectedStaff
			);
			if (!staffMember) return timeSlots;

			return timeSlots.filter((slot) =>
				isTimeSlotAvailable(slot.time, staffMember.id)
			);
		};
	}, [selectedStaff, selectedService, staffMembers, isTimeSlotAvailable, t]);

	const timeSlots = useMemo(() => {
		return getAvailableTimeSlots(generatedTimeSlots);
	}, [generatedTimeSlots, getAvailableTimeSlots]);

	return {
		timeSlots,
		generatedTimeSlots,
	};
}

