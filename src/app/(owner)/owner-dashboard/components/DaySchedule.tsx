'use client';

import { Booking } from '@/types';
import { safeParseDate, formatTimeSafe } from '@/utils/date';

interface DayScheduleProps {
	selectedDate: Date;
	bookings: Booking[];
	onBack: () => void;
	onViewBookingDetails: (booking: Booking) => void;
}

const DATA_WIDTH = '50px';

export default function DaySchedule({
	selectedDate,
	bookings,
	onBack,
	onViewBookingDetails,
}: DayScheduleProps) {
	const getBookingsForDate = (date: Date) => {
		return bookings.filter((booking) => {
			const bookingDate = safeParseDate(booking.time);
			if (!bookingDate) return false;
			return bookingDate.toDateString() === date.toDateString();
		});
	};

	const getStaffMembers = () => {
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

	const getTimeSlots = () => {
		const slots = [];
		for (let hour = 8; hour <= 20; hour++) {
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
		} else if (booking.status === 'CONFIRMED') {
			return {
				className:
					'absolute left-1 right-1 bg-green-50 border border-green-200 rounded-lg p-1 z-10 cursor-pointer hover:bg-green-100 transition-colors',
				textClassName: 'text-green-800',
				textSecondaryClassName: 'text-green-600',
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

	const staffMembers = getStaffMembers();
	const timeSlots = getTimeSlots();

	return (
		<div
			className="mt-6 w-full"
			role="region"
			aria-labelledby="day-schedule-heading"
		>
			<h2 id="day-schedule-heading" className="sr-only">
				Day Schedule
			</h2>

			<div className="rounded-xl border border-[#f1d9d7] bg-white p-6">
				<div className="flex items-center justify-between mb-6">
					<h3 className="text-lg font-semibold text-gray-900">
						{selectedDate.toLocaleDateString('en-US', {
							weekday: 'long',
							month: 'long',
							day: 'numeric',
						})}
					</h3>
					<div className="flex items-center gap-2">
						<button
							onClick={onBack}
							className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#ea4b4b] focus:ring-offset-2"
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
							Back to Month
						</button>
					</div>
				</div>

				<div className="overflow-x-auto">
					<div className="min-w-[800px]">
						<div
							className="sticky top-0 bg-white z-20 border-b border-gray-200 mb-0"
							role="rowgroup"
						>
							<div
								className="grid gap-4 py-3 px-1"
								style={{
									gridTemplateColumns: `${DATA_WIDTH} repeat(${staffMembers.length}, minmax(0, 1fr))`,
								}}
							>
								<div
									className="text-sm font-medium text-gray-500"
									role="columnheader"
								>
									Time
								</div>
								{staffMembers.map((staff) => (
									<div
										key={staff.id}
										className="text-center max-w-[25%] min-w-0"
										role="columnheader"
									>
										<div className="text-sm font-semibold text-gray-900 truncate">
											{staff.name}
										</div>
									</div>
								))}
							</div>
						</div>

						<div className="space-y-0" role="grid">
							{timeSlots.map((timeSlot, index) => (
								<div
									key={timeSlot.time}
									className="grid min-h-[64px] border-b border-gray-200 px-1"
									style={{
										gridTemplateColumns: `${DATA_WIDTH} repeat(${staffMembers.length}, minmax(0, 1fr))`,
									}}
									role="row"
								>
									<div
										className="flex items-center text-sm text-gray-600 h-16 border-r border-dotted border-gray-200 font-medium"
										role="rowheader"
									>
										{timeSlot.time}
									</div>

									{staffMembers.map((staff) => {
										const startingAppointment = getAppointmentStartingAtTime(
											staff.id,
											timeSlot.hour
										);
										const position = getAppointmentPosition(
											startingAppointment,
											timeSlot.hour
										);

										return (
											<div
												key={`${staff.id}-${timeSlot.time}`}
												className="relative h-16 border-r border-dotted border-gray-200 max-w-[25%] min-w-0"
												role="gridcell"
											>
												{startingAppointment && position
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
																		minHeight: '24px',
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
																	{position.duration < 40 ? (
																		<div
																			className={`text-xs ${styles.textClassName} font-medium leading-tight flex gap-2`}
																		>
																			<div
																				className={`truncate ${styles.textSecondaryClassName}`}
																			>
																				{startingAppointment.user?.name ||
																					`Client ID: ${startingAppointment.userId}`}{' '}
																				- {startingAppointment.service?.name}
																			</div>
																		</div>
																	) : (
																		<div className="text-xs leading-tight">
																			<div
																				className={`font-medium ${styles.textClassName} truncate`}
																			>
																				{startingAppointment.service?.name} -{' '}
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
							))}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
