'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Service, Staff, WorkingHours } from '@/types';
import { useStaffBySalon } from '@/hooks/useStaff';
import { useServices } from '@/hooks/useServices';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';

interface BookingModalProps {
	isOpen: boolean;
	onClose: () => void;
	service?: Service;
	showServiceSelector?: boolean; // Новый пропс для показа выпадающего списка услуг
	salonId?: string; // ID салона для загрузки услуг и персонала
	salonName?: string; // Название салона для отображения
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
	editingBooking,
	onBookingUpdated,
}: BookingModalProps) {
	const [selectedDate, setSelectedDate] = useState('');
	const [selectedTime, setSelectedTime] = useState('');
	const [selectedStaff, setSelectedStaff] = useState('Any Staff');
	const [isStaffDropdownOpen, setIsStaffDropdownOpen] = useState(false);
	const [currentDateIndex, setCurrentDateIndex] = useState(0);
	const [salonWorkingHours, setSalonWorkingHours] =
		useState<WorkingHours | null>(null);
	const [loading, setLoading] = useState(false);
	const [selectedService, setSelectedService] = useState<Service | null>(null);
	const [isServiceDropdownOpen, setIsServiceDropdownOpen] = useState(false);
	const [showLoginModal, setShowLoginModal] = useState(false);
	const [loginData, setLoginData] = useState({ email: '', password: '' });
	const [isLoggingIn, setIsLoggingIn] = useState(false);
	const [isInitialized, setIsInitialized] = useState(false);
	const [currentMonth, setCurrentMonth] = useState(new Date());

	// Используем Zustand store для аутентификации
	const { user, isClient, login, refreshUser } = useAuthStore();

	// Используем переданный salonId
	const currentSalonId = salonId;

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

	// Initialize selected service
	useEffect(() => {
		if (service) {
			setSelectedService(service);
		} else if (showServiceSelector && services.length > 0) {
			// Если показываем селектор услуг и есть услуги, выбираем первую
			setSelectedService(services[0]);
		}
	}, [service, showServiceSelector, services]);

	// Функция для проверки авторизации клиента
	const checkClientAuth = () => {
		return isClient;
	};

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoggingIn(true);

		try {
			const result = await login(loginData.email, loginData.password);

			if (!result.success) {
				throw new Error(result.error || 'Login failed');
			}

			setShowLoginModal(false);
			setLoginData({ email: '', password: '' });

			// После успешного логина продолжаем с созданием резервации
			await createBooking();
		} catch (error: unknown) {
			toast.error(error instanceof Error ? error.message : 'Login failed');
		} finally {
			setIsLoggingIn(false);
		}
	};

	const fetchSalonData = async () => {
		try {
			const API_BASE_URL =
				process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
			const {
				data: { session },
			} = await supabase.auth.getSession();

			if (!session?.access_token) {
				console.warn('No session found for fetching salon data');
				return;
			}

			const response = await fetch(`${API_BASE_URL}/salons/current`, {
				headers: {
					Authorization: `Bearer ${session.access_token}`,
				},
			});

			if (!response.ok) {
				console.warn('Could not fetch salon data, using defaults');
				return;
			}

			const data = await response.json();
			if (data && data.workingHours) {
				setSalonWorkingHours(data.workingHours);
			}
		} catch (error) {
			console.error('Error fetching salon data:', error);
		}
	};

	// Generate time slots based on salon working hours
	const generateTimeSlots = () => {
		const slots = [];

		// Get today's day of week (0 = Sunday, 1 = Monday, etc.)
		const today = new Date();
		const dayOfWeek = today.getDay();
		const dayNames: (keyof WorkingHours)[] = [
			'sunday',
			'monday',
			'tuesday',
			'wednesday',
			'thursday',
			'friday',
			'saturday',
		];
		const todayName = dayNames[dayOfWeek];

		// Default hours if no working hours are set
		let startHour = 9;
		let endHour = 18;

		// Get working hours for today if available
		if (
			salonWorkingHours &&
			salonWorkingHours[todayName] &&
			!salonWorkingHours[todayName].closed
		) {
			const openTime = salonWorkingHours[todayName].open;
			const closeTime = salonWorkingHours[todayName].close;

			// Parse time strings (assuming 24-hour format like "09:00")
			if (openTime && closeTime) {
				startHour = parseInt(openTime.split(':')[0]);
				endHour = parseInt(closeTime.split(':')[0]);
			}
		}

		// Generate time slots in 24-hour format (every 15 minutes)
		for (let hour = startHour; hour < endHour; hour++) {
			slots.push(`${hour.toString().padStart(2, '0')}:00`);
			slots.push(`${hour.toString().padStart(2, '0')}:15`);
			slots.push(`${hour.toString().padStart(2, '0')}:30`);
			slots.push(`${hour.toString().padStart(2, '0')}:45`);
		}
		return slots;
	};

	// Generate dates dynamically for 2 months ahead
	const generateDates = () => {
		const dates = [];
		const today = new Date();
		const twoMonthsFromNow = new Date(today);
		twoMonthsFromNow.setMonth(today.getMonth() + 2);

		for (let i = 0; i < 60; i++) {
			// 60 days = ~2 months
			const date = new Date(today);
			date.setDate(today.getDate() + i);
			const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
			const dayNumber = date.getDate();
			const monthName = date.toLocaleDateString('en-US', { month: 'short' });
			dates.push({
				display: `${dayName} ${dayNumber}`,
				full: `${dayName} ${dayNumber} ${monthName}`,
				date: new Date(date),
				isToday: date.toDateString() === today.toDateString(),
			});
		}
		return dates;
	};

	const dates = useMemo(() => generateDates(), []);
	const timeSlots = useMemo(() => generateTimeSlots(), [salonWorkingHours]);

	// Calendar functions
	const getDaysInMonth = (date: Date) => {
		return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
	};

	const getFirstDayOfMonth = (date: Date) => {
		return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
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
			const dateString = clickedDate.toISOString().split('T')[0];
			setSelectedDate(dateString);
		}
	};

	const isDateSelected = (day: number) => {
		const date = new Date(
			currentMonth.getFullYear(),
			currentMonth.getMonth(),
			day
		);
		const dateString = date.toISOString().split('T')[0];
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
		return (
			date < new Date(today.getFullYear(), today.getMonth(), today.getDate())
		);
	};

	// Pre-fill form data when editing booking
	useEffect(() => {
		if (editingBooking && isOpen && timeSlots.length > 0 && !isInitialized) {
			const bookingDate = new Date(editingBooking.time);
			const timeString = bookingDate.toTimeString().slice(0, 5);

			// Set the selected date in YYYY-MM-DD format
			const dateString = bookingDate.toISOString().split('T')[0];
			setSelectedDate(dateString);

			// Set the current month to show the booking date
			setCurrentMonth(
				new Date(bookingDate.getFullYear(), bookingDate.getMonth(), 1)
			);

			// Find the closest available time slot
			const [bookingHour, bookingMinute] = timeString.split(':').map(Number);
			let closestTime = timeSlots[0]; // Default to first available slot

			for (const slot of timeSlots) {
				const [slotHour, slotMinute] = slot.split(':').map(Number);
				const bookingMinutes = bookingHour * 60 + bookingMinute;
				const slotMinutes = slotHour * 60 + slotMinute;

				// If this slot is closer to the booking time, use it
				if (
					Math.abs(slotMinutes - bookingMinutes) <
					Math.abs(
						parseInt(closestTime.split(':')[0]) * 60 +
							parseInt(closestTime.split(':')[1]) -
							bookingMinutes
					)
				) {
					closestTime = slot;
				}
			}

			setSelectedTime(closestTime);

			// Set selected service
			if (editingBooking.service) {
				setSelectedService(editingBooking.service);
			}

			// Set selected staff
			if (editingBooking.staff) {
				setSelectedStaff(editingBooking.staff.name);
			} else {
				setSelectedStaff('Any Staff');
			}

			// Mark as initialized
			setIsInitialized(true);
		}
	}, [editingBooking, isOpen, isInitialized]);

	// Reset initialization flag when modal closes
	useEffect(() => {
		if (!isOpen) {
			setIsInitialized(false);
		}
	}, [isOpen]);

	// Test date creation function after dates are available
	const testDateCreation = () => {
		try {
			// Test with first available date
			const firstDate = dates[0];
			if (firstDate) {
				const testDate = createBookingDateTime(firstDate.display, '09:00');
			}
		} catch (error) {
			console.error('❌ Test date creation failed:', error);
		}
	};

	// Run test when component mounts and dates are available
	React.useEffect(() => {
		if (dates.length > 0) {
			testDateCreation();
		}
	}, [dates]);

	// Add "Any Staff" option to the beginning of staff list
	const allStaffMembers = [
		{ id: 'any', name: 'Any Staff', accessLevel: 'EMPLOYEE' as const },
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
			const todayString = today.toISOString().split('T')[0];
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

	const handleBooking = async () => {
		if (!selectedService || !selectedDate || !selectedTime) {
			toast.error('Please fill in all fields');
			return;
		}

		// If editing existing booking, skip client auth check (owner can edit)
		if (!editingBooking) {
			// Проверяем авторизацию клиента только для новых бронирований
			if (!checkClientAuth()) {
				// Показываем модальное окно логина
				setShowLoginModal(true);
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

	const createBooking = async () => {
		setLoading(true);

		try {
			// Проверяем, что пользователь авторизован
			if (!user) {
				throw new Error('User not authenticated');
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

			// Create booking with user data
			const API_BASE_URL =
				process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

			let bookingDateTime: string;
			try {
				const dateTime = createBookingDateTime(selectedDate, selectedTime);
				bookingDateTime = dateTime.toISOString();
			} catch (dateError) {
				console.error('❌ Error creating booking date time:', dateError);
				throw new Error(
					`Invalid date/time selection: ${dateError instanceof Error ? dateError.message : 'Unknown error'}`
				);
			}

			const response = await fetch(`${API_BASE_URL}/bookings`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${session.access_token}`,
				},
				body: JSON.stringify({
					serviceId: selectedService?.id,
					staffId: staffId === 'any' ? undefined : staffId,
					time: bookingDateTime,
					salonId: currentSalonId,
					notes: `Booking for ${selectedService?.name}`,
				}),
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || 'Failed to create booking');
			}

			// Show success message
			toast.success('Appointment booked successfully!');
			onClose();

			// Refresh the page to show updated bookings
			window.location.reload();
		} catch (error: unknown) {
			console.error('Booking error:', error);
			toast.error(
				error instanceof Error ? error.message : 'Failed to book appointment'
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
				const dateTime = createBookingDateTime(selectedDate, selectedTime);
				bookingDateTime = dateTime.toISOString();
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
						notes: `Updated booking for ${selectedService?.name}`,
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

	// Close dropdown when clicking outside
	const handleClickOutside = (e: React.MouseEvent) => {
		const target = e.target as HTMLElement;

		// Close staff dropdown if clicking outside
		if (isStaffDropdownOpen && !target.closest('.staff-dropdown')) {
			setIsStaffDropdownOpen(false);
		}

		// Close modal if clicking on the backdrop
		if (target.classList.contains('fixed')) {
			onClose();
		}
	};

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 bg-[#F8F5F2CC] bg-opacity-80 flex items-center justify-center z-[999] p-4"
			onClick={handleClickOutside}
		>
			<div
				className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden relative"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Close button */}
				<button
					onClick={onClose}
					className="absolute top-4 right-4 z-10 p-2 hover:bg-gray-100 rounded-full transition-colors"
				>
					<svg
						className="w-6 h-6 text-gray-500 hover:text-gray-700"
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
				<div className="flex overflow-x-auto">
					{/* Left Section - Service Details, Date, and Time Selection */}
					<div className="flex-1 min-w-[500px] p-8 max-h-[90vh] overflow-y-auto">
						{/* Service Details */}
						<div className="mb-8">
							{showServiceSelector ? (
								<div>
									{/* Service Selector Dropdown */}
									<div className="relative mb-4">
										<button
											type="button"
											onClick={() =>
												setIsServiceDropdownOpen(!isServiceDropdownOpen)
											}
											className="w-full flex items-center justify-between p-4 border border-gray-300 rounded-lg bg-white text-left focus:outline-none focus:ring-2 focus:ring-[#ea4b4b] focus:border-transparent"
										>
											<div>
												<div className="text-lg font-semibold text-gray-900">
													{selectedService?.name || 'Select a service'}
												</div>
												<div className="text-sm text-gray-600">
													{selectedService?.description ||
														'Choose from available services'}
												</div>
											</div>
											<span className="text-gray-400">
												{isServiceDropdownOpen ? '▲' : '▼'}
											</span>
										</button>

										{isServiceDropdownOpen && (
											<div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
												{services.map((serviceOption) => (
													<button
														key={serviceOption.id}
														type="button"
														onClick={() => {
															setSelectedService(serviceOption);
															setIsServiceDropdownOpen(false);
														}}
														className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
													>
														<div className="font-medium text-gray-900">
															{serviceOption.name}
														</div>
														<div className="text-sm text-gray-600">
															{serviceOption.description}
														</div>
														<div className="text-sm text-gray-500 mt-1">
															{serviceOption.duration} min • $
															{serviceOption.price}
														</div>
													</button>
												))}
											</div>
										)}
									</div>

									{/* Service Details */}
									{selectedService && (
										<div className="flex items-center gap-6">
											<div className="flex items-center gap-2">
												<span className="text-gray-500">🕒</span>
												<span className="text-sm text-gray-600">
													{selectedService.duration} min
												</span>
											</div>
											<div className="flex items-center gap-2">
												<span className="text-lg font-bold text-[#8B4513]">
													${selectedService.price}
												</span>
											</div>
										</div>
									)}
								</div>
							) : (
								<div>
									<h2 className="text-2xl font-bold text-gray-900 mb-2">
										{selectedService?.name || 'Select a service'}
									</h2>
									<p className="text-gray-700 mb-4">
										{selectedService?.description ||
											'Please select a service to book'}
									</p>
									<div className="flex items-center gap-6">
										<div className="flex items-center gap-2">
											<span className="text-gray-500">🕒</span>
											<span className="text-sm text-gray-600">
												{selectedService?.duration
													? `${selectedService.duration} min`
													: 'Duration'}
											</span>
										</div>
										<div className="flex items-center gap-2">
											<span className="text-lg font-bold text-[#8B4513]">
												{selectedService?.price
													? `$${selectedService.price}`
													: 'Price'}
											</span>
										</div>
									</div>
								</div>
							)}
						</div>

						{/* Select Date */}
						<div className="mb-8">
							<h3 className="text-lg font-bold text-gray-900 mb-4">
								Select Date
							</h3>
							<div className="bg-white border border-gray-200 rounded-lg p-4">
								{/* Calendar Header */}
								<div className="flex items-center justify-between mb-4">
									<h4 className="text-lg font-semibold text-gray-900">
										{getMonthName(currentMonth)}
									</h4>
									<div className="flex items-center gap-2">
										<button
											onClick={goToPreviousMonth}
											className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
										>
											<svg
												className="w-5 h-5 text-gray-700"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M15 19l-7-7 7-7"
												/>
											</svg>
										</button>
										<button
											onClick={goToNextMonth}
											className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
										>
											<svg
												className="w-5 h-5 text-gray-700"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M9 5l7 7-7 7"
												/>
											</svg>
										</button>
									</div>
								</div>

								{/* Calendar Grid */}
								<div className="grid grid-cols-7 gap-1 mb-2">
									{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(
										(day) => (
											<div
												key={day}
												className="text-center text-sm font-medium text-gray-500 py-2"
											>
												{day}
											</div>
										)
									)}
								</div>

								<div className="grid grid-cols-7 gap-1">
									{/* Empty cells for days before the first day of the month */}
									{Array.from({ length: getFirstDayOfMonth(currentMonth) }).map(
										(_, index) => (
											<div key={`empty-${index}`} className="h-10"></div>
										)
									)}

									{/* Days of the month */}
									{Array.from(
										{ length: getDaysInMonth(currentMonth) },
										(_, index) => {
											const day = index + 1;
											const isSelected = isDateSelected(day);
											const isToday = isDateToday(day);
											const isDisabled = isDateDisabled(day);

											return (
												<button
													key={day}
													onClick={() => handleCalendarDateClick(day)}
													disabled={isDisabled}
													className={`h-10 rounded-lg text-sm font-medium transition-colors ${
														isSelected
															? 'bg-[#ff5b5b] text-white'
															: isToday
																? 'bg-white text-gray-900 border-2 border-[#ff5b5b]'
																: isDisabled
																	? 'text-gray-300 cursor-not-allowed'
																	: 'text-gray-900 hover:bg-gray-100'
													}`}
												>
													{day}
												</button>
											);
										}
									)}
								</div>
							</div>
						</div>

						{/* Select Time */}
						<div className="mb-8">
							<h3 className="text-lg font-bold text-gray-900 mb-4">
								Select a Time
							</h3>
							<div className="overflow-x-auto">
								<div
									className="flex gap-3 pb-2"
									style={{ minWidth: 'max-content' }}
								>
									{timeSlots.map((time) => (
										<button
											key={time}
											onClick={() => setSelectedTime(time)}
											className={`flex-shrink-0 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
												selectedTime === time
													? 'bg-[#ff5b5b] text-white'
													: 'bg-white text-gray-900 border border-gray-200 hover:bg-gray-50'
											}`}
										>
											{time}
										</button>
									))}
								</div>
							</div>
						</div>
					</div>

					{/* Right Section - Staff Selection and Booking Button */}
					<div className="w-80 flex-shrink-0 bg-gray-50 p-8 rounded-r-2xl max-h-[90vh] overflow-y-auto">
						{/* Select Staff Member */}
						<div className="mb-8">
							<h3 className="text-lg font-bold text-gray-900 mb-4">
								Select a Staff Member
							</h3>
							<div className="relative staff-dropdown">
								<button
									onClick={() => setIsStaffDropdownOpen(!isStaffDropdownOpen)}
									className="w-full p-4 rounded-lg text-left bg-white border border-gray-200 hover:bg-gray-50 transition-colors flex items-center justify-between"
								>
									<div className="flex items-center gap-3">
										<div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
											<span className="text-lg">
												{selectedStaff === 'Any Staff' ? '👥' : '👤'}
											</span>
										</div>
										<span className="font-medium text-gray-900">
											{selectedStaff}
										</span>
									</div>
									<svg
										className={`w-5 h-5 text-gray-400 transition-transform ${
											isStaffDropdownOpen ? 'rotate-180' : ''
										}`}
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M19 9l-7 7-7-7"
										/>
									</svg>
								</button>

								{isStaffDropdownOpen && (
									<div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
										{allStaffMembers.map((staff) => (
											<button
												key={staff.id}
												onClick={() => {
													setSelectedStaff(staff.name);
													setIsStaffDropdownOpen(false);
												}}
												className="w-full p-4 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 first:rounded-t-lg last:rounded-b-lg"
											>
												<div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
													<span className="text-lg">
														{staff.id === 'any' ? '👥' : '👤'}
													</span>
												</div>
												<span className="font-medium text-gray-900">
													{staff.name}
												</span>
											</button>
										))}
									</div>
								)}
							</div>
						</div>

						{/* Book Appointment Button */}
						<button
							onClick={handleBooking}
							disabled={loading}
							className="w-full bg-[#ff5b5b] text-white py-4 rounded-lg font-semibold text-lg hover:bg-[#e04a4a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{loading
								? editingBooking
									? 'Updating...'
									: 'Booking...'
								: editingBooking
									? 'Update Appointment'
									: 'Book Appointment'}
						</button>

						{/* Close Button */}
						<button
							onClick={onClose}
							className="w-full mt-4 text-gray-500 hover:text-gray-700 font-medium"
						>
							Cancel
						</button>
					</div>
				</div>
			</div>

			{/* Login Modal */}
			{showLoginModal && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
						<h3 className="text-xl font-bold text-gray-900 mb-4">
							Client Login Required
						</h3>
						<p className="text-gray-600 mb-6">
							Please log in with your client account to book an appointment.
						</p>

						<form onSubmit={handleLogin} className="space-y-4">
							<div>
								<label
									htmlFor="email"
									className="block text-sm font-medium text-gray-700 mb-1"
								>
									Email
								</label>
								<input
									type="email"
									id="email"
									value={loginData.email}
									onChange={(e) =>
										setLoginData({ ...loginData, email: e.target.value })
									}
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ea4b4b] focus:border-transparent"
									required
								/>
							</div>

							<div>
								<label
									htmlFor="password"
									className="block text-sm font-medium text-gray-700 mb-1"
								>
									Password
								</label>
								<input
									type="password"
									id="password"
									value={loginData.password}
									onChange={(e) =>
										setLoginData({ ...loginData, password: e.target.value })
									}
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ea4b4b] focus:border-transparent"
									required
								/>
							</div>

							<div className="flex gap-3 pt-4">
								<button
									type="submit"
									disabled={isLoggingIn}
									className="flex-1 bg-[#ea4b4b] text-white py-2 px-4 rounded-lg font-medium hover:bg-[#d73a3a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{isLoggingIn ? 'Logging in...' : 'Login'}
								</button>

								<button
									type="button"
									onClick={() => setShowLoginModal(false)}
									className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors"
								>
									Cancel
								</button>
							</div>
						</form>

						<div className="mt-4 text-center">
							<p className="text-sm text-gray-600">
								Don't have an account?{' '}
								<a
									href="/client/register"
									className="text-[#ea4b4b] hover:underline"
								>
									Register here
								</a>
							</p>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
