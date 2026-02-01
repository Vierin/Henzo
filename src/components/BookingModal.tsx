'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Service, WorkingHours, Staff } from '@/types';
import { useStaffBySalon } from '@/hooks/useStaff';
import { useServices } from '@/hooks/useServices';
import { useAuthStore } from '@/stores/authStore';
import { useSalonId } from '@/hooks/useSalons';
import toast from 'react-hot-toast';
import { safeParseDate, parseBookingTimeAsLocal } from '@/utils/date';
import { useLanguage } from '@/contexts/LanguageContext';
import { getLocalizedServiceName } from '@/utils/serviceLocalization';
import { logger } from '@/lib/logger';
import { storage } from '@/utils/storage';
import { weekdayFullMap, weekdayShortKeys, monthMap } from '@/utils/dateConstants';
import { useIsWithinWorkingHours } from '@/hooks/useIsWithinWorkingHours';
import BookingGuestForm from './BookingModal/BookingGuestForm';
import BookingAuthForm from './BookingModal/BookingAuthForm';
import BookingServiceSelector from './BookingModal/BookingServiceSelector';
import BookingDateSelector from './BookingModal/BookingDateSelector';
import BookingTimeSelector from './BookingModal/BookingTimeSelector';
import BookingStaffSelector from './BookingModal/BookingStaffSelector';
import BookingFormFooter from './BookingModal/BookingFormFooter';
// Custom hooks
import { useBookingState } from '@/hooks/useBookingState';
import { useBookingData } from '@/hooks/useBookingData';
import { useBookingAvailability } from '@/hooks/useBookingAvailability';
import { useBookingTimeSlots } from '@/hooks/useBookingTimeSlots';
import { useBookingScroll } from '@/hooks/useBookingScroll';
import { useBookingAuth } from '@/hooks/useBookingAuth';
import { useTimeBlocks } from '@/hooks/useTimeBlocks';
import { getTimeBlockRangeOnDate } from '@/utils/date';

// Custom styles for native scroll
const scrollStyles = `
  /* Native scroll styles */
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  
  /* Improve drag scrolling for desktop */
  @media (min-width: 640px) {
    .cursor-grab {
      cursor: grab;
    }
    
    .cursor-grab:active {
      cursor: grabbing !important;
    }
  }
`;

interface BookingModalProps {
	isOpen: boolean;
	onClose: () => void;
	service?: Service;
	showServiceSelector?: boolean; // Новый пропс для показа выпадающего списка услуг
	salonId?: string; // ID салона для загрузки услуг и персонала
	salonName?: string; // Название салона для отображения
	workingHours?: WorkingHours; // Рабочие часы салона
	editingBooking?: any; // Данные редактируемого бронирования
	onBookingUpdated?: () => void; // Callback для обновления списка бронирований
}

export default function BookingModal({
	isOpen,
	onClose,
	service,
	showServiceSelector = false,
	salonId,
	salonName,
	workingHours,
	editingBooking,
	onBookingUpdated,
}: BookingModalProps) {
	const { language, t } = useLanguage();
	
	// Используем переданный salonId
	const currentSalonId = salonId;

	// Получаем salonId владельца для проверки
	const { salonId: ownerSalonId } = useSalonId();

	// Используем Zustand store для аутентификации
	const { user, isClient, isOwner, refreshUser } = useAuthStore();

	// Используем новые хуки для получения данных
	const {
		data: staffMembers = [],
		isLoading: staffLoading,
	} = useStaffBySalon(currentSalonId || '');

	const {
		data: services = [],
	} = useServices(currentSalonId || '');

	// Custom hooks для управления состоянием
	const bookingState = useBookingState({
		salonId: currentSalonId,
		initialService: service,
		initialWorkingHours: workingHours,
	});

	const {
		selectedService,
		setSelectedService,
		selectedDate,
		setSelectedDate,
		selectedTime,
		setSelectedTime,
		selectedStaff,
		setSelectedStaff,
		salonWorkingHours,
		setSalonWorkingHours,
		restoreBookingState,
	} = bookingState;

	const bookingData = useBookingData({
		salonId: currentSalonId,
		isOpen,
		selectedDate,
	});

	const {
		salonWorkingHours: dataSalonWorkingHours,
		salonTimezone,
		existingBookings,
		bookingsLoadError,
	} = bookingData;

	const { data: allTimeBlocks = [] } = useTimeBlocks();

	// Time blocks that overlap the selected date (for availability: salon closure / staff time off)
	const timeBlocksForDate = useMemo(() => {
		if (!selectedDate || allTimeBlocks.length === 0) return [];
		return allTimeBlocks.filter(
			(block) =>
				getTimeBlockRangeOnDate(
					block.startDate,
					block.endDate,
					selectedDate,
					salonTimezone
				) !== null
		);
	}, [selectedDate, allTimeBlocks, salonTimezone]);

	// When editing, exclude current booking from conflict check so its time slot stays visible
	const bookingsForAvailability = useMemo(() => {
		if (editingBooking?.id && existingBookings?.length) {
			return existingBookings.filter((b) => b.id !== editingBooking.id);
		}
		return existingBookings ?? [];
	}, [existingBookings, editingBooking?.id]);

	// Синхронизируем salonWorkingHours из bookingData с bookingState
	useEffect(() => {
		if (dataSalonWorkingHours) {
			setSalonWorkingHours(dataSalonWorkingHours);
		}
	}, [dataSalonWorkingHours, setSalonWorkingHours]);

	// Check if current time is within working hours
	const isWithinWorkingHours = useIsWithinWorkingHours(
		salonWorkingHours,
		salonTimezone
	);

	// Local UI states
	const [isStaffDropdownOpen, setIsStaffDropdownOpen] = useState(false);
	const [currentDateIndex, setCurrentDateIndex] = useState(0);
	const [startDateIndex, setStartDateIndex] = useState(0);
	const [loading, setLoading] = useState(false);
	const [isServiceDropdownOpen, setIsServiceDropdownOpen] = useState(false);
	const [isInitialized, setIsInitialized] = useState(false);
	const [bookingSuccess, setBookingSuccess] = useState<{
		status: 'PENDING' | 'CONFIRMED';
		serviceName: string;
		date: string;
		time: string;
		isWithinWorkingHours?: boolean;
	} | null>(null);
	const [currentStep, setCurrentStep] = useState<'booking' | 'client'>('booking');
	const [isMobile, setIsMobile] = useState(false);
	const [timeFilter, setTimeFilter] = useState<'morning' | 'afternoon' | 'evening'>('evening');
	const [clientEmail, setClientEmail] = useState('');
	const [clientName, setClientName] = useState('');
	const [clientPhone, setClientPhone] = useState('');

	// Check if mobile device
	useEffect(() => {
		const checkMobile = () => {
			setIsMobile(window.innerWidth <= 768);
		};

		checkMobile();
		window.addEventListener('resize', checkMobile);
		return () => window.removeEventListener('resize', checkMobile);
	}, []);

	// Reset step when modal opens/closes
	useEffect(() => {
		if (isOpen) {
			setCurrentStep('booking');
		} else {
			setCurrentStep('booking');
		}
	}, [isOpen]);

	// Handle close with step reset
	const handleClose = () => {
		setCurrentStep('booking');
		onClose();
	};

	// Scroll hook
	const scroll = useBookingScroll({
		isOpen,
		initialDaysCount: 90,
		loadMoreDaysCount: 40,
	});

	const {
		timeScrollRef,
		dateScrollRef,
		loadedDaysCount,
		isLoadingMoreDays,
		canScrollDateLeft,
		canScrollDateRight,
		checkScrollPosition,
		checkDateScrollPosition,
		onDateScrollLeftReport,
		onDateScrollRightReport,
	} = scroll;


	// Reset selected staff if they can't perform the selected service
	useEffect(() => {
		if (selectedService && selectedStaff && selectedStaff !== t('booking.anyStaff')) {
			const staffMember = staffMembers.find((staff: Staff) => staff.name === selectedStaff);
			if (staffMember) {
				const staffServices = staffMember.Service || [];
				// If staff has services assigned, check if they can perform selected service
				if (staffServices.length > 0) {
					const canPerform = staffServices.some((service) => service.id === selectedService.id);
					if (!canPerform) {
						// Reset to "Any Staff" if current staff can't perform the service
						setSelectedStaff(t('booking.anyStaff') || 'Any Staff Member');
					}
				}
			}
		}
	}, [selectedService, selectedStaff, staffMembers, t]);

	// Reset selected service if it can't be performed by the selected staff
	useEffect(() => {
		if (selectedService && selectedStaff && selectedStaff !== t('booking.anyStaff')) {
			const staffMember = staffMembers.find((staff: Staff) => staff.name === selectedStaff);
			if (staffMember) {
				const staffServices = staffMember.Service || [];
				// If staff has services assigned, check if they can perform selected service
				if (staffServices.length > 0) {
					const canPerform = staffServices.some((service) => service.id === selectedService.id);
					if (!canPerform) {
						// Reset selected service if current staff can't perform it
						setSelectedService(null);
					}
				}
			}
		}
	}, [selectedStaff, selectedService, staffMembers, t]);

	// Check for pending booking after OAuth (even if modal is closed)
	useEffect(() => {
		if (user && isClient) {
			const pendingBooking = storage.getItem('pendingBooking');
			if (pendingBooking) {
				try {
					const bookingData = JSON.parse(pendingBooking);
					// Check if this is from OAuth callback (has returnUrl)
					if (bookingData.returnUrl) {
						logger.log('📅 Detected OAuth callback, restoring booking...');

						// Validate booking data before restoring
						if (
							!bookingData.service ||
							!bookingData.date ||
							!bookingData.time
						) {
							logger.error('❌ Missing booking data in localStorage:', {
								hasService: !!bookingData.service,
								hasDate: !!bookingData.date,
								hasTime: !!bookingData.time,
								bookingData,
							});
							storage.removeItem('pendingBooking');
							toast.error('Invalid booking data. Please try again.');
							return;
						}

						// Validate date format (YYYY-MM-DD)
						const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
						if (!dateRegex.test(bookingData.date)) {
							logger.error(
								'❌ Invalid date format in localStorage:',
								bookingData.date
							);
							storage.removeItem('pendingBooking');
							toast.error('Invalid date format. Please try again.');
							return;
						}

						// Validate time format (HH:MM)
						const timeRegex = /^\d{2}:\d{2}$/;
						if (!timeRegex.test(bookingData.time)) {
							logger.error(
								'❌ Invalid time format in localStorage:',
								bookingData.time
							);
							storage.removeItem('pendingBooking');
							toast.error('Invalid time format. Please try again.');
							return;
						}

						logger.log('✅ Valid booking data found:', {
							service: bookingData.service?.name,
							date: bookingData.date,
							time: bookingData.time,
							staff: bookingData.staff,
						});

						// Restore booking data
						setSelectedService(bookingData.service);
						setSelectedDate(bookingData.date);
						setSelectedTime(bookingData.time);
						setSelectedStaff(bookingData.staff);
						if (bookingData.workingHours) {
							setSalonWorkingHours(bookingData.workingHours);
						}

						// Remove returnUrl from storage to mark as processed
						delete bookingData.returnUrl;
						storage.setItem('pendingBooking', JSON.stringify(bookingData));

						// Small delay to ensure state is set, then complete booking
						setTimeout(async () => {
							try {
								logger.log('✅ Completing booking after OAuth...');
								logger.log('📋 Current state:', {
									selectedService: selectedService?.name,
									selectedDate,
									selectedTime,
									selectedStaff,
								});

								// Check auth again before creating booking
								const currentUser = useAuthStore.getState().user;
								if (!currentUser) {
									logger.error('❌ User not authenticated after OAuth');
									toast.error('Please log in to complete your booking');
									return;
								}

								// Verify we have all required data in state
								// Use bookingData as fallback if state is not set yet
								const finalDate = selectedDate || bookingData.date;
								const finalTime = selectedTime || bookingData.time;
								const finalService = selectedService || bookingData.service;

								if (!finalService || !finalDate || !finalTime) {
									logger.error('❌ Missing data in state:', {
										hasService: !!finalService,
										hasDate: !!finalDate,
										hasTime: !!finalTime,
										selectedDate,
										selectedTime,
										selectedService: !!selectedService,
										bookingDataDate: bookingData.date,
										bookingDataTime: bookingData.time,
									});
									toast.error('Missing booking information. Please try again.');
									return;
								}

								// Validate service has ID
								if (!finalService.id) {
									logger.error('❌ Service missing ID:', {
										service: finalService,
										selectedService,
										bookingDataService: bookingData.service,
									});
									toast.error('Invalid service data. Please try again.');
									return;
								}

						 
								await createBooking({
									service: finalService,
									date: finalDate,
									time: finalTime,
									staff: bookingData.staff,
								});
							} catch (error) {
								logger.error('❌ Error completing booking after OAuth:', error);
								toast.error(
									error instanceof Error
										? error.message
										: 'Failed to complete booking. Please try again.'
								);
							}
						}, 2000);
					}
				} catch (error) {
					logger.error('Error parsing pending booking:', error);
				}
			}
		}
	}, [user, isClient]);

	// Restore booking state when modal opens and user is authenticated
	useEffect(() => {
		if (isOpen && user && isClient) {
			// Regular restore for non-OAuth flows
			restoreBookingStateWrapper();
		}
	}, [isOpen, user, isClient]);

	// Функция для проверки, является ли владелец владельцем этого салона
	const isOwnerOfThisSalon = () => {
		if (!isOwner || !currentSalonId || !ownerSalonId) {
			return false;
		}
		return ownerSalonId === currentSalonId;
	};

	// Booking auth hook
	const bookingAuth = useBookingAuth({
		salonId: currentSalonId,
		salonName,
		salonTimezone,
		salonWorkingHours,
		selectedService,
		selectedDate,
		selectedTime,
		selectedStaff,
		clientEmail,
		clientName,
		clientPhone,
		isOwner,
		isOwnerOfThisSalon,
		editingBooking,
		t,
		language,
	});

	const {
		showLoginModal,
		setShowLoginModal,
		showMagicLinkSent,
		setShowMagicLinkSent,
		guestEmail,
		setGuestEmail,
		pendingBookingData,
		setPendingBookingData,
		checkClientAuth,
		handleSendMagicLink,
		createBookingDateTimeUTC,
	} = bookingAuth;

	// Функция для восстановления состояния бронирования (используем из хука)
	const restoreBookingStateWrapper = () => {
		return restoreBookingState();
	};

	// Availability hook (when editing, exclude current booking; time blocks make slots unavailable)
	const { isTimeSlotAvailable } = useBookingAvailability({
		selectedService,
		selectedDate,
		selectedStaff,
		existingBookings: bookingsForAvailability,
		staffMembers,
		bookingsLoadError,
		timeBlocks: timeBlocksForDate.map((b) => ({
			startDate: b.startDate,
			endDate: b.endDate,
			staffId: b.staffId ?? null,
		})),
		salonTimezone,
	});

	// Time slots hook (when editing, exclude current booking so its slot is shown)
	const { timeSlots } = useBookingTimeSlots({
		selectedDate,
		selectedService,
		selectedStaff,
		workingHours,
		salonWorkingHours,
		existingBookings: bookingsForAvailability,
		staffMembers,
		isTimeSlotAvailable,
		salonTimezone,
		t,
	});

	// Filter services by selected staff (which services the staff can perform)
	const servicesForStaff = useMemo(() => {
		if (!selectedStaff || selectedStaff === t('booking.anyStaff')) {
			return services; // Show all services if no staff selected or "Any Staff"
		}

		const staffMember = staffMembers.find((staff) => staff.name === selectedStaff);
		if (!staffMember) {
			return services; // Show all services if staff not found
		}

		const staffServices = staffMember.Service || [];
		// If staff has no services assigned (empty array), they can perform all services
		if (staffServices.length === 0) {
			return services; // Can perform all services
		}

		// Filter services to show only those that the staff can perform
		const staffServiceIds = new Set(staffServices.map((service) => service.id));
		return services.filter((service) => staffServiceIds.has(service.id));
	}, [selectedStaff, staffMembers, services, t]);

	// Initialize selected service (after servicesForStaff is defined)
	useEffect(() => {
		if (service) {
			setSelectedService(service);
		} else if (showServiceSelector && servicesForStaff.length > 0) {
			// Если показываем селектор услуг и есть услуги, выбираем первую из доступных для работника
			setSelectedService(servicesForStaff[0]);
		}
	}, [service, showServiceSelector, servicesForStaff]);

	// Filter staff members by selected service (which services they can perform)
	const staffMembersForService = useMemo(() => {
		if (!selectedService) {
			return staffMembers; // Show all staff if no service selected
		}

		return staffMembers.filter((staff) => {
			// If staff has no services assigned (empty array or undefined), they can perform all services
			const staffServices = staff.Service || [];
			if (staffServices.length === 0) {
				return true; // Can perform all services
			}

			// Check if staff can perform the selected service
			return staffServices.some((service) => service.id === selectedService.id);
		});
	}, [selectedService, staffMembers]);

	// Filter available staff members based on selected time
	const availableStaffMembers = useMemo(() => {
		if (!selectedTime || !selectedDate || !selectedService) {
			return staffMembersForService; // Show staff filtered by service if no time selected
		}

		const serviceDuration = selectedService.duration;
		const [slotHour, slotMinute] = selectedTime.split(':').map(Number);
		const slotStartMinutes = slotHour * 60 + slotMinute;
		const slotEndMinutes = slotStartMinutes + serviceDuration;

		// Find bookings that conflict with selected time (when editing, exclude current booking)
		const conflictingBookings = bookingsForAvailability.filter((booking) => {
			const bookingDateTime = parseBookingTimeAsLocal(
				booking.time || booking.dateTime,
				salonTimezone
			);
			if (!bookingDateTime) return false;

			// Check if booking is on the same date
			const bookingDate = bookingDateTime.toISOString().split('T')[0];
			if (bookingDate !== selectedDate) return false;

			const bookingStartMinutes =
				bookingDateTime.getHours() * 60 + bookingDateTime.getMinutes();
			const bookingEndMinutes =
				bookingStartMinutes + (booking.service?.duration || 60);

			// Check if time slots overlap
			return (
				slotStartMinutes < bookingEndMinutes &&
				slotEndMinutes > bookingStartMinutes
			);
		});

		// Get busy staff IDs
		const busyStaffIds = new Set(
			conflictingBookings.map((booking) => booking.staffId).filter(Boolean)
		);

		// Filter out busy staff members from service-filtered list
		return staffMembersForService.filter((staff) => !busyStaffIds.has(staff.id));
	}, [
		selectedTime,
		selectedDate,
		selectedService,
		bookingsForAvailability,
		staffMembersForService,
		salonTimezone,
	]);

	// Time slots are now generated by useBookingTimeSlots hook

	// Generate days for Date Pills with lazy loading
	const getAvailableDays = () => {
		const days = [];
		const today = new Date();

		for (let i = 0; i < loadedDaysCount; i++) {
			const date = new Date(today);
			date.setDate(today.getDate() + i);

			// Check if this day is closed
			const dayOfWeek = date.getDay();
			const dayName = weekdayFullMap[dayOfWeek];
			const currentWorkingHours = workingHours || salonWorkingHours;
			const isClosed = Boolean(
				currentWorkingHours && currentWorkingHours[dayName]?.closed === true
			);

			const year = date.getFullYear();
			const month = String(date.getMonth() + 1).padStart(2, '0');
			const day = String(date.getDate()).padStart(2, '0');
			const dateString = `${year}-${month}-${day}`;

			// Get translated weekday and month
			const weekdayShortKey = weekdayShortKeys[dayOfWeek];
			const monthKey = monthMap[date.getMonth()];
			const dayNameTranslated = t(`weekdays.short.${weekdayShortKey}`);
			const monthShortTranslated = t(`months.short.${monthKey}`) || monthKey;

			days.push({
				dateString,
				day: date.getDate(),
				dayName: dayNameTranslated,
				monthShort: monthShortTranslated,
				displayDate: String(date.getDate()),
				displayMonth: monthShortTranslated,
				isToday: i === 0,
				isTomorrow: i === 1,
				fullDate: date,
				isClosed,
			});
		}

		return days;
	};

	// Filter time slots by time of day
	const filteredTimeSlots = useMemo(() => {
		const ranges = {
			morning: [6, 12],
			afternoon: [12, 18], // Extended afternoon until 18:00
			evening: [18, 23], // Extended evening until 23:00
		};

		const [start, end] = ranges[timeFilter];

		return timeSlots.filter((slot) => {
			const time = typeof slot === 'string' ? slot : slot.time;
			const hour = parseInt(time.split(':')[0]);
			return hour >= start && hour < end;
		});
	}, [timeSlots, timeFilter]);

	// Reset selected time if it's not available in current filter
	useEffect(() => {
		if (selectedTime && filteredTimeSlots.length > 0) {
			const isTimeInFilter = filteredTimeSlots.some((slot) => {
				const time = typeof slot === 'string' ? slot : slot.time;
				return time === selectedTime;
			});

			if (!isTimeInFilter) {
				setSelectedTime('');
			}
		}
	}, [selectedTime, filteredTimeSlots]);

	// Scroll to beginning when time filter changes and check scroll position
	useEffect(() => {
		if (timeScrollRef.current) {
			timeScrollRef.current.scrollLeft = 0;
			// Check scroll position after a small delay to ensure DOM is updated
			setTimeout(() => {
				checkScrollPosition();
			}, 100);
		}
	}, [timeFilter, filteredTimeSlots]);

	// Update date scroll when loadedDaysCount changes
	useEffect(() => {
		if (dateScrollRef.current) {
			setTimeout(() => {
				if (dateScrollRef.current) {
					checkDateScrollPosition();
				}
			}, 100);
		}
	}, [loadedDaysCount]);

	// Initialize date scroll position when modal opens
	useEffect(() => {
		if (isOpen && dateScrollRef.current) {
			setTimeout(() => {
				checkDateScrollPosition();
			}, 200);
		}
	}, [isOpen]);

	// Auto-select nearest available date when modal opens or if selectedDate becomes closed
	useEffect(() => {
		if (!isOpen) {
			return; // Only run when modal is open
		}

		const availableDays = getAvailableDays();
		const currentSelectedDateInfo = availableDays.find(
			(day) => day.dateString === selectedDate
		);

		// Determine if a new date needs to be selected
		let shouldSelectNewDate = false;
		let targetDateString = '';

		if (!selectedDate) {
			// No date is currently selected, so we need to find one
			shouldSelectNewDate = true;
		} else if (currentSelectedDateInfo && currentSelectedDateInfo.isClosed) {
			// The currently selected date is closed, so we need to find an open one
			shouldSelectNewDate = true;
		}

		if (shouldSelectNewDate) {
			const nextAvailableDay = availableDays.find((day) => !day.isClosed);
			if (nextAvailableDay) {
				targetDateString = nextAvailableDay.dateString;
			} else {
				// All loaded days are closed. Explicitly clear selectedDate.
				targetDateString = '';
			}

			// Only update if the target date is different from the current selectedDate
			if (selectedDate !== targetDateString) {
				setSelectedDate(targetDateString);
			}
		}
	}, [isOpen, selectedDate, workingHours, salonWorkingHours]);

	// Pre-fill date, service, staff as soon as modal opens for edit (so timeSlots can load)
	useEffect(() => {
		if (!editingBooking || !isOpen) return;
		const bookingDate = new Date(editingBooking.time);
		const year = bookingDate.getFullYear();
		const month = String(bookingDate.getMonth() + 1).padStart(2, '0');
		const day = String(bookingDate.getDate()).padStart(2, '0');
		const dateString = `${year}-${month}-${day}`;
		setSelectedDate(dateString);
		if (editingBooking.service) setSelectedService(editingBooking.service);
		if (editingBooking.staff) setSelectedStaff(editingBooking.staff.name);
		else setSelectedStaff(t('booking.anyStaff') || 'Any Staff Member');
	}, [editingBooking, isOpen, t]);

	// Pre-fill time once timeSlots are available (depends on date/service/staff from above)
	useEffect(() => {
		if (!editingBooking || !isOpen || timeSlots.length === 0 || isInitialized) return;
		const bookingDate = new Date(editingBooking.time);
		const timeString = bookingDate.toTimeString().slice(0, 5);
		const [bookingHour, bookingMinute] = timeString.split(':').map(Number);
		const bookingMinutes = bookingHour * 60 + bookingMinute;

		let closestTime: string =
			typeof timeSlots[0] === 'string' ? timeSlots[0] : (timeSlots[0] as { time: string })?.time || '';
		let closestDiff = Math.abs(
			parseInt(closestTime.split(':')[0]) * 60 + parseInt(closestTime.split(':')[1]) - bookingMinutes
		);

		for (const slot of timeSlots) {
			const slotTime = typeof slot === 'string' ? slot : (slot as { time: string }).time;
			const [slotHour, slotMinute] = slotTime.split(':').map(Number);
			const slotMinutes = slotHour * 60 + slotMinute;
			const diff = Math.abs(slotMinutes - bookingMinutes);
			if (diff < closestDiff) {
				closestDiff = diff;
				closestTime = slotTime;
			}
		}
		setSelectedTime(closestTime);
		setIsInitialized(true);
	}, [editingBooking, isOpen, timeSlots, isInitialized]);

	// Initialize selectedStaff when modal opens
	useEffect(() => {
		if (isOpen && !editingBooking && t('booking.anyStaff')) {
			setSelectedStaff(t('booking.anyStaff'));
		}
	}, [isOpen, editingBooking, t]);

	// Reset initialization flag and error state when modal closes
	useEffect(() => {
		if (!isOpen) {
			setIsInitialized(false);
			setShowLoginModal(false);
			setPendingBookingData(null);
			setBookingSuccess(null);
			setSelectedDate(''); // Reset selected date to trigger auto-selection on next open
			setSelectedTime(''); // Reset selected time
			setTimeFilter('evening'); // Reset time filter to evening
			setClientEmail(''); // Reset client email
			setClientName(''); // Reset client name
			setClientPhone(''); // Reset client phone
			setSelectedStaff(t('booking.anyStaff') || 'Any Staff Member');
			setStartDateIndex(0); // Reset start date index to show first 7 days
			// Note: bookingsLoadError and loadedDaysCount are managed by hooks
		}
	}, [isOpen, t, setShowLoginModal, setPendingBookingData, setSelectedDate, setSelectedTime, setSelectedStaff]);


	// Add "Any Staff" option to the beginning of staff list
	// Use availableStaffMembers if time is selected, otherwise use staff filtered by service
	const staffToShow =
		selectedTime && selectedDate && selectedService
			? availableStaffMembers
			: staffMembersForService;

	const allStaffMembers = [
		{
			id: 'any',
			name: t('booking.anyStaff'),
			accessLevel: 'EMPLOYEE' as const,
			salonId: salonId || '', // Добавляем salonId для соответствия типу Staff
		},
		...staffToShow,
	];

	// Block body scroll when modal is open
	React.useEffect(() => {
		if (isOpen) {
			// Prevent body scroll
			document.body.style.overflow = 'hidden';
		} else {
			// Restore body scroll
			document.body.style.overflow = 'unset';
		}

		// Cleanup function to restore scroll when component unmounts
		return () => {
			document.body.style.overflow = 'unset';
		};
	}, [isOpen]);

	// Set initial selected date to today (only for new bookings)
	React.useEffect(() => {
		if (!editingBooking && isOpen && !selectedDate) {
			const today = new Date();
			// Format date as YYYY-MM-DD without timezone conversion
			const year = today.getFullYear();
			const month = String(today.getMonth() + 1).padStart(2, '0');
			const day = String(today.getDate()).padStart(2, '0');
			const todayString = `${year}-${month}-${day}`;
			setSelectedDate(todayString);
		}
	}, [isOpen, editingBooking, selectedDate]);

	// createBookingDateTimeUTC and handleSendMagicLink are now in useBookingAuth hook

	// Handle login success and complete booking
	const handleLoginSuccess = async () => {
		try {
			setShowLoginModal(false);

			// Refresh user state
			await refreshUser();

			// Complete the pending booking
			if (pendingBookingData) {
				// Restore booking data
				setSelectedService(pendingBookingData.service);
				setSelectedDate(pendingBookingData.date);
				setSelectedTime(pendingBookingData.time);
				setSelectedStaff(pendingBookingData.staff);

				// Small delay to ensure state propagation
				await new Promise((resolve) => setTimeout(resolve, 200));

				// Verify user is loaded
				const currentUser = useAuthStore.getState().user;
				if (!currentUser) {
					throw new Error('User not loaded after login');
				}

				// Create booking
				await createBooking();
				setPendingBookingData(null);
			}
		} catch (error) {
			logger.error('Failed to complete booking after login:', error);
			toast.error('Failed to complete booking. Please try again.');
		}
	};

	// Validate booking step (step 1)
	const validateBookingStep = (): boolean => {
		if (!selectedService || !selectedDate || !selectedTime) {
			toast.error(t.booking.pleaseFillAllFields);
			return false;
		}
		return true;
	};

	// Handle next step (from booking to client info)
	const handleNextStep = () => {
		if (validateBookingStep()) {
			setCurrentStep('client');
		}
	};

	// Handle back step (from client to booking)
	const handleBackStep = () => {
		setCurrentStep('booking');
	};

	const handleBooking = async () => {
		// On mobile, if we're on booking step, validate and move to next step
		if (isMobile && currentStep === 'booking') {
			handleNextStep();
			return;
		}

		// Validate booking data
		if (!selectedService || !selectedDate || !selectedTime) {
			toast.error(t.booking.pleaseFillAllFields);
			return;
		}

		// Проверяем, является ли владелец владельцем этого салона
		if (isOwner && !isOwnerOfThisSalon() && !editingBooking) {
			toast.error(
				t('booking.ownerCannotBookOtherSalon') ||
					'To book in another salon, please log in as a client account.'
			);
			return;
		}

		// Если владелец создает резервацию в своем салоне, валидируем email только если он введен
		if (isOwner && isOwnerOfThisSalon() && !editingBooking) {
			// Email опционален, но если введен - должен быть валидным
			if (clientEmail && clientEmail.trim()) {
				const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
				if (!emailRegex.test(clientEmail.trim())) {
					toast.error(t.booking.pleaseEnterValidEmail);
					return;
				}
			}
		}

		// If editing existing booking, skip client auth check (owner can edit)
		if (!editingBooking && !isOwner) {
			// Проверяем авторизацию клиента только для новых бронирований (не владельцев)
			if (!checkClientAuth()) {
				// Сохраняем данные бронирования
				setPendingBookingData({
					service: selectedService,
					date: selectedDate,
					time: selectedTime,
					staff: selectedStaff,
					notes: '', // можно добавить notes если будет поле
				});

				// Показываем модальное окно логина/магик линка
				setShowLoginModal(true);
				setShowMagicLinkSent(false);
				return;
			}
		}

		// Если редактируем существующее бронирование или пользователь авторизован
		if (editingBooking) {
			await updateBooking();
		} else {
			await createBooking();
		}
	};

	const createBooking = async (overrideData?: {
		service?: Service | null;
		date?: string;
		time?: string;
		staff?: string;
	}) => {
		setLoading(true);

		try {
			// Проверяем, что пользователь авторизован (получаем напрямую из store)
			const currentUser = useAuthStore.getState().user;
			if (!currentUser) {
				throw new Error('User not authenticated');
			}

			// Use override data if provided, otherwise use state
			const serviceToUse = overrideData?.service || selectedService;
			const dateToUse = overrideData?.date || selectedDate;
			const timeToUse = overrideData?.time || selectedTime;
			const staffToUse = overrideData?.staff || selectedStaff;

			// Find the selected staff member
			const staffMember = staffMembers.find(
				(staff) => staff.name === staffToUse
			);
			const staffId = staffMember?.id || 'any';

			// Get current session for access token
			const {
				data: { session },
			} = await supabase.auth.getSession();

			if (!session?.access_token) {
				throw new Error('No valid session found');
			}

			// Create booking with user data
			const API_BASE_URL =
				process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

			// Validate date and time before creating booking
			if (!dateToUse || !timeToUse) {
				logger.error('❌ Missing date or time:', {
					dateToUse,
					timeToUse,
					selectedDate,
					selectedTime,
					overrideData,
				});
				throw new Error(t.booking.pleaseSelectDateAndTime);
			}

			// Validate date format (YYYY-MM-DD)
			const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
			if (!dateRegex.test(dateToUse)) {
				logger.error('❌ Invalid date format:', dateToUse);
				throw new Error(
					`Invalid date format: ${dateToUse}. Expected YYYY-MM-DD`
				);
			}

			// Validate time format (HH:MM)
			const timeRegex = /^\d{2}:\d{2}$/;
			if (!timeRegex.test(timeToUse)) {
				logger.error('❌ Invalid time format:', timeToUse);
				throw new Error(`Invalid time format: ${timeToUse}. Expected HH:MM`);
			}

			// Validate that date is not in the past
			const selectedDateObj = safeParseDate(dateToUse);
			if (selectedDateObj) {
				const now = new Date();
				const today = new Date(
					now.getFullYear(),
					now.getMonth(),
					now.getDate()
				);
				const selectedDateOnly = new Date(
					selectedDateObj.getFullYear(),
					selectedDateObj.getMonth(),
					selectedDateObj.getDate()
				);

				if (selectedDateOnly < today) {
					logger.error('❌ Selected date is in the past:', dateToUse);
					throw new Error(
						t.booking.dateInPast ||
							'Selected date is in the past. Please select a future date.'
					);
				}

				// If date is today, validate that time is not in the past
				if (selectedDateOnly.getTime() === today.getTime()) {
					const [hours, minutes] = timeToUse.split(':').map(Number);
					const selectedDateTime = new Date(
						now.getFullYear(),
						now.getMonth(),
						now.getDate(),
						hours,
						minutes
					);

					if (selectedDateTime < now) {
						logger.error('❌ Selected time is in the past:', timeToUse);
						throw new Error(
							t.booking.timeInPast ||
								'Selected time is in the past. Please select a future time.'
						);
					}
				}
			}

			let bookingDateTime: string;
			try {
				logger.log('🕐 Creating booking date time:', {
					dateToUse,
					timeToUse,
					selectedDate,
					selectedTime,
				});
				bookingDateTime = createBookingDateTimeUTC(
					dateToUse,
					timeToUse,
					salonTimezone
				);
				logger.log('✅ Booking date time created:', bookingDateTime);
			} catch (dateError) {
				logger.error('❌ Error creating booking date time:', dateError);
				logger.error('Date/time values:', {
					dateToUse,
					timeToUse,
					selectedDate,
					selectedTime,
				});
				throw new Error(
					`Invalid date/time selection: ${dateError instanceof Error ? dateError.message : 'Unknown error'}`
				);
			}

			// Validate required fields before creating request
			if (!serviceToUse?.id) {
				logger.error('❌ Missing service ID:', {
					serviceToUse,
					selectedService,
					overrideData,
				});
				throw new Error('Service is required to create a booking');
			}

			// Use currentSalonId or fallback to bookingData.salonId from localStorage
			let finalSalonId = currentSalonId;
			if (!finalSalonId) {
				try {
					const pendingBooking = storage.getItem('pendingBooking');
					if (pendingBooking) {
						const bookingData = JSON.parse(pendingBooking);
						finalSalonId = bookingData.salonId;
					}
				} catch (e) {
					// Ignore parsing errors
				}
			}

			if (!finalSalonId) {
				logger.error('❌ Missing salon ID:', {
					currentSalonId,
					salonId,
					pendingBooking: storage.getItem('pendingBooking'),
				});
				throw new Error('Salon ID is required to create a booking');
			}

			const requestBody: any = {
				serviceId: serviceToUse.id,
				staffId: staffId === 'any' ? undefined : staffId,
				time: bookingDateTime,
				salonId: finalSalonId,
				preferredLocale: language,
			};

			if (isOwner) {
				// Email отправляем только если он введен
				if (clientEmail && clientEmail.trim()) {
					requestBody.clientEmail = clientEmail.trim();
				}
				// Имя отправляем только если оно введено, иначе бэкенд создаст анонимного клиента
				if (clientName && clientName.trim()) {
					requestBody.clientName = clientName.trim();
				}
				if (clientPhone && clientPhone.trim()) {
					requestBody.clientPhone = clientPhone.trim();
				}
			}

			const response = await fetch(`${API_BASE_URL}/bookings`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${session.access_token}`,
				},
				body: JSON.stringify(requestBody),
			});

			const result = await response.json();

			if (!response.ok) {
				logger.error('❌ Booking request failed:', {
					status: response.status,
					statusText: response.statusText,
					result,
					requestBody,
				});

				// Extract detailed error message
				let errorMessage = t('booking.failedToBookAppointment');

				// Check for backend error message in different formats
				if (result.msg) {
					errorMessage = result.msg;
				} else if (result.message) {
					errorMessage = result.message;
				} else if (result.error) {
					errorMessage = result.error;
				} else if (Array.isArray(result.message)) {
					// Validation errors from class-validator
					errorMessage = result.message.join(', ');
				} else if (typeof result === 'string') {
					errorMessage = result;
				}

				if (errorMessage.includes('not available at this time')) {
					errorMessage = t('booking.staffNotAvailable') || errorMessage;
				} else if (errorMessage.includes('Selected staff member')) {
					errorMessage = t('booking.staffNotAvailable') || errorMessage;
				}

				throw new Error(errorMessage);
			}

			storage.removeItem('pendingBooking');
			setPendingBookingData(null);

			const bookingStatus = isOwner
				? 'CONFIRMED'
				: result.booking?.status || 'PENDING';
			
			setBookingSuccess({
				status: bookingStatus as 'PENDING' | 'CONFIRMED',
				serviceName: serviceToUse
					? getLocalizedServiceName(serviceToUse, language)
					: '',
				date: dateToUse,
				time: timeToUse,
				isWithinWorkingHours,
			});

			// Очищаем поля клиента после успешного создания
			if (isOwner) {
				setClientEmail('');
				setClientName('');
				setClientPhone('');
			}

			// Reset step after successful booking
			setCurrentStep('booking');

			// Show toast notification for user feedback (especially after OAuth redirect)
			if (bookingStatus === 'PENDING') {
				const thankYouMsg =
					t('booking.thankYouForReservation') !==
					'booking.thankYouForReservation'
					? t('booking.thankYouForReservation')
						: t.booking?.thankYouForReservation ||
							'Thank you for your reservation!';
				const awaitingMsg =
					t('booking.awaitingConfirmation') !==
					'booking.awaitingConfirmation'
					? t('booking.awaitingConfirmation')
						: t.booking?.awaitingConfirmation ||
							'Awaiting confirmation from the salon';
				const message =
					isWithinWorkingHours !== false
					? `${thankYouMsg} ${awaitingMsg}`
						: `${
								thankYouMsg
						  } ${
								t('booking.salonWillConfirmWhenOpen') ||
								t.booking?.salonWillConfirmWhenOpen ||
								'The salon will confirm your booking when they open.'
						  }`;
				toast.success(message, {
					duration: 6000,
					icon: '⏳',
				});
			} else {
				toast.success(t('booking.bookingConfirmedTitle'), {
					duration: 5000,
					icon: '✅',
				});
			}

			// For clients (not owners), redirect to client dashboard so they clearly see the reservation
			if (!isOwner) {
				try {
					const pathname = window.location.pathname;
					const localeMatch = pathname.match(/^\/(en|ru|vi)/);
					const locale = localeMatch ? localeMatch[1] : 'en';

					// Small delay so the toast is visible before redirect
					setTimeout(() => {
						window.location.href = `/${locale}/dashboard?bookingCreated=1`;
					}, 800);
				} catch (e) {
					// In case window is not available for some reason, just ignore
				}
			}
		} catch (error: unknown) {
			logger.error('Booking error:', error);
			toast.error(
				error instanceof Error
					? error.message
					: t('booking.failedToBookAppointment')
			);
		} finally {
			setLoading(false);
		}
	};

	const updateBooking = async () => {
		setLoading(true);

		try {
			if (!editingBooking) {
				throw new Error('No booking to update');
			}

			// Find the selected staff member
			const staffMember = staffMembers.find(
				(staff) => staff.name === selectedStaff
			);
			const staffId = staffMember?.id || 'any';

			// Get current session for access token
			const {
				data: { session },
			} = await supabase.auth.getSession();

			if (!session?.access_token) {
				throw new Error('No valid session found');
			}

			// Create booking datetime
			const API_BASE_URL =
				process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

			let bookingDateTime: string;
			try {
				bookingDateTime = createBookingDateTimeUTC(
					selectedDate,
					selectedTime,
					salonTimezone
				);
			} catch (dateError) {
				console.error('❌ Error creating booking date time:', dateError);
				throw new Error(
					`Invalid date/time selection: ${dateError instanceof Error ? dateError.message : 'Unknown error'}`
				);
			}

			const response = await fetch(
				`${API_BASE_URL}/bookings/${editingBooking.id}`,
				{
					method: 'PUT',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${session.access_token}`,
					},
					body: JSON.stringify({
						serviceId: selectedService?.id,
						staffId: staffId === 'any' ? undefined : staffId,
						time: bookingDateTime,
						// Don't add default notes - only include notes if user explicitly provided them
					}),
				}
			);

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || 'Failed to update booking');
			}

			// Show success message
			toast.success('Appointment updated successfully!');
			handleClose();

			// Call callback to refresh bookings list
			if (onBookingUpdated) {
				onBookingUpdated();
			}
		} catch (error: unknown) {
			console.error('Update booking error:', error);
			toast.error(
				error instanceof Error ? error.message : 'Failed to update appointment'
			);
		} finally {
			setLoading(false);
		}
	};

	// Close dropdowns when clicking outside
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			const target = e.target as HTMLElement;

			// Close staff dropdown if clicking outside
			if (isStaffDropdownOpen && !target.closest('.staff-dropdown')) {
				setIsStaffDropdownOpen(false);
			}

			// Close service dropdown if clicking outside
			if (isServiceDropdownOpen && !target.closest('.service-dropdown')) {
				setIsServiceDropdownOpen(false);
			}
		};

		if (isStaffDropdownOpen || isServiceDropdownOpen) {
			document.addEventListener('mousedown', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [isStaffDropdownOpen, isServiceDropdownOpen]);

	// Close dropdown when clicking outside (for backdrop)
	const handleClickOutside = (e: React.MouseEvent) => {
		const target = e.target as HTMLElement;

		// Close modal if clicking on the backdrop
		if (target.classList.contains('fixed')) {
			handleClose();
		}
	};

	if (!isOpen) return null;

	return (
		<>
			<style>{scrollStyles}</style>
			<div
				className="fixed inset-0 bg-[#F8F5F2CC] bg-opacity-80 sm:flex sm:items-center sm:justify-center z-[999] p-0 sm:p-4"
				onClick={(e) => {
					if (e.target === e.currentTarget) {
						handleClose();
					}
				}}
			>
				<div
					className="bg-white sm:rounded-2xl sm:shadow-2xl w-full h-full sm:h-auto sm:max-w-4xl sm:max-h-[90vh] overflow-hidden relative"
					onClick={(e) => e.stopPropagation()}
				>
					{/* Close button */}
					<button
						onClick={handleClose}
						className="absolute top-3 bg-white shadow-md right-3 sm:top-4 sm:right-4 z-10 p-1.5 sm:p-2 hover:bg-gray-100 rounded-full transition-colors"
					>
						<svg
							className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500 hover:text-gray-700"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>

					{/* Success Message */}
					{bookingSuccess ? (
						<div className="p-4 sm:p-8 flex flex-col items-center justify-center min-h-[100vh] sm:min-h-[400px]">
							<div className="text-center max-w-md w-full px-4">
								{bookingSuccess.status === 'PENDING' ? (
									<>
										<div className="mb-6">
											<div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
												<svg
													className="w-10 h-10 text-yellow-600"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={2}
														d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
													/>
												</svg>
											</div>
											<h2 className="text-2xl font-bold text-gray-900 mb-2">
												{t.booking?.thankYouForReservation || t('booking.thankYouForReservation') !== 'booking.thankYouForReservation' ? t('booking.thankYouForReservation') : 'Thank you for your reservation!'}
											</h2>
											<p className="text-gray-600 text-lg mb-4">
												{t.booking?.awaitingConfirmation || t('booking.awaitingConfirmation') !== 'booking.awaitingConfirmation' ? t('booking.awaitingConfirmation') : 'Awaiting confirmation from the salon'}
											</p>
										</div>

										<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
											<div className="text-left space-y-3">
												<div className="flex items-start gap-3">
													<svg
														className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0"
														fill="currentColor"
														viewBox="0 0 20 20"
													>
														<path
															fillRule="evenodd"
															d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
															clipRule="evenodd"
														/>
													</svg>
													<div className="text-sm text-gray-700">
														{bookingSuccess.isWithinWorkingHours !== false ? (
															<>
																<strong className="font-semibold">
																	{t.booking.usuallyConfirmsWithin}
																</strong>
																<p className="mt-1">{t.booking.willReceiveEmail}</p>
															</>
														) : (
															<>
																<strong className="font-semibold">
																	{t('booking.salonWillConfirmWhenOpen') || 'The salon will confirm your booking when they open.'}
																</strong>
															</>
														)}
													</div>
												</div>

												<div className="mt-4 pt-4 border-t border-yellow-200">
													<p className="text-sm font-medium text-gray-900 mb-2">
														{t.booking.bookingDetails}
													</p>
													<ul className="text-sm text-gray-700 space-y-1">
														<li>
															<strong>{t.booking.service}</strong>{' '}
															{bookingSuccess.serviceName}
														</li>
														<li>
															<strong>{t.booking.date}</strong>{' '}
															{new Date(
																bookingSuccess.date
															).toLocaleDateString()}
														</li>
														<li>
															<strong>{t.booking.time}</strong>{' '}
															{bookingSuccess.time}
														</li>
													</ul>
												</div>
											</div>
										</div>
									</>
								) : (
									<>
										<div className="mb-6">
											<div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
												<svg
													className="w-10 h-10 text-green-600"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={2}
														d="M5 13l4 4L19 7"
													/>
												</svg>
											</div>
											<h2 className="text-2xl font-bold text-gray-900 mb-2">
												{t.booking.bookingConfirmedTitle}
											</h2>
											<p className="text-gray-600 text-lg">
												{t.booking.appointmentBookedSuccessfully}
											</p>
										</div>

										<div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
											<p className="text-sm font-medium text-gray-900 mb-2">
												{t.booking.bookingDetails}
											</p>
											<ul className="text-sm text-gray-700 space-y-1 text-left">
												<li>
													<strong>{t.booking.service}</strong>{' '}
													{bookingSuccess.serviceName}
												</li>
												<li>
													<strong>{t.booking.date}</strong>{' '}
													{new Date(bookingSuccess.date).toLocaleDateString()}
												</li>
												<li>
													<strong>{t.booking.time}</strong>{' '}
													{bookingSuccess.time}
												</li>
											</ul>
										</div>
									</>
								)}

								<button
									onClick={() => {
										handleClose();
										window.location.reload();
									}}
									className="w-full bg-[#ff5b5b] text-white py-3 rounded-lg font-semibold text-lg hover:bg-[#e04a4a] transition-colors"
								>
									{t.booking.done}
								</button>
							</div>
						</div>
					) : isMobile && isOwner && isOwnerOfThisSalon() && !editingBooking ? (
						/* Mobile Multi-Step Form */
						<div className="flex flex-col h-full overflow-hidden">
							{/* Progress Indicator */}
							<div className="flex items-center justify-center gap-2 p-4 border-b border-gray-200 bg-white">
								<div
									className={`flex items-center gap-2 ${currentStep === 'booking' ? 'text-[#ff5b5b]' : 'text-gray-400'}`}
								>
									<div
										className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
											currentStep === 'booking'
												? 'bg-[#ff5b5b] text-white'
												: 'bg-gray-200 text-gray-600'
										}`}
									>
										1
									</div>
									<span className="text-sm font-medium hidden sm:inline">
										{t('booking.bookingDetails') || 'Booking Details'}
									</span>
								</div>
								<div className="w-8 h-0.5 bg-gray-200"></div>
								<div
									className={`flex items-center gap-2 ${currentStep === 'client' ? 'text-[#ff5b5b]' : 'text-gray-400'}`}
								>
									<div
										className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
											currentStep === 'client'
												? 'bg-[#ff5b5b] text-white'
												: 'bg-gray-200 text-gray-600'
										}`}
									>
										2
									</div>
									<span className="text-sm font-medium hidden sm:inline">
										{t('booking.clientInfo') || 'Client Info'}
									</span>
								</div>
							</div>

							{/* Step Content */}
							<div className="flex-1 overflow-y-auto">
								{currentStep === 'booking' ? (
									/* Step 1: Booking Details */
									<div className="p-4 space-y-6">
										{/* Service Details */}
										<BookingServiceSelector
											selectedService={selectedService}
											services={servicesForStaff}
											showServiceSelector={showServiceSelector}
											isServiceDropdownOpen={isServiceDropdownOpen}
											onServiceSelect={(service) => {
												setSelectedService(service);
												setIsServiceDropdownOpen(false);
												setIsStaffDropdownOpen(false);
											}}
											onToggleServiceDropdown={() => {
												setIsStaffDropdownOpen(false);
												setIsServiceDropdownOpen(!isServiceDropdownOpen);
											}}
											isOwnerMode={showServiceSelector && !!salonId}
										/>

										{/* Select Date */}
										<BookingDateSelector
											dates={getAvailableDays()}
											selectedDate={selectedDate}
											onDateSelect={(dateString) => {
												setSelectedDate(dateString);
											}}
											currentDateIndex={currentDateIndex}
											onDateIndexChange={setCurrentDateIndex}
											loadedDaysCount={loadedDaysCount}
											onLoadMoreDays={scroll.loadMoreDays}
											isLoadingMoreDays={isLoadingMoreDays}
											canScrollLeft={canScrollDateLeft}
											canScrollRight={canScrollDateRight}
											onScrollLeft={onDateScrollLeftReport}
											onScrollRight={onDateScrollRightReport}
											startDateIndex={startDateIndex}
											onStartDateIndexChange={setStartDateIndex}
										/>

										{/* Select Time */}
										{!selectedDate && (
											<div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
												{t.booking.pleaseSelectDateFirst}
											</div>
										)}
										<BookingTimeSelector
											timeSlots={timeSlots.map((slot) =>
												typeof slot === 'string' ? slot : slot.time
											)}
											filteredTimeSlots={filteredTimeSlots.map((slot) =>
												typeof slot === 'string' ? slot : slot.time
											)}
											selectedTime={selectedTime}
											onTimeSelect={setSelectedTime}
											timeFilter={timeFilter}
											onTimeFilterChange={setTimeFilter}
											isTimeSlotAvailable={isTimeSlotAvailable}
											selectedStaff={selectedStaff}
											timeSlotsLoading={false}
										/>

										{/* Select Staff Member */}
										<BookingStaffSelector
											selectedStaff={selectedStaff}
											allStaffMembers={allStaffMembers}
											isStaffDropdownOpen={isStaffDropdownOpen}
											onStaffSelect={(staffName) => {
												setSelectedStaff(staffName);
												setIsStaffDropdownOpen(false);
												setIsServiceDropdownOpen(false);
											}}
											onToggleStaffDropdown={() => {
												setIsServiceDropdownOpen(false);
												setIsStaffDropdownOpen(!isStaffDropdownOpen);
											}}
											staffLoading={staffLoading}
										/>

										{/* Next Button */}
										<button
											onClick={handleNextStep}
											disabled={
												!selectedService || !selectedDate || !selectedTime
											}
											className="w-full bg-[#ff5b5b] text-white py-3 rounded-lg font-semibold text-lg hover:bg-[#e04a4a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
										>
											{t('booking.next') || 'Next'}
										</button>
									</div>
								) : (
									/* Step 2: Client Information */
									<div className="p-4 space-y-6">
										{/* Booking Summary */}
										<div className="bg-gray-50 rounded-lg p-4 space-y-2">
											<h3 className="font-semibold text-gray-900 mb-3">
												{t('booking.bookingSummary') || 'Booking Summary'}
											</h3>
											<div className="space-y-1 text-sm text-gray-700">
												<div>
													<strong>{t('booking.service') || 'Service'}:</strong>{' '}
													{selectedService
														? getLocalizedServiceName(selectedService, language)
														: '-'}
												</div>
												<div>
													<strong>{t('booking.date') || 'Date'}:</strong>{' '}
													{selectedDate
														? new Date(selectedDate).toLocaleDateString()
														: '-'}
												</div>
												<div>
													<strong>{t('booking.time') || 'Time'}:</strong>{' '}
													{selectedTime || '-'}
												</div>
												<div>
													<strong>{t('booking.staff') || 'Staff'}:</strong>{' '}
													{selectedStaff}
												</div>
											</div>
										</div>

										{/* Client Information Form */}
										<BookingGuestForm
											clientEmail={clientEmail}
											clientName={clientName}
											clientPhone={clientPhone}
											onEmailChange={setClientEmail}
											onNameChange={setClientName}
											onPhoneChange={setClientPhone}
										/>

										{/* Action Buttons */}
										<div className="flex gap-3">
											<button
												onClick={handleBackStep}
												className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
											>
												{t('booking.back') || 'Back'}
											</button>
											<button
												onClick={handleBooking}
												disabled={loading}
												className="flex-1 bg-[#ff5b5b] text-white py-3 rounded-lg font-semibold hover:bg-[#e04a4a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
											>
												{loading
													? t('booking.booking') || 'Booking...'
													: t('booking.bookAppointment') || 'Book Appointment'}
											</button>
										</div>
									</div>
								)}
							</div>
						</div>
					) : (
						/* Desktop Layout (unchanged) */
						<div className="flex flex-col sm:flex-row overflow-hidden h-full">
							{/* Left Section - Service Details, Date, and Time Selection */}
							<div className="flex-1 sm:min-w-[500px] p-4 sm:p-8 max-h-[70vh] sm:max-h-[90vh] overflow-y-auto">
								{/* Service Details */}
								<BookingServiceSelector
									selectedService={selectedService}
									services={servicesForStaff}
									showServiceSelector={showServiceSelector}
									isServiceDropdownOpen={isServiceDropdownOpen}
									onServiceSelect={(service) => {
										setSelectedService(service);
										setIsServiceDropdownOpen(false);
										setIsStaffDropdownOpen(false);
									}}
									onToggleServiceDropdown={() => {
										setIsStaffDropdownOpen(false);
										setIsServiceDropdownOpen(!isServiceDropdownOpen);
									}}
									isOwnerMode={showServiceSelector && !!salonId}
								/>

								{/* Select Date - Date Pills */}
								<BookingDateSelector
									dates={getAvailableDays()}
									selectedDate={selectedDate}
									onDateSelect={(dateString) => {
										setSelectedDate(dateString);
									}}
									currentDateIndex={currentDateIndex}
									onDateIndexChange={setCurrentDateIndex}
									loadedDaysCount={loadedDaysCount}
									onLoadMoreDays={scroll.loadMoreDays}
									isLoadingMoreDays={isLoadingMoreDays}
									canScrollLeft={canScrollDateLeft}
									canScrollRight={canScrollDateRight}
									onScrollLeft={onDateScrollLeftReport}
									onScrollRight={onDateScrollRightReport}
									startDateIndex={startDateIndex}
									onStartDateIndexChange={setStartDateIndex}
								/>

								{/* Select Time */}
								{!selectedDate && (
									<div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg mb-4">
										{t.booking.pleaseSelectDateFirst}
									</div>
								)}
								<BookingTimeSelector
									timeSlots={timeSlots.map((slot) =>
										typeof slot === 'string' ? slot : slot.time
									)}
									filteredTimeSlots={filteredTimeSlots.map((slot) =>
										typeof slot === 'string' ? slot : slot.time
									)}
									selectedTime={selectedTime}
									onTimeSelect={setSelectedTime}
									timeFilter={timeFilter}
									onTimeFilterChange={setTimeFilter}
									isTimeSlotAvailable={isTimeSlotAvailable}
									selectedStaff={selectedStaff}
									timeSlotsLoading={false}
								/>
							</div>

							{/* Right Section - Staff Selection and Booking Button */}
							<div className="w-full sm:w-80 flex-shrink-0 bg-gray-50 sm:bg-gray-50 p-4 sm:p-8 sm:rounded-r-2xl border-t sm:border-t-0">
								{/* Select Staff Member */}
								<BookingStaffSelector
									selectedStaff={selectedStaff}
									allStaffMembers={allStaffMembers}
									isStaffDropdownOpen={isStaffDropdownOpen}
									onStaffSelect={(staffName) => {
										setSelectedStaff(staffName);
										setIsStaffDropdownOpen(false);
										setIsServiceDropdownOpen(false);
									}}
									onToggleStaffDropdown={() => {
										setIsServiceDropdownOpen(false);
										setIsStaffDropdownOpen(!isStaffDropdownOpen);
									}}
									staffLoading={staffLoading}
								/>

								{/* Client Information (only for owners creating new bookings in their own salon) */}
								{isOwner && isOwnerOfThisSalon() && !editingBooking && (
									<BookingGuestForm
										clientEmail={clientEmail}
										clientName={clientName}
										clientPhone={clientPhone}
										onEmailChange={setClientEmail}
										onNameChange={setClientName}
										onPhoneChange={setClientPhone}
									/>
								)}

								{/* Book Appointment Button */}
								<BookingFormFooter
									loading={loading}
									editingBooking={editingBooking}
									onBooking={handleBooking}
								/>
							</div>
						</div>
					)}
				</div>

				{/* Login Modal */}
				{showLoginModal && (
					<div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000] p-4">
						<div
							className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6"
							onClick={(e) => e.stopPropagation()}
						>
							{!showMagicLinkSent ? (
								<>
									<h3 className="text-2xl font-bold text-gray-900 mb-4">
										{t.booking.completeYourBooking}
									</h3>
									<p className="text-gray-600 mb-6">
										{t.booking.signInToComplete}{' '}
										<strong>
											{pendingBookingData?.service?.name ||
												selectedService?.name}
										</strong>
									</p>

									<BookingAuthForm
										onSuccess={handleLoginSuccess}
										onSendMagicLink={handleSendMagicLink}
										onCancel={() => {
											setShowLoginModal(false);
											setShowMagicLinkSent(false);
										}}
										bookingData={{
											service: pendingBookingData?.service || selectedService,
											date: pendingBookingData?.date || selectedDate || '',
											time: pendingBookingData?.time || selectedTime || '',
											staff: pendingBookingData?.staff || selectedStaff,
											salonId: currentSalonId || null,
											salonName: salonName || undefined,
											workingHours: salonWorkingHours || undefined,
										}}
									/>
								</>
							) : (
								<div className="text-center">
									<div className="mb-4">
										<svg
											className="w-16 h-16 text-green-500 mx-auto"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
											/>
										</svg>
									</div>
									<h3 className="text-2xl font-bold text-gray-900 mb-4">
										{t.booking.checkYourEmail}
									</h3>
									<p className="text-gray-600 mb-4">
										{t.booking.magicLinkSent} <strong>{guestEmail}</strong>
									</p>
									<p className="text-sm text-gray-500 mb-6">
										{t.booking.clickLinkToConfirm}
									</p>
									<button
										onClick={() => {
											setShowLoginModal(false);
											setShowMagicLinkSent(false);
											setGuestEmail('');
										}}
										className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
									>
										{t.common.close}
									</button>
								</div>
							)}
						</div>
					</div>
				)}
			</div>
		</>
	);
}

// LoginForm moved to BookingAuthForm.tsx component