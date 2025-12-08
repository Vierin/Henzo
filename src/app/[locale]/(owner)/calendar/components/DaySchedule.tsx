'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Booking, TimeBlock, Staff } from '@/types';
import { safeParseDate, formatTimeSafe } from '@/utils/date';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';

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
}: DayScheduleProps) {
	const t = useTranslation();
	const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [startX, setStartX] = useState(0);
	const [scrollLeft, setScrollLeft] = useState(0);
	const [isMobile, setIsMobile] = useState(false);
	
	const monthNames = [
		'january', 'february', 'march', 'april', 'may', 'june',
		'july', 'august', 'september', 'october', 'november', 'december'
	];
	
	const weekdayNames = [
		'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
	];
	
	const formatDateForDisplay = (date: Date) => {
		const dayOfWeek = date.getDay();
		const monthIndex = date.getMonth();
		const day = date.getDate();
		const weekdayName = t(`weekdays.${weekdayNames[dayOfWeek]}`);
		const monthName = t(`months.short.${monthNames[monthIndex]}`);
		return `${weekdayName}, ${monthName} ${day}`;
	};

	useEffect(() => {
		const checkMobile = () => {
			setIsMobile(window.innerWidth < 640);
		};

		checkMobile();
		window.addEventListener('resize', checkMobile);
		return () => window.removeEventListener('resize', checkMobile);
	}, []);

	const getBookingsForDate = (date: Date) => {
		return bookings.filter((booking) => {
			const bookingDate = safeParseDate(booking.time);
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

	// Получаем всех работников: используем переданный список или извлекаем из резерваций
	const getStaffMembers = () => {
		// Если передан список всех работников, используем его
		if (providedStaffMembers && providedStaffMembers.length > 0) {
			return providedStaffMembers.map((staff) => ({
				id: staff.id,
				name: staff.name,
				role: 'Staff Member',
			}));
		}

		// Fallback: извлекаем из резерваций (для обратной совместимости)
		const staffSet = new Set();
		bookings.forEach((booking) => {
			if (booking.staff) {
				staffSet.add(
					JSON.stringify({
						id: booking.staff.id,
						name: booking.staff.name,
						role: 'Staff Member',
					})
				);
			}
		});
		const staffMembers = Array.from(staffSet).map((staff) =>
			JSON.parse(staff as string)
		);
		return staffMembers;
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

			const bookingTime = safeParseDate(booking.time);
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
		const bookingTime = safeParseDate(booking.time);
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
					'absolute left-1 right-1 bg-blue-50 border border-blue-200 rounded-lg p-1 z-10 cursor-pointer hover:bg-blue-100 transition-colors dark:bg-blue-50 dark:border-blue-200 dark:hover:bg-blue-100',
				textClassName: 'text-blue-800 dark:text-blue-800',
				textSecondaryClassName: 'text-blue-600 dark:text-blue-600',
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
		const bookingTime = safeParseDate(booking.time);
		if (!bookingTime) return false;

		const serviceDuration = booking.service?.duration || 60;
		const endTime = new Date(bookingTime.getTime() + serviceDuration * 60000);
		return endTime >= now;
	};

	const allStaffMembers = getStaffMembers();
	const timeSlots = getTimeSlots();

	// Filtered staff members based on selection
	const staffMembers = useMemo(() => {
		if (selectedStaffIds.length === 0) {
			return allStaffMembers;
		}
		return allStaffMembers.filter((staff) =>
			selectedStaffIds.includes(staff.id)
		);
	}, [allStaffMembers, selectedStaffIds]);

	// Toggle staff selection
	const toggleStaffSelection = (staffId: string) => {
		setSelectedStaffIds((prev) => {
			if (prev.includes(staffId)) {
				return prev.filter((id) => id !== staffId);
			} else {
				return [...prev, staffId];
			}
		});
	};

	// Clear all filters
	const clearAllFilters = () => {
		setSelectedStaffIds([]);
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
			className="mt-4 md:mt-6 w-full"
			role="region"
			aria-labelledby="day-schedule-heading"
		>
			<h2 id="day-schedule-heading" className="sr-only">
				Day Schedule
			</h2>

			<div className="rounded-xl border border-[#f1d9d7] bg-white p-3 md:p-6 dark:bg-gray-800 dark:border-gray-700">
				{/* Header */}
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 dark:bg-gray-900 dark:text-white p-3 rounded-lg -m-3 md:-m-6 md:p-6">
					<div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3">
						<div className="flex items-center gap-1">
							<button
								onClick={onPrevDay}
								className="p-1.5 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-[#ea4b4b] focus:ring-offset-2 dark:text-gray-300 dark:bg-gray-800 dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:text-white"
								aria-label="Previous day"
								disabled={!onPrevDay}
							>
								<ChevronLeft className="w-4 h-4" />
							</button>
							<button
								onClick={onNextDay}
								className="p-1.5 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-[#ea4b4b] focus:ring-offset-2 dark:text-gray-300 dark:bg-gray-800 dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:text-white"
								aria-label="Next day"
								disabled={!onNextDay}
							>
								<ChevronRight className="w-4 h-4" />
							</button>
						</div>
						<h3 className="text-base md:text-lg font-semibold text-gray-900 text-center sm:text-left flex-1 dark:text-white">
							{formatDateForDisplay(selectedDate)}
						</h3>
					</div>
					<div className="flex items-center justify-center sm:justify-end">
						<button
							onClick={onBack}
							className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#ea4b4b] focus:ring-offset-2 dark:text-gray-200 dark:bg-gray-800 dark:border-gray-600 dark:hover:bg-gray-700"
							aria-label="Back to month view"
						>
							<svg
								className="w-4 h-4"
								fill="currentColor"
								viewBox="0 0 20 20"
								aria-hidden="true"
							>
								<path
									fillRule="evenodd"
									d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
									clipRule="evenodd"
								/>
							</svg>
							<span className="hidden sm:inline">Back to Month</span>
							<span className="sm:hidden">Back</span>
						</button>
					</div>
				</div>

				{/* Staff Filter Pills */}
				{allStaffMembers.length > 0 && (
					<div className="mb-4 md:mb-6">
						<div className="mb-2">
							<span className="text-xs md:text-sm font-medium text-gray-600">
								Filter by staff:
							</span>
						</div>
						<div className="flex flex-wrap gap-2">
							{allStaffMembers.map((staff) => {
								const isSelected =
									selectedStaffIds.length === 0 ||
									selectedStaffIds.includes(staff.id);
								return (
									<button
										key={staff.id}
										onClick={() => toggleStaffSelection(staff.id)}
										className={`inline-flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 rounded-full text-xs md:text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-[#ea4b4b] focus:ring-offset-2 ${
											isSelected
												? 'bg-[#ff5b5b] text-white hover:bg-[#e04a4a]'
												: 'bg-gray-100 text-gray-600 hover:bg-gray-200'
										}`}
									>
										<span className="truncate max-w-[80px] md:max-w-none">
											{staff.name}
										</span>
										{isSelected && selectedStaffIds.length > 0 && (
											<X className="w-3 h-3 md:w-3.5 md:h-3.5 flex-shrink-0" />
										)}
									</button>
								);
							})}
							{selectedStaffIds.length > 0 && (
								<button
									onClick={clearAllFilters}
									className="text-xs md:text-sm text-gray-500 hover:text-gray-700 underline"
								>
									Clear all
								</button>
							)}
						</div>
					</div>
				)}

				{/* Check if selected day is closed */}
				{isSelectedDayClosed() ? (
					<div className="flex items-center justify-center py-12 bg-gray-50 rounded-lg border border-gray-200">
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
								{t('owner.calendar.closed')} {t(`weekdays.${weekdayNames[selectedDate.getDay()]}`)}.
							</p>
						</div>
					</div>
				) : (
					<div className="flex">
						{/* Left sticky column - Time labels and header */}
						<div
							className="flex-shrink-0 sticky left-0 z-20 bg-white border-r border-gray-200"
							style={{ width: '45px' }}
						>
							{/* Time header */}
							<div className="border-b border-gray-200 bg-white">
								<div className="py-2 md:py-3 px-1 md:px-2 text-xs md:text-sm font-medium text-gray-500 text-center">
									Time
								</div>
							</div>
							{/* Time cells */}
							{timeSlots.map((timeSlot) => (
								<div
									key={`time-${timeSlot.time}`}
									className="flex items-center justify-center text-xs md:text-sm text-gray-600 h-12 md:h-16 border-b border-gray-200 font-medium bg-white"
								>
									{timeSlot.displayTime.replace(':00', '')}
								</div>
							))}
						</div>

						{/* Right scrollable area - Staff columns with headers */}
						<div
							ref={scrollContainerRef}
							className="flex-1 overflow-x-auto cursor-grab"
							onMouseDown={handleMouseDown}
							onMouseMove={handleMouseMove}
							onMouseUp={handleMouseUp}
							onMouseLeave={handleMouseLeave}
							style={{
								WebkitOverflowScrolling: 'touch' /* iOS smooth scrolling */,
							}}
						>
							<div
								className="flex flex-col"
								style={{
									minWidth: `${staffMembers.length * (isMobile ? 120 : 150)}px`,
								}}
							>
								{/* Staff headers row */}
								<div className="flex border-b border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700">
									{staffMembers.map((staff) => {
										const colWidth = isMobile ? 120 : 150;
										return (
											<div
												key={staff.id}
												className="flex-shrink-0 py-2 md:py-3 px-2 md:px-4 text-center border-r border-gray-200 dark:border-gray-700"
												style={{ width: `${colWidth}px` }}
											>
												<div className="text-xs md:text-sm font-semibold text-gray-900 dark:text-white truncate">
													{staff.name}
												</div>
											</div>
										);
									})}
								</div>

								{/* Staff columns grid */}
								<div className="flex">
									{staffMembers.map((staff) => {
										const colWidth = isMobile ? 120 : 150;
										return (
											<div
												key={`staff-${staff.id}`}
												className="flex-shrink-0"
												style={{ width: `${colWidth}px` }}
											>
												{timeSlots.map((timeSlot) => {
													const startingAppointment =
														getAppointmentStartingAtTime(
															staff.id,
															timeSlot.hour
														);
													const position = getAppointmentPosition(
														startingAppointment,
														timeSlot.hour
													);
													const timeBlock = getTimeBlockAtTime(
														staff.id,
														timeSlot.hour
													);

													return (
														<div
															key={`${staff.id}-${timeSlot.time}`}
															className={`relative h-12 md:h-16 border-b border-r border-gray-200 ${
																timeBlock ? 'bg-gray-100' : ''
															}`}
														>
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
																			getBookingBlockStyles(
																				startingAppointment
																			);
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
																				aria-label={`View details for appointment: ${startingAppointment.service?.name} with ${startingAppointment.user?.name || `Client ID: ${startingAppointment.userId}`} at ${formatTimeSafe(startingAppointment.time)}`}
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
																							{
																								startingAppointment.service
																									?.name
																							}{' '}
																							-{' '}
																							{startingAppointment.user?.name ||
																								`Client ID: ${startingAppointment.userId}`}
																						</div>
																						<div
																							className={`${styles.textSecondaryClassName} truncate`}
																						>
																							{formatTimeSafe(
																								startingAppointment.time
																							)}{' '}
																							-{' '}
																							{formatTimeSafe(
																								new Date(
																									new Date(
																										startingAppointment.time
																									).getTime() +
																										position.duration * 60000
																								).toISOString()
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
										);
									})}
								</div>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
