'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Service, Staff, WorkingHours } from '@/types';
import { useStaffBySalon } from '@/hooks/useStaff';
import { useServices } from '@/hooks/useServices';
import { useAuthStore } from '@/stores/authStore';
import { useSalonId } from '@/hooks/useSalons';
import toast from 'react-hot-toast';
import { safeParseDate, parseBookingTimeAsLocal } from '@/utils/date';
import { formatVND } from '@/utils/currency';
import { useLanguage } from '@/contexts/LanguageContext';
import {
	getLocalizedServiceName,
	getLocalizedServiceDescription,
} from '@/utils/serviceLocalization';
import { logger } from '@/lib/logger';
import BookingGuestForm from './BookingModal/BookingGuestForm';
import BookingAuthForm from './BookingModal/BookingAuthForm';
import BookingServiceSelector from './BookingModal/BookingServiceSelector';
import BookingDateSelector from './BookingModal/BookingDateSelector';
import BookingTimeSelector from './BookingModal/BookingTimeSelector';
import BookingStaffSelector from './BookingModal/BookingStaffSelector';
import BookingFormFooter from './BookingModal/BookingFormFooter';
// Swiper imports removed - using native scroll instead
import { Clock, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

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
	const [selectedDate, setSelectedDate] = useState('');
	const [selectedTime, setSelectedTime] = useState('');
	const [selectedStaff, setSelectedStaff] = useState(
		t('booking.anyStaff') || 'Any Staff Member'
	);
	const [isStaffDropdownOpen, setIsStaffDropdownOpen] = useState(false);
	const [currentDateIndex, setCurrentDateIndex] = useState(0);
	const [salonWorkingHours, setSalonWorkingHours] =
		useState<WorkingHours | null>(null);
	const [loading, setLoading] = useState(false);
	const [selectedService, setSelectedService] = useState<Service | null>(null);
	const [isServiceDropdownOpen, setIsServiceDropdownOpen] = useState(false);
	const [isInitialized, setIsInitialized] = useState(false);
	const [currentMonth, setCurrentMonth] = useState(new Date());
	const [existingBookings, setExistingBookings] = useState<any[]>([]);
	const [bookingsLoaded, setBookingsLoaded] = useState(true);
	const [bookingsLoadError, setBookingsLoadError] = useState(false);
	const [showLoginModal, setShowLoginModal] = useState(false);
	const [showMagicLinkSent, setShowMagicLinkSent] = useState(false);
	const [guestEmail, setGuestEmail] = useState('');
	const [clientEmail, setClientEmail] = useState('');
	const [clientName, setClientName] = useState('');
	const [clientPhone, setClientPhone] = useState('');
	const [pendingBookingData, setPendingBookingData] = useState<{
		service: Service;
		date: string;
		time: string;
		staff: string;
		notes?: string;
	} | null>(null);
	const [bookingSuccess, setBookingSuccess] = useState<{
		status: 'PENDING' | 'CONFIRMED';
		serviceName: string;
		date: string;
		time: string;
	} | null>(null);

	// New states for improved UX
	const [timeFilter, setTimeFilter] = useState<
		'all' | 'morning' | 'afternoon' | 'evening'
	>('all');
	const [loadedDaysCount, setLoadedDaysCount] = useState(40); // Начальное количество дней
	const [isLoadingMoreDays, setIsLoadingMoreDays] = useState(false);
	const [canScrollLeft, setCanScrollLeft] = useState(false);
	const [canScrollRight, setCanScrollRight] = useState(false);
	const [canScrollDateLeft, setCanScrollDateLeft] = useState(false);
	const [canScrollDateRight, setCanScrollDateRight] = useState(false);
	const INITIAL_DAYS = 40;
	const LOAD_MORE_DAYS = 40; // Загружаем по 40 дней за раз

	// Refs for native scroll
	const timeScrollRef = useRef<HTMLDivElement>(null);
	const dateScrollRef = useRef<HTMLDivElement>(null);

	// Drag-to-scroll states for time scroll
	const [isDragging, setIsDragging] = useState(false);
	const [startX, setStartX] = useState(0);
	const [scrollLeft, setScrollLeft] = useState(0);
	const [hasMoved, setHasMoved] = useState(false);

	// Drag-to-scroll states for date scroll
	const [isDateDragging, setIsDateDragging] = useState(false);
	const [dateStartX, setDateStartX] = useState(0);
	const [dateScrollLeft, setDateScrollLeft] = useState(0);

	// Используем Zustand store для аутентификации
	const { user, isClient, isOwner, login, refreshUser } = useAuthStore();
	const router = useRouter();

	// Используем переданный salonId
	const currentSalonId = salonId;

	// Получаем salonId владельца для проверки
	const { salonId: ownerSalonId } = useSalonId();

	// Используем новые хуки для получения данных (только если salonId передан)
	const {
		data: staffMembers = [],
		isLoading: staffLoading,
		error: staffError,
	} = useStaffBySalon(currentSalonId || '');

	const {
		data: services = [],
		isLoading: servicesLoading,
		error: servicesError,
	} = useServices(currentSalonId || '');

	// Load salon data when modal opens
	useEffect(() => {
		if (isOpen && currentSalonId) {
			fetchSalonData();
		}
	}, [isOpen, currentSalonId]);

	// Load existing bookings when date changes
	useEffect(() => {
		if (selectedDate && currentSalonId) {
			fetchExistingBookings(selectedDate);
		}
	}, [selectedDate, currentSalonId]);

	// Initialize selected service
	useEffect(() => {
		if (service) {
			setSelectedService(service);
		} else if (showServiceSelector && services.length > 0) {
			// Если показываем селектор услуг и есть услуги, выбираем первую
			setSelectedService(services[0]);
		}
	}, [service, showServiceSelector, services]);

	// Check for pending booking after OAuth (even if modal is closed)
	useEffect(() => {
		if (user && isClient) {
			const pendingBooking = localStorage.getItem('pendingBooking');
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
							localStorage.removeItem('pendingBooking');
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
							localStorage.removeItem('pendingBooking');
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
							localStorage.removeItem('pendingBooking');
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

						// Remove returnUrl from localStorage to mark as processed
						delete bookingData.returnUrl;
						localStorage.setItem('pendingBooking', JSON.stringify(bookingData));

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

								// Directly call createBooking with data from bookingData to avoid state issues
								logger.log('🚀 Creating booking directly with data:', {
									service: finalService?.name,
									serviceId: finalService?.id,
									date: finalDate,
									time: finalTime,
									staff: bookingData.staff,
									salonId: currentSalonId,
								});
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
			restoreBookingState();
		}
	}, [isOpen, user, isClient]);

	// Функция для проверки, является ли владелец владельцем этого салона
	const isOwnerOfThisSalon = () => {
		if (!isOwner || !currentSalonId || !ownerSalonId) {
			return false;
		}
		return ownerSalonId === currentSalonId;
	};

	// Функция для проверки авторизации клиента
	// Если пользователь - владелец СВОЕГО салона, авторизация не требуется
	const checkClientAuth = () => {
		// Владелец может создавать резервации без авторизации клиента только в своем салоне
		if (isOwner && isOwnerOfThisSalon()) {
			return true;
		}
		// Если владелец пытается забронировать в чужом салоне, нужно залогиниться как клиент
		if (isOwner && !isOwnerOfThisSalon()) {
			return false;
		}
		return isClient;
	};

	// Функция для сохранения состояния бронирования
	const saveBookingState = () => {
		const bookingState = {
			service: selectedService,
			date: selectedDate,
			time: selectedTime,
			staff: selectedStaff,
			salonId: currentSalonId,
			salonName: salonName,
			workingHours: salonWorkingHours,
			timestamp: Date.now(),
			returnUrl: window.location.href,
		};
		localStorage.setItem('pendingBooking', JSON.stringify(bookingState));
	};

	// Функция для восстановления состояния бронирования
	const restoreBookingState = () => {
		const pendingBooking = localStorage.getItem('pendingBooking');
		if (pendingBooking) {
			try {
				const bookingData = JSON.parse(pendingBooking);
				// Проверяем, что данные не старше 1 часа
				const isExpired = Date.now() - bookingData.timestamp > 60 * 60 * 1000;

				if (!isExpired && bookingData.salonId === currentSalonId) {
					setSelectedService(bookingData.service);
					setSelectedDate(bookingData.date);
					setSelectedTime(bookingData.time);
					setSelectedStaff(bookingData.staff);
					setSalonWorkingHours(bookingData.workingHours);

					// Показываем уведомление о восстановлении
					toast.success('Booking details restored!');

					// Удаляем сохраненные данные
					localStorage.removeItem('pendingBooking');
					return true;
				} else {
					// Удаляем устаревшие данные
					localStorage.removeItem('pendingBooking');
				}
			} catch (error) {
				logger.error('Error restoring booking state:', error);
				localStorage.removeItem('pendingBooking');
			}
		}
		return false;
	};

	const fetchSalonData = async () => {
		try {
			const API_BASE_URL =
				process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

			// If salonId is provided, use it; otherwise try to get current user's salon
			if (salonId) {
				const response = await fetch(`${API_BASE_URL}/salons/${salonId}`);
				if (response.ok) {
					const data = await response.json();
					if (data && data.workingHours) {
						setSalonWorkingHours(data.workingHours);
					}
				}
			} else {
				// Fallback to current user's salon
				const {
					data: { session },
				} = await supabase.auth.getSession();

				if (!session?.access_token) {
					logger.warn('No session found for fetching salon data');
					return;
				}

				const response = await fetch(`${API_BASE_URL}/salons/current`, {
					headers: {
						Authorization: `Bearer ${session.access_token}`,
					},
				});

				if (!response.ok) {
					logger.warn('Could not fetch salon data, using defaults');
					return;
				}

				const responseData = await response.json();
				if (
					responseData.success &&
					responseData.data &&
					responseData.data.workingHours
				) {
					setSalonWorkingHours(responseData.data.workingHours);
				}
			}
		} catch (error) {
			logger.error('Error fetching salon data:', error);
		}
	};

	// Load existing bookings for the selected date
	const fetchExistingBookings = async (date: string) => {
		if (!salonId || !date) return;

		try {
			const API_BASE_URL =
				process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

			// Get session for authorization
			const { data: session } = await supabase.auth.getSession();

			const headers: HeadersInit = {
				'Content-Type': 'application/json',
			};

			// Add authorization header if session exists
			if (session?.session?.access_token) {
				headers.Authorization = `Bearer ${session.session.access_token}`;
			}

			const response = await fetch(
				`${API_BASE_URL}/bookings?salonId=${salonId}&date=${date}`,
				{
					method: 'GET',
					headers,
				}
			);

			if (response.ok) {
				const bookings = await response.json();
				logger.log('Fetched existing bookings:', bookings);
				setExistingBookings(bookings);
				setBookingsLoaded(true);
				setBookingsLoadError(false);
			} else if (response.status === 401) {
				// If unauthorized, try without auth (for public bookings)
				logger.warn('Unauthorized, trying to fetch public bookings...');
				const publicResponse = await fetch(
					`${API_BASE_URL}/bookings/public?salonId=${salonId}&date=${date}`
				);

				if (publicResponse.ok) {
					const bookings = await publicResponse.json();
					setExistingBookings(bookings);
					setBookingsLoaded(true);
					setBookingsLoadError(false);
				} else {
					logger.warn('Could not fetch public bookings either');
					setExistingBookings([]);
					setBookingsLoadError(true);
				}
			} else {
				logger.warn('Could not fetch existing bookings:', response.status);
				// Set empty array if we can't fetch bookings
				setExistingBookings([]);
				setBookingsLoadError(true);
			}
		} catch (error) {
			logger.error('Error fetching existing bookings:', error);
			// Set empty array on error to prevent blocking
			setExistingBookings([]);
			setBookingsLoadError(true);
		}
	};

	// Memoized availability map to avoid recalculating for the same slots
	const availabilityCache = useMemo(() => {
		const cache = new Map<string, boolean>();

		if (!selectedService || bookingsLoadError) {
			return cache; // Return empty cache, all slots will be available
		}

		const serviceDuration = selectedService.duration;
		const allStaffIds = new Set(staffMembers.map((staff) => staff.id));

		// Pre-calculate availability for all time slots
		// This runs once when dependencies change, not on every render
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

			// If bookings couldn't be loaded due to error, show all slots as available but with warning
			if (bookingsLoadError) {
				return true;
			}

			const serviceDuration = selectedService.duration;
			const [slotHour, slotMinute] = timeSlot.split(':').map(Number);
			const slotStartMinutes = slotHour * 60 + slotMinute;
			const slotEndMinutes = slotStartMinutes + serviceDuration;

			// Create cache key
			const cacheKey = `${timeSlot}-${selectedStaffId || 'any'}-${selectedDate}`;

			// Check cache first
			if (availabilityCache.has(cacheKey)) {
				return availabilityCache.get(cacheKey)!;
			}

			// If specific staff is selected, check only that staff's conflicts
			if (selectedStaffId && selectedStaffId !== 'Any Staff') {
				const hasConflict = existingBookings.some((booking) => {
					// Use parseBookingTimeAsLocal to avoid timezone conversion issues
					const bookingDateTime = parseBookingTimeAsLocal(
						booking.time || booking.dateTime
					);
					if (!bookingDateTime) return false; // Skip invalid dates

					const bookingStartMinutes =
						bookingDateTime.getHours() * 60 + bookingDateTime.getMinutes();
					const bookingEndMinutes =
						bookingStartMinutes + (booking.service?.duration || 60);

					// Check if time slots overlap
					const timeConflict =
						slotStartMinutes < bookingEndMinutes &&
						slotEndMinutes > bookingStartMinutes;

					// Only block if it's the same staff AND time conflicts
					const staffConflict = booking.staffId === selectedStaffId;
					return staffConflict && timeConflict;
				});

				const result = !hasConflict;
				// Cache the result
				availabilityCache.set(cacheKey, result);
				return result;
			}

			// If "Any Staff" is selected, check if ALL staff members are busy
			// The slot is available if at least one staff member is free
			const conflictingBookings = existingBookings.filter((booking) => {
				const bookingDateTime = parseBookingTimeAsLocal(
					booking.time || booking.dateTime
				);
				if (!bookingDateTime) return false;

				const bookingStartMinutes =
					bookingDateTime.getHours() * 60 + bookingDateTime.getMinutes();
				const bookingEndMinutes =
					bookingStartMinutes + (booking.service?.duration || 60);

				// Check if time slots overlap
				const timeConflict =
					slotStartMinutes < bookingEndMinutes &&
					slotEndMinutes > bookingStartMinutes;

				// Removed excessive logging

				return timeConflict;
			});

			// Get all staff IDs that are busy during this time slot
			const busyStaffIds = new Set(
				conflictingBookings.map((booking) => booking.staffId).filter(Boolean)
			);

			// Get all available staff IDs
			const allStaffIds = new Set(staffMembers.map((staff) => staff.id));

			// Check if there are any free staff members
			const hasFreeStaff = Array.from(allStaffIds).some(
				(staffId) => !busyStaffIds.has(staffId)
			);

			// Removed excessive logging - only log in development and limit frequency
			if (process.env.NODE_ENV === 'development' && Math.random() < 0.01) {
				logger.log('Any staff availability check (sampled):', {
					busyStaffIds: Array.from(busyStaffIds),
					allStaffIds: Array.from(allStaffIds),
					hasFreeStaff,
					conflictingBookingsCount: conflictingBookings.length,
				});
			}

			const result = hasFreeStaff;
			// Cache the result
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

	// Calculate global time range from all working days
	const getGlobalTimeRange = (): { startHour: number; endHour: number } => {
		const currentWorkingHours = workingHours || salonWorkingHours;

		if (!currentWorkingHours) {
			return { startHour: 6, endHour: 23 }; // Extended default range
		}

		let minStartHour = 23; // Start with latest possible hour
		let maxEndHour = 0; // Start with earliest possible hour

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

		// If no working hours found, use extended default
		if (minStartHour === 23 || maxEndHour === 0) {
			return { startHour: 6, endHour: 23 };
		}

		return { startHour: minStartHour, endHour: maxEndHour };
	};

	// Generate time slots based on salon working hours for selected date
	const generateTimeSlots = (
		date?: string
	): Array<{ time: string; available: boolean }> => {
		const slots: Array<{ time: string; available: boolean }> = [];

		// Use selected date or today
		let targetDate: Date;
		if (date) {
			// Parse date string correctly to avoid timezone issues
			const [year, month, day] = date.split('-').map(Number);
			targetDate = new Date(year, month - 1, day); // month is 0-indexed
		} else {
			targetDate = new Date();
		}

		const dayOfWeek = targetDate.getDay();
		const dayNames: (keyof WorkingHours)[] = [
			'sunday', // 0 - JavaScript getDay() still returns 0 for Sunday
			'monday', // 1
			'tuesday', // 2
			'wednesday', // 3
			'thursday', // 4
			'friday', // 5
			'saturday', // 6
		];
		const dayName = dayNames[dayOfWeek];

		// Get global time range for all working days
		const globalRange = getGlobalTimeRange();
		const startHour = globalRange.startHour;
		const endHour = globalRange.endHour;

		// Use passed workingHours or fallback to salonWorkingHours
		const currentWorkingHours = workingHours || salonWorkingHours;

		// Get working hours for the selected day to check availability
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

		// If salon is closed on this day, return empty slots
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

			// Add time slots with availability info
			timeSlots.forEach((timeSlot) => {
				// Check if this time slot is within the day's working hours
				const timeHour = parseInt(timeSlot.split(':')[0]);
				const timeMinute = parseInt(timeSlot.split(':')[1]);
				const timeInMinutes = timeHour * 60 + timeMinute;

				const dayOpenInMinutes = dayOpenHour * 60;
				const dayCloseInMinutes = dayCloseHour * 60;

				const isWithinWorkingHours =
					timeInMinutes >= dayOpenInMinutes &&
					timeInMinutes < dayCloseInMinutes;

				if (!isWithinWorkingHours) {
					// Skip this slot if it's outside working hours
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
					// Get current time in minutes
					const currentHour = now.getHours();
					const currentMinute = now.getMinutes();
					const currentTimeInMinutes = currentHour * 60 + currentMinute;

					// Skip past time slots (add 15 minutes buffer to allow booking for current time slot)
					if (timeInMinutes < currentTimeInMinutes + 15) {
						return;
					}
				}

				// Determine staff ID for availability check
				let staffIdForCheck: string | undefined;
				if (selectedStaff && selectedStaff !== t('booking.anyStaff')) {
					// Find the staff member by name to get their ID
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

	const timeSlots = useMemo(
		() => generateTimeSlots(selectedDate),
		[
			workingHours,
			salonWorkingHours,
			selectedDate,
			selectedService,
			selectedStaff,
			existingBookings,
			staffMembers,
		]
	);

	// Calendar functions
	const getDaysInMonth = (date: Date) => {
		return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
	};

	const getFirstDayOfMonth = (date: Date) => {
		const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
		// Convert Sunday (0) to 7, and shift Monday (1) to 0
		return firstDay === 0 ? 6 : firstDay - 1;
	};

	const goToPreviousMonth = () => {
		setCurrentMonth(
			(prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
		);
	};

	const goToNextMonth = () => {
		setCurrentMonth(
			(prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
		);
	};

	const getMonthName = (date: Date) => {
		return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
	};

	const handleCalendarDateClick = (day: number) => {
		const clickedDate = new Date(
			currentMonth.getFullYear(),
			currentMonth.getMonth(),
			day
		);
		const today = new Date();

		// Only allow clicking on today or future dates
		if (
			clickedDate >=
			new Date(today.getFullYear(), today.getMonth(), today.getDate())
		) {
			// Format date as YYYY-MM-DD without timezone conversion
			const year = clickedDate.getFullYear();
			const month = String(clickedDate.getMonth() + 1).padStart(2, '0');
			const dayStr = String(clickedDate.getDate()).padStart(2, '0');
			const dateString = `${year}-${month}-${dayStr}`;

			logger.log('Date click debug:', {
				clickedDate: clickedDate.toDateString(),
				dayOfWeek: clickedDate.getDay(),
				formattedDate: dateString,
			});

			setSelectedDate(dateString);
		}
	};

	const isDateSelected = (day: number) => {
		const date = new Date(
			currentMonth.getFullYear(),
			currentMonth.getMonth(),
			day
		);
		// Format date as YYYY-MM-DD without timezone conversion
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const dayStr = String(date.getDate()).padStart(2, '0');
		const dateString = `${year}-${month}-${dayStr}`;
		return selectedDate === dateString;
	};

	const isDateToday = (day: number) => {
		const date = new Date(
			currentMonth.getFullYear(),
			currentMonth.getMonth(),
			day
		);
		const today = new Date();
		return date.toDateString() === today.toDateString();
	};

	const isDateDisabled = (day: number) => {
		const date = new Date(
			currentMonth.getFullYear(),
			currentMonth.getMonth(),
			day
		);
		const today = new Date();
		const isPast =
			date < new Date(today.getFullYear(), today.getMonth(), today.getDate());

		// Check if it's a day off
		const dayOfWeek = date.getDay();
		const dayNames: (keyof WorkingHours)[] = [
			'sunday', // 0
			'monday', // 1
			'tuesday', // 2
			'wednesday', // 3
			'thursday', // 4
			'friday', // 5
			'saturday', // 6
		];
		const dayName = dayNames[dayOfWeek];

		const currentWorkingHours = workingHours || salonWorkingHours;
		const isDayOff =
			currentWorkingHours && currentWorkingHours[dayName]?.closed === true;

		return isPast || !!isDayOff;
	};

	// Generate days for Date Pills with lazy loading
	const getAvailableDays = () => {
		const days = [];
		const today = new Date();

		// Map for weekday translations
		const weekdayMap: { [key: number]: string } = {
			0: 'sunday',
			1: 'monday',
			2: 'tuesday',
			3: 'wednesday',
			4: 'thursday',
			5: 'friday',
			6: 'saturday',
		};

		// Map for month translations
		const monthMap: { [key: number]: string } = {
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

		for (let i = 0; i < loadedDaysCount; i++) {
			const date = new Date(today);
			date.setDate(today.getDate() + i);

			// Check if this day is closed
			const dayOfWeek = date.getDay();
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
			const currentWorkingHours = workingHours || salonWorkingHours;
			const isClosed = Boolean(
				currentWorkingHours && currentWorkingHours[dayName]?.closed === true
			);

			const year = date.getFullYear();
			const month = String(date.getMonth() + 1).padStart(2, '0');
			const day = String(date.getDate()).padStart(2, '0');
			const dateString = `${year}-${month}-${day}`;

			// Get translated weekday and month
			const weekdayKey = weekdayMap[dayOfWeek];
			const monthKey = monthMap[date.getMonth()];
			const dayNameTranslated = t(`weekdays.short.${weekdayKey}`) || weekdayKey;
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

	// Load more days when user clicks next arrow
	const loadMoreDays = () => {
		if (isLoadingMoreDays) return; // Prevent multiple calls

		setIsLoadingMoreDays(true);
		setLoadedDaysCount((prev) => prev + LOAD_MORE_DAYS);

		// Reset loading state after a short delay
		setTimeout(() => {
			setIsLoadingMoreDays(false);
		}, 1000);
	};

	// Check scroll position for navigation buttons
	const checkScrollPosition = () => {
		if (timeScrollRef.current) {
			const { scrollLeft, scrollWidth, clientWidth } = timeScrollRef.current;
			setCanScrollLeft(scrollLeft > 0);
			setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
		}
	};

	// Native scroll functions for time slots
	const scrollTimeLeft = () => {
		if (timeScrollRef.current) {
			timeScrollRef.current.scrollBy({
				left: -200,
				behavior: 'smooth',
			});
			// Check position after scroll animation completes
			setTimeout(() => {
				checkScrollPosition();
			}, 300);
		}
	};

	const scrollTimeRight = () => {
		if (timeScrollRef.current) {
			timeScrollRef.current.scrollBy({
				left: 200,
				behavior: 'smooth',
			});
			// Check position after scroll animation completes
			setTimeout(() => {
				checkScrollPosition();
			}, 300);
		}
	};

	// Drag-to-scroll functions for desktop
	const handleMouseDown = (e: React.MouseEvent) => {
		if (!timeScrollRef.current) return;
		setIsDragging(true);
		setHasMoved(false);
		setStartX(e.pageX - timeScrollRef.current.offsetLeft);
		setScrollLeft(timeScrollRef.current.scrollLeft);
		timeScrollRef.current.style.cursor = 'grabbing';
		timeScrollRef.current.style.userSelect = 'none';
	};

	const handleMouseLeave = () => {
		setIsDragging(false);
		setHasMoved(false);
		if (timeScrollRef.current) {
			timeScrollRef.current.style.cursor = 'grab';
			timeScrollRef.current.style.userSelect = 'auto';
		}
	};

	const handleMouseUp = () => {
		setIsDragging(false);
		if (timeScrollRef.current) {
			timeScrollRef.current.style.cursor = 'grab';
			timeScrollRef.current.style.userSelect = 'auto';
		}
		checkScrollPosition();
		// Reset hasMoved after a short delay to allow click events
		setTimeout(() => setHasMoved(false), 100);
	};

	const handleMouseMove = (e: React.MouseEvent) => {
		if (!isDragging || !timeScrollRef.current) return;
		e.preventDefault();
		const x = e.pageX - timeScrollRef.current.offsetLeft;
		const walk = (x - startX) * 2; // Multiply for faster scroll
		timeScrollRef.current.scrollLeft = scrollLeft - walk;

		// Mark as moved if moved more than 5 pixels
		if (Math.abs(walk) > 5) {
			setHasMoved(true);
		}
	};

	// Check scroll position for date navigation buttons
	const checkDateScrollPosition = () => {
		if (dateScrollRef.current) {
			const { scrollLeft, scrollWidth, clientWidth } = dateScrollRef.current;
			setCanScrollDateLeft(scrollLeft > 0);
			setCanScrollDateRight(scrollLeft < scrollWidth - clientWidth - 1);
		}
	};

	// Date scroll functions
	const scrollDateLeft = () => {
		if (dateScrollRef.current) {
			dateScrollRef.current.scrollBy({
				left: -200,
				behavior: 'smooth',
			});
			setTimeout(() => {
				checkDateScrollPosition();
			}, 300);
		}
	};

	const scrollDateRight = () => {
		if (dateScrollRef.current) {
			dateScrollRef.current.scrollBy({
				left: 200,
				behavior: 'smooth',
			});
			setTimeout(() => {
				checkDateScrollPosition();
			}, 300);
		}
	};

	// Drag-to-scroll functions for date scroll
	const handleDateMouseDown = (e: React.MouseEvent) => {
		if (!dateScrollRef.current) return;
		setIsDateDragging(true);
		setDateStartX(e.pageX - dateScrollRef.current.offsetLeft);
		setDateScrollLeft(dateScrollRef.current.scrollLeft);
		dateScrollRef.current.style.cursor = 'grabbing';
		dateScrollRef.current.style.userSelect = 'none';
	};

	const handleDateMouseLeave = () => {
		setIsDateDragging(false);
		if (dateScrollRef.current) {
			dateScrollRef.current.style.cursor = 'grab';
			dateScrollRef.current.style.userSelect = 'auto';
		}
	};

	const handleDateMouseUp = () => {
		setIsDateDragging(false);
		if (dateScrollRef.current) {
			dateScrollRef.current.style.cursor = 'grab';
			dateScrollRef.current.style.userSelect = 'auto';
		}
		checkDateScrollPosition();
	};

	const handleDateMouseMove = (e: React.MouseEvent) => {
		if (!isDateDragging || !dateScrollRef.current) return;
		e.preventDefault();
		const x = e.pageX - dateScrollRef.current.offsetLeft;
		const walk = (x - dateStartX) * 2;
		dateScrollRef.current.scrollLeft = dateScrollLeft - walk;

		// Check if we need to load more days (similar to swiper logic)
		const { scrollLeft, scrollWidth, clientWidth } = dateScrollRef.current;
		if (scrollLeft + clientWidth > scrollWidth - 200 && !isLoadingMoreDays) {
			loadMoreDays();
		}
	};

	// Memoize availability for all time slots to avoid recalculating on every render
	const timeSlotAvailability = useMemo(() => {
		const availabilityMap = new Map<string, boolean>();

		if (!selectedService || bookingsLoadError) {
			// If no service or error, all slots are available
			return availabilityMap;
		}

		// Pre-calculate availability for all time slots
		timeSlots.forEach((slot) => {
			const time = typeof slot === 'string' ? slot : slot.time;
			const cacheKey = `${time}-${selectedStaff || 'any'}-${selectedDate}`;
			if (!availabilityMap.has(cacheKey)) {
				// Calculate availability once and cache it
				const available = isTimeSlotAvailable(time, selectedStaff);
				availabilityMap.set(cacheKey, available);
			}
		});

		return availabilityMap;
	}, [
		timeSlots,
		selectedStaff,
		selectedDate,
		selectedService,
		bookingsLoadError,
		isTimeSlotAvailable,
	]);

	// Filter time slots by time of day
	const filteredTimeSlots = useMemo(() => {
		if (timeFilter === 'all') return timeSlots;

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

	// Pre-fill form data when editing booking
	useEffect(() => {
		if (editingBooking && isOpen && timeSlots.length > 0 && !isInitialized) {
			const bookingDate = new Date(editingBooking.time);
			const timeString = bookingDate.toTimeString().slice(0, 5);

			// Set the selected date in YYYY-MM-DD format
			const year = bookingDate.getFullYear();
			const month = String(bookingDate.getMonth() + 1).padStart(2, '0');
			const day = String(bookingDate.getDate()).padStart(2, '0');
			const dateString = `${year}-${month}-${day}`;
			setSelectedDate(dateString);

			// Set the current month to show the booking date
			setCurrentMonth(
				new Date(bookingDate.getFullYear(), bookingDate.getMonth(), 1)
			);

			// Find the closest available time slot
			const [bookingHour, bookingMinute] = timeString.split(':').map(Number);
			let closestTime = timeSlots[0]?.time || timeSlots[0]; // Default to first available slot

			for (const slot of timeSlots) {
				const slotTime = typeof slot === 'string' ? slot : slot.time;
				const [slotHour, slotMinute] = slotTime.split(':').map(Number);
				const bookingMinutes = bookingHour * 60 + bookingMinute;
				const slotMinutes = slotHour * 60 + slotMinute;

				// If this slot is closer to the booking time, use it
				const closestTimeStr =
					typeof closestTime === 'string' ? closestTime : closestTime.time;
				if (
					Math.abs(slotMinutes - bookingMinutes) <
					Math.abs(
						parseInt(closestTimeStr.split(':')[0]) * 60 +
							parseInt(closestTimeStr.split(':')[1]) -
							bookingMinutes
					)
				) {
					closestTime = slotTime;
				}
			}

			setSelectedTime(
				typeof closestTime === 'string' ? closestTime : closestTime.time
			);

			// Set selected service
			if (editingBooking.service) {
				setSelectedService(editingBooking.service);
			}

			// Set selected staff
			if (editingBooking.staff) {
				setSelectedStaff(editingBooking.staff.name);
			} else {
				setSelectedStaff(t('booking.anyStaff'));
			}

			// Mark as initialized
			setIsInitialized(true);
		}
	}, [editingBooking, isOpen, isInitialized]);

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
			setBookingsLoadError(false);
			setShowLoginModal(false);
			setPendingBookingData(null);
			setBookingSuccess(null);
			setSelectedDate(''); // Reset selected date to trigger auto-selection on next open
			setSelectedTime(''); // Reset selected time
			setTimeFilter('all'); // Reset time filter to show all slots
			setLoadedDaysCount(INITIAL_DAYS); // Reset loaded days count
			setClientEmail(''); // Reset client email
			setClientName(''); // Reset client name
			setClientPhone(''); // Reset client phone
			setSelectedStaff(t('booking.anyStaff') || 'Any Staff Member');
		}
	}, [isOpen, t]);

	// Test date creation function after dates are available
	const testDateCreation = () => {
		try {
			// Test with today's date in YYYY-MM-DD format
			const today = new Date();
			const todayString = today.toISOString().split('T')[0];
			const testDate = createBookingDateTime(todayString, '09:00');
		} catch (error) {
			logger.error('❌ Test date creation failed:', error);
		}
	};

	// Run test when component mounts
	React.useEffect(() => {
		testDateCreation();
	}, []);

	// Add "Any Staff" option to the beginning of staff list
	const allStaffMembers = [
		{
			id: 'any',
			name: t('booking.anyStaff'),
			accessLevel: 'EMPLOYEE' as const,
			salonId: salonId || '', // Добавляем salonId для соответствия типу Staff
		},
		...staffMembers,
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

	// Helper function to create a proper DateTime from date and time selections
	const createBookingDateTime = (dateStr: string, timeStr: string): Date => {
		// Parse the date string (YYYY-MM-DD format)
		const [year, month, day] = dateStr.split('-').map(Number);
		const [hours, minutes] = timeStr.split(':').map(Number);

		if (isNaN(year) || isNaN(month) || isNaN(day)) {
			throw new Error(`Invalid date format: ${dateStr}`);
		}

		if (isNaN(hours) || isNaN(minutes)) {
			throw new Error(`Invalid time format: ${timeStr}`);
		}

		// Create a new Date object using the selected date and time
		// This creates a local date/time
		const bookingDateTime = new Date(
			year,
			month - 1,
			day,
			hours,
			minutes,
			0,
			0
		);

		return bookingDateTime;
	};

	// Helper function to create a UTC DateTime string for API
	const createBookingDateTimeUTC = (
		dateStr: string,
		timeStr: string
	): string => {
		const [year, month, day] = dateStr.split('-').map(Number);
		const [hours, minutes] = timeStr.split(':').map(Number);

		if (isNaN(year) || isNaN(month) || isNaN(day)) {
			throw new Error(`Invalid date format: ${dateStr}`);
		}

		if (isNaN(hours) || isNaN(minutes)) {
			throw new Error(`Invalid time format: ${timeStr}`);
		}

		// Create UTC date string directly to avoid timezone conversion issues
		const utcDateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00.000Z`;

		logger.log('Creating UTC date string:', {
			dateStr,
			timeStr,
			utcDateString,
			localDate: new Date(year, month - 1, day, hours, minutes).toISOString(),
		});

		return utcDateString;
	};

	// Handle magic link sending
	const handleSendMagicLink = async (email: string) => {
		try {
			setLoading(true);
			const API_BASE_URL =
				process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

			// Prepare booking data for magic link
			const bookingData = {
				serviceId: pendingBookingData?.service?.id || selectedService?.id,
				staffId:
					pendingBookingData?.staff === t('booking.anyStaff')
						? undefined
						: staffMembers.find((s) => s.name === pendingBookingData?.staff)
								?.id,
				time: createBookingDateTimeUTC(
					pendingBookingData?.date || selectedDate,
					pendingBookingData?.time || selectedTime
				),
				salonId: currentSalonId,
				clientEmail: email.trim(),
				clientName: '',
				clientPhone: '',
			};

			const response = await fetch(`${API_BASE_URL}/bookings/send-magic-link`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					email: email.trim(),
					bookingData,
				}),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || 'Failed to send magic link');
			}

			setGuestEmail(email.trim());
			setShowMagicLinkSent(true);
			toast.success(t('booking.confirmationEmailSent'));
		} catch (error) {
			logger.error('Error sending magic link:', error);
			toast.error(
				error instanceof Error ? error.message : t('booking.failedToSendEmail')
			);
		} finally {
			setLoading(false);
		}
	};

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

	const handleBooking = async () => {
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

		// Если владелец создает резервацию в своем салоне, проверяем наличие email клиента
		if (isOwner && isOwnerOfThisSalon() && !editingBooking) {
			if (!clientEmail || !clientEmail.trim()) {
				toast.error(t.booking.pleaseEnterClientEmail);
				return;
			}
			// Валидация email
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(clientEmail.trim())) {
				toast.error(t.booking.pleaseEnterValidEmail);
				return;
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

			let bookingDateTime: string;
			try {
				logger.log('🕐 Creating booking date time:', {
					dateToUse,
					timeToUse,
					selectedDate,
					selectedTime,
				});
				bookingDateTime = createBookingDateTimeUTC(dateToUse, timeToUse);
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
					const pendingBooking = localStorage.getItem('pendingBooking');
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
					pendingBooking: localStorage.getItem('pendingBooking'),
				});
				throw new Error('Salon ID is required to create a booking');
			}

			// Если владелец создает резервацию, передаем email клиента
			const requestBody: any = {
				serviceId: serviceToUse.id,
				staffId: staffId === 'any' ? undefined : staffId,
				time: bookingDateTime,
				salonId: finalSalonId,
				notes: `Booking for ${
					serviceToUse
						? getLocalizedServiceName(serviceToUse, language)
						: 'service'
				}`,
			};

			// Если владелец создает резервацию, добавляем данные клиента
			if (isOwner && clientEmail) {
				requestBody.clientEmail = clientEmail.trim();
				if (clientName) {
					requestBody.clientName = clientName.trim();
				}
				if (clientPhone) {
					requestBody.clientPhone = clientPhone.trim();
				}
			}

			logger.log('📤 Sending booking request:', {
				serviceId: requestBody.serviceId,
				salonId: requestBody.salonId,
				time: requestBody.time,
				hasStaffId: !!requestBody.staffId,
				hasClientEmail: !!requestBody.clientEmail,
			});

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
				let errorMessage = 'Failed to create booking';
				if (result.message) {
					errorMessage = result.message;
				} else if (result.error) {
					errorMessage = result.error;
				} else if (Array.isArray(result.message)) {
					// Validation errors from class-validator
					errorMessage = result.message.join(', ');
				} else if (typeof result === 'string') {
					errorMessage = result;
				}

				throw new Error(errorMessage);
			}

			// Clean up localStorage after successful booking
			localStorage.removeItem('pendingBooking');
			setPendingBookingData(null);

			// Show success message in modal
			// If owner created booking, it's always CONFIRMED
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
			});

			// Очищаем поля клиента после успешного создания
			if (isOwner) {
				setClientEmail('');
				setClientName('');
				setClientPhone('');
			}

			// Show toast notification for user feedback (especially after OAuth redirect)
			if (bookingStatus === 'PENDING') {
				toast.success(
					`${t('booking.thankYouForReservation')} ${t('booking.awaitingConfirmation')}`,
					{
						duration: 6000,
						icon: '⏳',
					}
				);
			} else {
				toast.success(t('booking.bookingConfirmedTitle'), {
					duration: 5000,
					icon: '✅',
				});
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
				bookingDateTime = createBookingDateTimeUTC(selectedDate, selectedTime);
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
						notes: `Updated booking for ${
							selectedService
								? getLocalizedServiceName(selectedService, language)
								: 'service'
						}`,
					}),
				}
			);

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || 'Failed to update booking');
			}

			// Show success message
			toast.success('Appointment updated successfully!');
			onClose();

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
			onClose();
		}
	};

	if (!isOpen) return null;

	return (
		<>
			<style>{scrollStyles}</style>
			<div
				className="fixed inset-0 bg-[#F8F5F2CC] bg-opacity-80 sm:flex sm:items-center sm:justify-center z-[999] p-0 sm:p-4"
				onClick={handleClickOutside}
			>
				<div
					className="bg-white sm:rounded-2xl sm:shadow-2xl w-full h-full sm:h-auto sm:max-w-4xl sm:max-h-[90vh] overflow-hidden relative"
					onClick={(e) => e.stopPropagation()}
				>
					{/* Close button */}
					<button
						onClick={onClose}
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
												{t.booking.thankYouForReservation}
											</h2>
											<p className="text-gray-600 text-lg mb-4">
												{t.booking.awaitingConfirmation}
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
														<strong className="font-semibold">
															{t.booking.usuallyConfirmsWithin}
														</strong>
														<p className="mt-1">{t.booking.willReceiveEmail}</p>
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
										onClose();
										window.location.reload();
									}}
									className="w-full bg-[#ff5b5b] text-white py-3 rounded-lg font-semibold text-lg hover:bg-[#e04a4a] transition-colors"
								>
									{t.booking.done}
								</button>
							</div>
						</div>
					) : (
						<div className="flex flex-col sm:flex-row overflow-hidden h-full">
							{/* Left Section - Service Details, Date, and Time Selection */}
							<div className="flex-1 sm:min-w-[500px] p-4 sm:p-8 max-h-[70vh] sm:max-h-[90vh] overflow-y-auto">
								{/* Service Details */}
								<BookingServiceSelector
									selectedService={selectedService}
									services={services}
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
									onLoadMoreDays={loadMoreDays}
									isLoadingMoreDays={isLoadingMoreDays}
									canScrollLeft={canScrollDateLeft}
									canScrollRight={canScrollDateRight}
									onScrollLeft={setCanScrollDateLeft}
									onScrollRight={setCanScrollDateRight}
								/>

								{/* Select Time */}
								{!selectedDate && (
									<div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg mb-4">
										{t.booking.pleaseSelectDateFirst}
									</div>
								)}
								<BookingTimeSelector
									timeSlots={timeSlots.map((slot) => slot.time)}
									filteredTimeSlots={filteredTimeSlots.map((slot) => slot.time)}
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
							<div className="w-full sm:w-80 flex-shrink-0 bg-gray-50 sm:bg-gray-50 p-4 sm:p-8 sm:rounded-r-2xl max-h-[30vh] sm:max-h-[90vh] overflow-y-auto border-t sm:border-t-0">
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

								{/* Book Appointment Button and Close */}
								<BookingFormFooter
									loading={loading}
									editingBooking={editingBooking}
									onBooking={handleBooking}
									onClose={onClose}
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
