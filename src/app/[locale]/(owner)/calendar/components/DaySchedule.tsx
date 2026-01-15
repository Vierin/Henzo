'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Booking, TimeBlock, Staff } from '@/types';
import {
	safeParseDate,
	formatTimeSafe,
	parseBookingTimeAsLocal,
} from '@/utils/date';
import {
	ChevronLeft,
	ChevronRight,
	X,
	Calendar as CalendarIcon,
	ClockIcon,
} from 'lucide-react';
import { useTranslation, useLanguage } from '@/contexts/LanguageContext';
import { useOwnerLayout } from '@/contexts/OwnerLayoutContext';
import { Calendar } from '@/components/ui/calendar';
import { ru, vi, enUS } from 'date-fns/locale';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DayScheduleProps {
	selectedDate: Date;
	bookings: Booking[];
	timeBlocks?: TimeBlock[];
	staffMembers?: Staff[]; // Все работники салона
	workingHours?: {
		monday?: { open: string; close: string; closed?: boolean };
		tuesday?: { open: string; close: string; closed?: boolean };
		wednesday?: { open: string; close: string; closed?: boolean };
		thursday?: { open: string; close: string; closed?: boolean };
		friday?: { open: string; close: string; closed?: boolean };
		saturday?: { open: string; close: string; closed?: boolean };
		sunday?: { open: string; close: string; closed?: boolean };
	};
	onBack: () => void;
	onViewBookingDetails: (booking: Booking) => void;
	onPrevDay?: () => void;
	onNextDay?: () => void;
	onDateChange?: (date: Date) => void; // Callback for date change
}

const DATA_WIDTH = '50px';

export default function DaySchedule({
	selectedDate,
	bookings,
	timeBlocks = [],
	staffMembers: providedStaffMembers = [],
	workingHours,
	onBack,
	onViewBookingDetails,
	onPrevDay,
	onNextDay,
	onDateChange,
}: DayScheduleProps) {
	const t = useTranslation();
	const { language } = useLanguage();
	const { salonData } = useOwnerLayout();
	const salonTimezone = salonData?.timezone || 'Asia/Ho_Chi_Minh';

	// Get calendar locale
	const getCalendarLocale = () => {
		switch (language) {
			case 'ru':
				return ru;
			case 'vi':
				return vi;
			default:
				return enUS;
		}
	};
	const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
	const [selectedMobileStaffId, setSelectedMobileStaffId] = useState<
		string | null
	>(null);
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [startX, setStartX] = useState(0);
	const [scrollLeft, setScrollLeft] = useState(0);
	const [isMobile, setIsMobile] = useState(false);
	const [startDateIndex, setStartDateIndex] = useState(0); // Index for week navigation
	const [showCalendarPicker, setShowCalendarPicker] = useState(false);

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

	const weekdayNames = [
		'sunday',
		'monday',
		'tuesday',
		'wednesday',
		'thursday',
		'friday',
		'saturday',
	];

	const formatDateForDisplay = (date: Date) => {
		const dayOfWeek = date.getDay();
		const monthIndex = date.getMonth();
		const day = date.getDate();
		const weekdayName = t(`weekdays.${weekdayNames[dayOfWeek]}`);
		const monthName = t(`months.short.${monthNames[monthIndex]}`);
		return `${weekdayName}, ${monthName} ${day}`;
	};

	// Get bookings for a specific date
	const getBookingsForDate = (date: Date) => {
		return bookings.filter((booking) => {
			const bookingDate = parseBookingTimeAsLocal(booking.time);
			if (!bookingDate) return false;
			return bookingDate.toDateString() === date.toDateString();
		});
	};

	const getTimeBlocksForDate = (date: Date) => {
		return timeBlocks.filter((block) => {
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

	// Get staff members
	const getStaffMembers = () => {
		if (providedStaffMembers.length > 0) {
			return providedStaffMembers;
		}
		// Extract unique staff from bookings
		const staffMap = new Map<string, Staff>();
		bookings.forEach((booking) => {
			if (booking.staff) {
				staffMap.set(booking.staff.id, booking.staff);
			}
		});
		return Array.from(staffMap.values());
	};

	const allStaffMembers = getStaffMembers();

	// Calculate load percentage for a specific date
	const calculateDayLoad = (date: Date, staffMembersList: Staff[]): number => {
		// Check if day is closed
		const dayOfWeek = date.getDay();
		const dayNameFull = weekdayNames[dayOfWeek];
		type WorkingHoursKey = keyof NonNullable<typeof workingHours>;
		const dayWorkingHours = workingHours?.[dayNameFull as WorkingHoursKey];

		if (!dayWorkingHours || dayWorkingHours.closed) {
			return 0; // Closed days have 0% load
		}

		if (!dayWorkingHours.open || !dayWorkingHours.close) {
			return 0; // No working hours
		}

		// Get working hours
		const openHour = parseInt(dayWorkingHours.open.split(':')[0]);
		const closeHour = parseInt(dayWorkingHours.close.split(':')[0]);
		const totalWorkingHours = closeHour - openHour;

		if (totalWorkingHours <= 0 || staffMembersList.length === 0) return 0;

		// Get bookings for this date
		const dayBookings = getBookingsForDate(date);
		const activeBookings = dayBookings.filter((b) => b.status !== 'CANCELED');

		// Get time blocks for this date
		const dayTimeBlocks = getTimeBlocksForDate(date);

		// Count total available slots (hours * staff members)
		const totalSlots = totalWorkingHours * staffMembersList.length;

		// Count occupied slots
		let occupiedSlots = 0;

		// Count bookings (each booking occupies 1 slot)
		occupiedSlots += activeBookings.length;

		// Count time blocks (each hour in a time block occupies slots for affected staff)
		dayTimeBlocks.forEach((block) => {
			const blockStart = new Date(block.startDate);
			const blockEnd = new Date(block.endDate);
			const blockStartHour = blockStart.getHours();
			const blockEndHour = blockEnd.getHours();
			const blockHours = Math.max(1, blockEndHour - blockStartHour);

			// If block is salon-wide, it affects all staff
			// If block is for specific staff, it affects only that staff
			if (!block.staffId) {
				// Salon-wide block
				occupiedSlots += blockHours * staffMembersList.length;
			} else {
				// Staff-specific block
				occupiedSlots += blockHours;
			}
		});

		// Calculate percentage (cap at 100%)
		const loadPercentage = Math.min(100, (occupiedSlots / totalSlots) * 100);
		return loadPercentage;
	};

	// Get load color based on percentage
	const getLoadColor = (loadPercentage: number, isClosed: boolean): string => {
		if (isClosed) return 'bg-gray-300'; // Gray for closed days
		if (loadPercentage >= 90) return 'bg-red-500'; // Red for fully loaded
		if (loadPercentage >= 50) return 'bg-yellow-500'; // Yellow for medium load
		return 'bg-green-500'; // Green for low load
	};

	// Generate 7 days starting from today
	const generateWeekDays = useMemo(() => {
		const days = [];
		const today = new Date();

		for (let i = 0; i < 7; i++) {
			const date = new Date(today);
			date.setDate(today.getDate() + startDateIndex + i);

			const dayOfWeek = date.getDay();
			const monthIndex = date.getMonth();
			const day = date.getDate();

			const weekdayShortKeys = [
				'sun',
				'mon',
				'tue',
				'wed',
				'thu',
				'fri',
				'sat',
			];
			const dayName = t(`weekdays.short.${weekdayShortKeys[dayOfWeek]}`);
			const monthShort = t(`months.short.${monthNames[monthIndex]}`);

			// Check if day is closed
			const dayNameFull = weekdayNames[dayOfWeek];
			type WorkingHoursKey = keyof NonNullable<typeof workingHours>;
			const dayWorkingHours = workingHours?.[dayNameFull as WorkingHoursKey];
			const isClosed = dayWorkingHours?.closed === true;

			// Check if today
			const todayOnly = new Date(
				today.getFullYear(),
				today.getMonth(),
				today.getDate()
			);
			const dateOnly = new Date(
				date.getFullYear(),
				date.getMonth(),
				date.getDate()
			);
			const isToday = dateOnly.getTime() === todayOnly.getTime();

			// Calculate load percentage
			const loadPercentage = calculateDayLoad(date, allStaffMembers);
			const loadColor = getLoadColor(loadPercentage, isClosed);

			days.push({
				date,
				day,
				dayName,
				monthShort,
				isToday,
				isClosed,
				loadPercentage,
				loadColor,
			});
		}

		return days;
	}, [
		startDateIndex,
		workingHours,
		t,
		monthNames,
		weekdayNames,
		bookings,
		timeBlocks,
		allStaffMembers,
	]);

	// Find current date index in week days
	const currentDateIndex = useMemo(() => {
		const selectedDateOnly = new Date(
			selectedDate.getFullYear(),
			selectedDate.getMonth(),
			selectedDate.getDate()
		);

		return generateWeekDays.findIndex((day) => {
			const dayOnly = new Date(
				day.date.getFullYear(),
				day.date.getMonth(),
				day.date.getDate()
			);
			return dayOnly.getTime() === selectedDateOnly.getTime();
		});
	}, [selectedDate, generateWeekDays]);

	// Update startDateIndex when selectedDate changes
	useEffect(() => {
		if (currentDateIndex === -1) {
			// Selected date is not in current week, adjust startDateIndex
			const today = new Date();
			const selectedDateOnly = new Date(
				selectedDate.getFullYear(),
				selectedDate.getMonth(),
				selectedDate.getDate()
			);
			const todayOnly = new Date(
				today.getFullYear(),
				today.getMonth(),
				today.getDate()
			);
			const daysDiff = Math.floor(
				(selectedDateOnly.getTime() - todayOnly.getTime()) /
					(1000 * 60 * 60 * 24)
			);
			setStartDateIndex(Math.max(0, daysDiff));
		}
	}, [selectedDate, currentDateIndex]);

	// Handle date selection from tabs
	const handleDateSelect = (date: Date) => {
		if (onDateChange) {
			onDateChange(date);
		}
	};

	// Handle week navigation
	const handleScrollLeft = () => {
		const newIndex = Math.max(0, startDateIndex - 7);
		setStartDateIndex(newIndex);

		// Calculate first day of new week
		const today = new Date();
		const firstDayOfNewWeek = new Date(today);
		firstDayOfNewWeek.setDate(today.getDate() + newIndex);

		// Check if selected date is in the new week
		const selectedDateOnly = new Date(
			selectedDate.getFullYear(),
			selectedDate.getMonth(),
			selectedDate.getDate()
		);
		const firstDayOnly = new Date(
			firstDayOfNewWeek.getFullYear(),
			firstDayOfNewWeek.getMonth(),
			firstDayOfNewWeek.getDate()
		);
		const lastDayOfNewWeek = new Date(firstDayOnly);
		lastDayOfNewWeek.setDate(firstDayOnly.getDate() + 6);

		// If selected date is not in the new week, select the first day
		if (
			selectedDateOnly < firstDayOnly ||
			selectedDateOnly > lastDayOfNewWeek
		) {
			handleDateSelect(firstDayOfNewWeek);
		}
	};

	const handleScrollRight = () => {
		const newIndex = startDateIndex + 7;
		setStartDateIndex(newIndex);

		// Calculate first day of new week
		const today = new Date();
		const firstDayOfNewWeek = new Date(today);
		firstDayOfNewWeek.setDate(today.getDate() + newIndex);

		// Check if selected date is in the new week
		const selectedDateOnly = new Date(
			selectedDate.getFullYear(),
			selectedDate.getMonth(),
			selectedDate.getDate()
		);
		const firstDayOnly = new Date(
			firstDayOfNewWeek.getFullYear(),
			firstDayOfNewWeek.getMonth(),
			firstDayOfNewWeek.getDate()
		);
		const lastDayOfNewWeek = new Date(firstDayOnly);
		lastDayOfNewWeek.setDate(firstDayOnly.getDate() + 6);

		// If selected date is not in the new week, select the first day
		if (
			selectedDateOnly < firstDayOnly ||
			selectedDateOnly > lastDayOfNewWeek
		) {
			handleDateSelect(firstDayOfNewWeek);
		}
	};

	const canScrollLeft = startDateIndex > 0;
	const canScrollRight = true; // Always can scroll right

	useEffect(() => {
		const checkMobile = () => {
			setIsMobile(window.innerWidth < 640);
		};

		checkMobile();
		window.addEventListener('resize', checkMobile);
		return () => window.removeEventListener('resize', checkMobile);
	}, []);

	const getTimeBlockAtTime = (staffId: string | null, timeSlotHour: number) => {
		const dayTimeBlocks = getTimeBlocksForDate(selectedDate);
		return dayTimeBlocks.find((block) => {
			// Check if block applies to this staff or salon-wide
			if (staffId !== null && block.staffId && block.staffId !== staffId) {
				return false;
			}

			const blockStart = new Date(block.startDate);
			const blockEnd = new Date(block.endDate);
			const blockStartHour = blockStart.getHours();
			const blockEndHour = blockEnd.getHours();

			// Check if time slot overlaps with block
			return timeSlotHour >= blockStartHour && timeSlotHour < blockEndHour;
		});
	};

	// Get day name from selected date
	const getDayName = (date: Date) => {
		const dayOfWeek = date.getDay();
		const dayNames = [
			'sunday',
			'monday',
			'tuesday',
			'wednesday',
			'thursday',
			'friday',
			'saturday',
		] as const;
		return dayNames[dayOfWeek];
	};

	// Check if selected day is closed
	const isSelectedDayClosed = () => {
		if (!workingHours) return false;
		const dayName = getDayName(selectedDate);
		const dayHours = workingHours[dayName];
		return dayHours?.closed === true;
	};

	// Get working hours for selected day
	const getSelectedDayWorkingHours = () => {
		if (!workingHours) return null;
		const dayName = getDayName(selectedDate);
		const dayHours = workingHours[dayName];
		if (!dayHours || dayHours.closed) return null;
		if (!dayHours.open || !dayHours.close) return null;

		const openHour = parseInt(dayHours.open.split(':')[0]);
		const openMinute = parseInt(dayHours.open.split(':')[1] || '0');
		const closeHour = parseInt(dayHours.close.split(':')[0]);
		const closeMinute = parseInt(dayHours.close.split(':')[1] || '0');

		return {
			openHour,
			openMinute,
			closeHour,
			closeMinute,
		};
	};

	// Check if time slot is outside working hours
	const isTimeSlotOutsideWorkingHours = (hour: number) => {
		const dayHours = getSelectedDayWorkingHours();
		if (!dayHours) return false; // If no working hours, don't mark as closed

		// Time slot represents the start of the hour (e.g., 7:00)
		// Check if this hour slot is completely outside working hours
		// Slot is outside if:
		// - Hour is before opening hour, OR
		// - Hour is at or after closing hour (since slot starts at :00, if close is 18:00, slot 18:00 is outside)
		return hour < dayHours.openHour || hour >= dayHours.closeHour;
	};

	// Calculate global time range from all working days
	const getGlobalTimeRange = () => {
		if (!workingHours) {
			return { startHour: 6, endHour: 23 }; // Extended default range
		}

		let minStartHour = 23; // Start with latest possible hour
		let maxEndHour = 0; // Start with earliest possible hour

		const days = [
			'monday',
			'tuesday',
			'wednesday',
			'thursday',
			'friday',
			'saturday',
			'sunday',
		] as const;

		days.forEach((dayName) => {
			const dayHours = workingHours[dayName];
			if (dayHours && !dayHours.closed && dayHours.open && dayHours.close) {
				const openHour = parseInt(dayHours.open.split(':')[0]);
				const closeHour = parseInt(dayHours.close.split(':')[0]);

				minStartHour = Math.min(minStartHour, openHour);
				maxEndHour = Math.max(maxEndHour, closeHour);
			}
		});

		// If no working hours found, use extended default
		if (minStartHour === 23 || maxEndHour === 0) {
			return { startHour: 6, endHour: 23 };
		}

		return { startHour: minStartHour, endHour: maxEndHour };
	};

	const getTimeSlots = () => {
		const slots = [];
		const { startHour, endHour } = getGlobalTimeRange();

		for (let hour = startHour; hour <= endHour; hour++) {
			slots.push({
				time: `${hour.toString().padStart(2, '0')}:00`,
				hour: hour,
				displayTime: `${hour.toString().padStart(2, '0')}:00`,
			});
		}
		return slots;
	};

	const getAppointmentStartingAtTime = (
		staffId: string,
		timeSlotHour: number
	) => {
		const dayBookings = getBookingsForDate(selectedDate);
		const appointment = dayBookings.find((booking) => {
			if (booking.status === 'CANCELED') return false;
			if (!booking.staff || booking.staff.id !== staffId) return false;

			const bookingTime = parseBookingTimeAsLocal(booking.time);
			if (!bookingTime) return false;

			const bookingHour = bookingTime.getHours();
			return bookingHour === timeSlotHour;
		});

		return appointment;
	};

	const getAppointmentPosition = (appointment: any, timeSlotHour: number) => {
		if (!appointment) return null;

		const bookingTime = new Date(appointment.time);
		const bookingMinute = bookingTime.getMinutes();
		const duration = appointment.service?.duration || 60;

		const topOffset = (bookingMinute / 60) * 100;
		const heightPercentage = (duration / 60) * 100;

		return {
			top: `${topOffset}%`,
			height: `${heightPercentage}%`,
			duration: duration,
		};
	};

	const getBookingBlockStyles = (booking: any) => {
		const now = new Date();
		const bookingTime = parseBookingTimeAsLocal(booking.time);
		if (!bookingTime) return {};

		const serviceDuration = booking.service?.duration || 60;
		const endTime = new Date(bookingTime.getTime() + serviceDuration * 60000);
		const isPast = endTime < now;

		if (isPast) {
			return {
				className:
					'absolute left-1 right-1 bg-gray-100 border border-gray-300 rounded-lg p-1 z-10 cursor-not-allowed opacity-60',
				textClassName: 'text-gray-600',
				textSecondaryClassName: 'text-gray-500',
			};
		} else if (booking.status === 'PENDING') {
			return {
				className:
					'absolute left-1 right-1 bg-yellow-50 border border-yellow-200 rounded-lg p-1 z-10 cursor-pointer hover:bg-yellow-100 transition-colors',
				textClassName: 'text-yellow-800',
				textSecondaryClassName: 'text-yellow-600',
			};
		} else if (booking.status === 'CONFIRMED') {
			return {
				className:
					'absolute left-1 right-1 bg-green-50 border border-green-200 rounded-lg p-1 z-10 cursor-pointer hover:bg-green-100 transition-colors',
				textClassName: 'text-green-800',
				textSecondaryClassName: 'text-green-600',
			};
		} else if (booking.status === 'COMPLETED') {
			return {
				className:
					'absolute left-1 right-1 bg-blue-50 border border-blue-200 rounded-lg p-1 z-10 cursor-pointer hover:bg-blue-100 transition-colors',
				textClassName: 'text-blue-800',
				textSecondaryClassName: 'text-blue-600',
			};
		} else {
			return {
				className:
					'absolute left-1 right-1 bg-red-50 border border-red-200 rounded-lg p-1 z-10 cursor-pointer hover:bg-red-100 transition-colors',
				textClassName: 'text-red-800',
				textSecondaryClassName: 'text-red-600',
			};
		}
	};

	const isBookingClickable = (booking: any) => {
		const now = new Date();
		const bookingTime = parseBookingTimeAsLocal(booking.time);
		if (!bookingTime) return false;

		const serviceDuration = booking.service?.duration || 60;
		const endTime = new Date(bookingTime.getTime() + serviceDuration * 60000);
		return endTime >= now;
	};

	const timeSlots = getTimeSlots();

	// State for current time to update every minute
	const [currentTime, setCurrentTime] = useState(new Date());

	// Update current time every minute
	useEffect(() => {
		const interval = setInterval(() => {
			setCurrentTime(new Date());
		}, 60000); // Update every minute

		return () => clearInterval(interval);
	}, []);

	// Calculate current time position for today
	const getCurrentTimePosition = () => {
		const now = currentTime;
		const selectedDateOnly = new Date(
			selectedDate.getFullYear(),
			selectedDate.getMonth(),
			selectedDate.getDate()
		);
		const todayOnly = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate()
		);

		// Only show current time line if selected date is today
		if (selectedDateOnly.getTime() !== todayOnly.getTime()) {
			return null;
		}

		const { startHour, endHour } = getGlobalTimeRange();
		const currentHour = now.getHours();
		const currentMinute = now.getMinutes();

		// Check if current time is within the displayed range
		if (currentHour < startHour || currentHour > endHour) {
			return null;
		}

		// Calculate position: hour offset + minute offset within the hour
		const hourOffset = currentHour - startHour;
		const minuteOffset = currentMinute / 60; // 0-1 for position within hour
		const totalOffset = hourOffset + minuteOffset;

		// Calculate top position as percentage
		// Each hour slot has height h-12 (48px) or h-16 (64px) on desktop
		const slotHeight = isMobile ? 48 : 64; // Height in pixels
		const totalSlots = endHour - startHour + 1;
		const positionInPixels = totalOffset * slotHeight;
		const totalHeight = totalSlots * slotHeight;
		const topPercentage = (positionInPixels / totalHeight) * 100;

		return {
			top: `${topPercentage}%`,
			time: `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`,
		};
	};

	const currentTimePosition = getCurrentTimePosition();

	// Set initial mobile staff selection to first staff member
	useEffect(() => {
		if (isMobile && allStaffMembers.length > 0 && !selectedMobileStaffId) {
			setSelectedMobileStaffId(allStaffMembers[0].id);
		} else if (!isMobile) {
			// Reset mobile selection when switching to desktop
			setSelectedMobileStaffId(null);
		}
	}, [isMobile, allStaffMembers.length, selectedMobileStaffId]);

	// Filtered staff members based on selection
	const staffMembers = useMemo(() => {
		// On mobile: show only selected staff member
		if (isMobile) {
			if (selectedMobileStaffId) {
				const staff = allStaffMembers.find(
					(s) => s.id === selectedMobileStaffId
				);
				return staff ? [staff] : [];
			}
			return [];
		}

		// On desktop: show all or filtered by selection
		if (selectedStaffIds.length === 0) {
			return allStaffMembers;
		}
		return allStaffMembers.filter((staff) =>
			selectedStaffIds.includes(staff.id)
		);
	}, [allStaffMembers, selectedStaffIds, selectedMobileStaffId, isMobile]);

	// Toggle staff selection (desktop: multiple, mobile: single)
	const toggleStaffSelection = (staffId: string) => {
		if (isMobile) {
			// On mobile: single selection (toggle if same, select if different)
			setSelectedMobileStaffId((prev) => (prev === staffId ? prev : staffId));
		} else {
			// On desktop: multiple selection
			setSelectedStaffIds((prev) => {
				if (prev.includes(staffId)) {
					return prev.filter((id) => id !== staffId);
				} else {
					return [...prev, staffId];
				}
			});
		}
	};

	// Clear all filters (desktop only)
	const clearAllFilters = () => {
		if (!isMobile) {
			setSelectedStaffIds([]);
		}
	};

	// Drag to scroll handlers
	const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
		if (!scrollContainerRef.current) return;
		setIsDragging(true);
		setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
		setScrollLeft(scrollContainerRef.current.scrollLeft);
		scrollContainerRef.current.style.cursor = 'grabbing';
		scrollContainerRef.current.style.userSelect = 'none';
	};

	const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
		if (!isDragging || !scrollContainerRef.current) return;
		e.preventDefault();
		const x = e.pageX - scrollContainerRef.current.offsetLeft;
		const walk = (x - startX) * 2; // Scroll speed multiplier
		scrollContainerRef.current.scrollLeft = scrollLeft - walk;
	};

	const handleMouseUp = () => {
		setIsDragging(false);
		if (scrollContainerRef.current) {
			scrollContainerRef.current.style.cursor = 'grab';
			scrollContainerRef.current.style.userSelect = 'auto';
		}
	};

	const handleMouseLeave = () => {
		if (isDragging) {
			setIsDragging(false);
			if (scrollContainerRef.current) {
				scrollContainerRef.current.style.cursor = 'grab';
				scrollContainerRef.current.style.userSelect = 'auto';
			}
		}
	};

	return (
		<div
			className="mt-4 md:mt-6 w-full max-w-full overflow-x-hidden"
			role="region"
			aria-labelledby="day-schedule-heading"
		>
			<h2 id="day-schedule-heading" className="sr-only">
				Day Schedule
			</h2>

			<div className="rounded-xl border border-[#f1d9d7] bg-white px-2 py-3 md:p-6 w-full max-w-full overflow-hidden">
				{/* Week Days Tabs Header */}
				<div className="mb-1 md:mb-6">
					<div className="flex items-center justify-between mb-3">
						<div className="flex items-center gap-2">
							<button
								onClick={handleScrollLeft}
								disabled={!canScrollLeft}
								className={`w-8 h-8 rounded-full shadow-md flex items-center justify-center transition-colors ${
									canScrollLeft
										? 'bg-white hover:bg-gray-50 border border-gray-200'
										: 'bg-gray-100 cursor-not-allowed border border-gray-200 opacity-50'
								}`}
								aria-label="Previous week"
							>
								<ChevronLeft
									className={`w-4 h-4 ${canScrollLeft ? 'text-gray-600' : 'text-gray-400'}`}
								/>
							</button>
							<button
								onClick={handleScrollRight}
								disabled={!canScrollRight}
								className={`w-8 h-8 rounded-full shadow-md flex items-center justify-center transition-colors ${
									canScrollRight
										? 'bg-white hover:bg-gray-50 border border-gray-200'
										: 'bg-gray-100 cursor-not-allowed border border-gray-200 opacity-50'
								}`}
								aria-label="Next week"
							>
								<ChevronRight
									className={`w-4 h-4 ${canScrollRight ? 'text-gray-600' : 'text-gray-400'}`}
								/>
							</button>
						</div>

						{/* Calendar Picker Button */}
						<Popover
							open={showCalendarPicker}
							onOpenChange={setShowCalendarPicker}
						>
							<PopoverTrigger asChild>
								<Button
									variant="outline"
									className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
									aria-label={t('owner.calendar.selectDate') || 'Select date'}
								>
									<CalendarIcon className="w-4 h-4" />
									<span className="hidden sm:inline">
										{t('owner.calendar.selectDate') || 'Select date'}
									</span>
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-auto p-0 bg-white" align="end">
								<Calendar
									mode="single"
									selected={selectedDate}
									onSelect={(date: Date | undefined) => {
										if (date) {
											handleDateSelect(date);
											setShowCalendarPicker(false);
										}
									}}
									fromDate={new Date()}
									disabled={(date) => {
										const today = new Date();
										today.setHours(0, 0, 0, 0);
										const dateToCheck = new Date(date);
										dateToCheck.setHours(0, 0, 0, 0);
										return dateToCheck < today;
									}}
									locale={getCalendarLocale()}
								/>
							</PopoverContent>
						</Popover>
					</div>

					{/* 7 Days Tabs */}
					<div className="flex gap-1 sm:gap-3 overflow-x-auto pb-2">
						{generateWeekDays.map((dayInfo, index) => {
							const isSelected = currentDateIndex === index;
							const actualIndex = startDateIndex + index;

							return (
								<button
									key={`day-${dayInfo.date.getTime()}`}
									onClick={() => {
										if (!dayInfo.isClosed) {
											handleDateSelect(dayInfo.date);
										}
									}}
									disabled={dayInfo.isClosed}
									className={cn(
										'flex-1 flex flex-col items-center justify-center py-1 px-1 sm:py-2 sm:px-2 rounded-lg sm:rounded-xl border-2 transition-all min-h-[70px] sm:min-h-[80px] md:min-h-[120px] h-[50px] sm:h-[80px] md:h-[120px] min-w-[45px] sm:min-w-[70px]',
										dayInfo.isClosed
											? 'border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed'
											: isSelected
												? 'border-[#ff5b5b] bg-[#ff5b5b] text-white shadow-lg'
												: 'border-gray-200 bg-white hover:border-[#ff5b5b] hover:shadow-md'
									)}
								>
									<span
										className={cn(
											'text-[10px] sm:text-xs font-medium mb-0.5 sm:mb-1',
											isSelected ? 'text-white' : 'text-gray-500'
										)}
									>
										{dayInfo.dayName}
									</span>
									<span
										className={cn(
											'text-sm sm:text-lg md:text-2xl font-bold mb-0.5 sm:mb-0.5',
											isSelected ? 'text-white' : 'text-gray-900'
										)}
									>
										{dayInfo.day}
									</span>
									<span
										className={cn(
											'text-[10px] sm:text-xs',
											isSelected ? 'text-white/80' : 'text-gray-500'
										)}
									>
										{dayInfo.monthShort}
									</span>
									<div className="w-[80%] sm:w-[70%] h-1 mt-1 rounded-full overflow-hidden bg-gray-200">
										{(() => {
											const loadPercentage = calculateDayLoad(
												dayInfo.date,
												allStaffMembers
											);
											const loadColor = getLoadColor(
												loadPercentage,
												dayInfo.isClosed
											);
											return (
												<div
													className={`h-full ${loadColor}`}
													style={{
														width: `${dayInfo.isClosed ? 0 : loadPercentage}%`,
													}}
												/>
											);
										})()}
									</div>
								</button>
							);
						})}
					</div>
				</div>

				{/* Staff Filter Pills */}
				{allStaffMembers.length > 0 && (
					<div className="mb-4 md:mb-6 w-full max-w-full min-w-0">
						{!isMobile && (
							<div className="mb-2">
								<span className="text-xs md:text-sm font-medium text-gray-600">
									{t('owner.calendar.filterByStaffLabel')}
								</span>
							</div>
						)}
						<div
							className="flex gap-2 overflow-x-auto py-2 -mx-1 min-w-0 w-full max-w-full"
							style={{ scrollbarWidth: 'thin' }}
						>
							{allStaffMembers.map((staff) => {
								// On mobile: check if this is the selected staff
								// On desktop: check if selected or all are shown
								const isSelected = isMobile
									? selectedMobileStaffId === staff.id
									: selectedStaffIds.length === 0 ||
										selectedStaffIds.includes(staff.id);
								return (
									<button
										key={staff.id}
										onClick={() => toggleStaffSelection(staff.id)}
										className={`inline-flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 rounded-full text-xs md:text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-[#ea4b4b] focus:ring-offset-2 flex-shrink-0 whitespace-nowrap ${
											isSelected
												? 'bg-[#ff5b5b] !text-white hover:bg-[#e04a4a]'
												: 'bg-gray-100 text-gray-600 hover:bg-gray-200'
										}`}
									>
										<span>{staff.name}</span>
										{!isMobile && isSelected && selectedStaffIds.length > 0 && (
											<X className="w-3 h-3 md:w-3.5 md:h-3.5 flex-shrink-0" />
										)}
									</button>
								);
							})}
							{!isMobile && selectedStaffIds.length > 0 && (
								<button
									onClick={clearAllFilters}
									className="text-xs md:text-sm text-gray-500 hover:text-gray-700 underline flex-shrink-0 whitespace-nowrap"
								>
									Clear all
								</button>
							)}
						</div>
					</div>
				)}

				{/* Check if selected day is closed */}
				{isSelectedDayClosed() ? (
					<div className="flex items-center justify-center py-12 bg-gray-50 rounded-lg border border-gray-300">
						<div className="text-center">
							<div className="mb-4">
								<svg
									className="w-16 h-16 text-gray-400 mx-auto"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={1.5}
										d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
							</div>
							<h3 className="text-lg font-semibold text-gray-900 mb-2">
								Salon is Closed
							</h3>
							<p className="text-gray-600">
								{t('owner.calendar.closed')}{' '}
								{t(`weekdays.${weekdayNames[selectedDate.getDay()]}`)}.
							</p>
						</div>
					</div>
				) : (
					<div className="flex">
						{/* Left sticky column - Time labels and header */}
						<div
							className="flex-shrink-0 sticky left-0 z-20 bg-white border-r border-gray-300"
							style={{ width: '45px' }}
						>
							{/* Time header */}
							<div className="border-b border-gray-300 bg-white">
								<div className="py-2 md:py-3 px-1 md:px-2 text-xs md:text-sm flex items-center justify-center h-[50px] sm:h-auto font-medium text-gray-500 text-center">
									<ClockIcon className="w-5 h-auto" />
								</div>
							</div>
							{/* Time cells */}
							{timeSlots.map((timeSlot) => (
								<div
									key={`time-${timeSlot.time}`}
									className="flex items-center justify-center text-xs md:text-sm text-gray-600 h-12 md:h-16 border-b border-gray-300 font-medium bg-white"
								>
									{timeSlot.displayTime.replace(':00', '')}
								</div>
							))}
						</div>

						{/* Right scrollable area - Staff columns with headers */}
						<div
							ref={scrollContainerRef}
							className={`flex-1 w-full max-w-full ${isMobile ? 'overflow-hidden' : 'overflow-x-auto cursor-grab'}`}
							onMouseDown={isMobile ? undefined : handleMouseDown}
							onMouseMove={isMobile ? undefined : handleMouseMove}
							onMouseUp={isMobile ? undefined : handleMouseUp}
							onMouseLeave={isMobile ? undefined : handleMouseLeave}
							style={{
								WebkitOverflowScrolling: 'touch' /* iOS smooth scrolling */,
							}}
						>
							<div className="flex flex-col relative">
								{/* Staff headers row */}
								<div className="flex border-b border-gray-300 bg-white h-[50px] sm:h-auto">
									{staffMembers.map((staff) => (
										<div
											key={staff.id}
											className={`${isMobile ? 'flex-1' : 'flex-1 min-w-0'} py-2 md:py-3 px-2 md:px-4 text-center border-r border-gray-300`}
										>
											<div className="text-m md:text-sm font-semibold text-gray-900 truncate">
												{staff.name}
											</div>
										</div>
									))}
								</div>

								{/* Staff columns grid */}
								<div className="flex relative">
									{/* Current time indicator line - positioned absolutely across all columns */}
									{currentTimePosition && (
										<div
											className="absolute left-0 right-0 z-50 pointer-events-none"
											style={{ top: currentTimePosition.top }}
										>
											<div className="flex items-center h-full">
												{/* Red line across all staff columns */}
												<div className="flex-1 relative h-0.5">
													<div className="absolute left-0 right-0 h-0.5 bg-[#ff5b5b]"></div>
													<div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-[#ff5b5b] rounded-full -ml-1 z-50"></div>
												</div>
											</div>
										</div>
									)}
									{staffMembers.map((staff) => (
										<div
											key={`staff-${staff.id}`}
											className={`${isMobile ? 'flex-1' : 'flex-1 min-w-0'} relative`}
										>
											{timeSlots.map((timeSlot) => {
												const startingAppointment =
													getAppointmentStartingAtTime(staff.id, timeSlot.hour);
												const position = getAppointmentPosition(
													startingAppointment,
													timeSlot.hour
												);
												const timeBlock = getTimeBlockAtTime(
													staff.id,
													timeSlot.hour
												);

												const isOutsideWorkingHours =
													isTimeSlotOutsideWorkingHours(timeSlot.hour);

												return (
													<div
														key={`${staff.id}-${timeSlot.time}`}
														className={`relative h-12 md:h-16 border-b border-r border-gray-300 last:border-r-0 ${
															timeBlock ? 'bg-gray-100' : ''
														} ${
															isOutsideWorkingHours && !timeBlock ? '100' : ''
														}`}
													>
														{/* Gray overlay for non-working hours */}
														{isOutsideWorkingHours && !timeBlock && (
															<div className="absolute inset-0 bg-gray-200 bg-opacity-40 pointer-events-none" />
														)}
														{timeBlock && (
															<div
																className="absolute inset-0 bg-gray-300 bg-opacity-50 flex items-center justify-center"
																style={{
																	backgroundImage:
																		'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.05) 10px, rgba(0,0,0,0.05) 20px)',
																}}
															>
																<div className="text-xs text-gray-700 font-medium px-1 md:px-2 py-0.5 md:py-1 bg-white rounded shadow-sm truncate max-w-[90%]">
																	{timeBlock.type === 'TIME_OFF'
																		? isMobile
																			? '🚫'
																			: '🚫 Time Off'
																		: timeBlock.type === 'BUSY'
																			? isMobile
																				? '⏸️'
																				: '⏸️ Busy'
																			: isMobile
																				? '🔒'
																				: '🔒 Closed'}
																</div>
															</div>
														)}
														{startingAppointment && position && !timeBlock
															? (() => {
																	const styles =
																		getBookingBlockStyles(startingAppointment);
																	const clickable =
																		isBookingClickable(startingAppointment);

																	return (
																		<div
																			className={styles.className}
																			style={{
																				top: position.top,
																				height: position.height,
																				minHeight: isMobile ? '20px' : '24px',
																			}}
																			onClick={
																				clickable
																					? () =>
																							onViewBookingDetails(
																								startingAppointment
																							)
																					: undefined
																			}
																			role="button"
																			tabIndex={clickable ? 0 : -1}
																			aria-label={`View details for appointment: ${startingAppointment.service?.name} with ${startingAppointment.user?.name || `Client ID: ${startingAppointment.userId}`} at ${formatTimeSafe(startingAppointment.time, 'Time not available', salonTimezone)}`}
																		>
																			{position.duration < 40 || isMobile ? (
																				<div
																					className={`text-xs ${styles.textClassName} font-medium leading-tight p-1`}
																				>
																					<div
																						className={`truncate ${styles.textSecondaryClassName}`}
																					>
																						{isMobile
																							? startingAppointment.service
																									?.name ||
																								startingAppointment.user
																									?.name ||
																								`Client`
																							: `${startingAppointment.user?.name || `Client ID: ${startingAppointment.userId}`} - ${startingAppointment.service?.name}`}
																					</div>
																				</div>
																			) : (
																				<div className="text-xs leading-tight p-1">
																					<div
																						className={`font-medium ${styles.textClassName} truncate`}
																					>
																						{startingAppointment.service?.name}{' '}
																						-{' '}
																						{startingAppointment.user?.name ||
																							`Client ID: ${startingAppointment.userId}`}
																					</div>
																					<div
																						className={`${styles.textSecondaryClassName} truncate`}
																					>
																						{formatTimeSafe(
																							startingAppointment.time,
																							'Time not available',
																							salonTimezone
																						)}{' '}
																						-{' '}
																						{formatTimeSafe(
																							new Date(
																								new Date(
																									startingAppointment.time
																								).getTime() +
																									position.duration * 60000
																							).toISOString(),
																							'Time not available',
																							salonTimezone
																						)}
																					</div>
																				</div>
																			)}
																		</div>
																	);
																})()
															: null}
													</div>
												);
											})}
										</div>
									))}
								</div>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
