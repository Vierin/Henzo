'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
	X,
	AlertCircle,
	Clock,
	Calendar as CalendarIcon,
	User,
} from 'lucide-react';
import { format } from 'date-fns';
import { useStaffBySalon } from '@/hooks/useStaff';
import { useSalonId } from '@/hooks/useSalons';
import { useServices } from '@/hooks/useServices';
import type { Staff } from '@/types';
import type { ServiceResponseDto } from '@/types/dto/service.dto';
import { WorkingHours } from '@/types';
import {
	useCreateTimeBlock,
	useCheckTimeBlockConflicts,
} from '@/hooks/useTimeBlocks';
import { CreateTimeBlockDto } from '@/types/dto/time-block.dto';
import LoadingSpinner from './LoadingSpinner';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TimePicker } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import 'antd/dist/reset.css';
import { useTranslation, useLanguage } from '@/contexts/LanguageContext';
import { extractLocaleFromPath } from '@/i18n/routing';
import { usePathname } from 'next/navigation';
import { parseBookingTimeAsLocal } from '@/utils/date';
import { ru, vi, enUS } from 'date-fns/locale';
import {
	ru as ruDayPicker,
	vi as viDayPicker,
	enUS as enUSDayPicker,
} from 'date-fns/locale';

/** Same rules as booking: staff.Service empty = all services; service.Staff empty = all staff. */
function staffCanTakeServiceForTransfer(
	staffMember: Staff,
	serviceId: string,
	salonServices: ServiceResponseDto[],
): boolean {
	const svc = salonServices.find((s) => s.id === serviceId);
	if (!svc) return false;

	const staffServices = staffMember.Service || [];
	if (
		staffServices.length > 0 &&
		!staffServices.some((s) => s.id === serviceId)
	) {
		return false;
	}

	const allowedOnService = svc.Staff || [];
	if (
		allowedOnService.length > 0 &&
		!allowedOnService.some((s) => s.id === staffMember.id)
	) {
		return false;
	}
	return true;
}

interface BlockTimeModalProps {
	isOpen: boolean;
	onClose: () => void;
	preselectedStaffId?: string;
	preselectedDate?: Date;
	preselectedStartTime?: string;
	preselectedEndTime?: string;
}

export default function BlockTimeModal({
	isOpen,
	onClose,
	preselectedStaffId,
	preselectedDate,
	preselectedStartTime,
	preselectedEndTime,
}: BlockTimeModalProps) {
	const t = useTranslation();
	const { language } = useLanguage();
	const pathname = usePathname();
	const currentLocale = extractLocaleFromPath(pathname) ?? language ?? 'en';
	const { salonId, salon: salonData } = useSalonId();

	// Get date-fns locale for formatting
	const getDateLocale = () => {
		switch (currentLocale) {
			case 'ru':
				return ru;
			case 'vi':
				return vi;
			default:
				return enUS;
		}
	};

	// Get react-day-picker locale
	const getCalendarLocale = () => {
		switch (currentLocale) {
			case 'ru':
				return ruDayPicker;
			case 'vi':
				return viDayPicker;
			default:
				return enUSDayPicker;
		}
	};
	const { data: staff = [], isLoading: staffLoading } = useStaffBySalon(
		salonId || ''
	);
	const { data: salonServices = [] } = useServices(salonId || '', {});

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

	const formatDateForDisplay = (dateStr: string) => {
		const date = new Date(dateStr);
		const dayOfWeek = date.getDay();
		const monthIndex = date.getMonth();
		const day = date.getDate();
		const weekdayName = t(`weekdays.short.${weekdayNames[dayOfWeek]}`);
		const monthName = t(`months.short.${monthNames[monthIndex]}`);
		return `${weekdayName}, ${monthName} ${day}`;
	};

	const createTimeBlockMutation = useCreateTimeBlock();
	const checkConflictsMutation = useCheckTimeBlockConflicts();

	// Form state
	const [blockFor, setBlockFor] = useState<'salon' | 'staff'>('staff');
	const [selectedStaffId, setSelectedStaffId] = useState<string>('');
	const [blockType, setBlockType] = useState<'TIME_OFF' | 'BUSY' | 'CLOSURE'>(
		'TIME_OFF'
	);
	const [startDate, setStartDate] = useState('');
	const [startDatePickerOpen, setStartDatePickerOpen] = useState(false);
	const [startTime, setStartTime] = useState('09:00');
	const [endDate, setEndDate] = useState('');
	const [endDatePickerOpen, setEndDatePickerOpen] = useState(false);
	const [endTime, setEndTime] = useState('18:00');
	const [notes, setNotes] = useState('');
	const [conflictAction, setConflictAction] = useState<'RESCHEDULE' | 'CANCEL'>(
		'RESCHEDULE'
	);
	const [selectedStaffIdForReschedule, setSelectedStaffIdForReschedule] =
		useState('');
	const [selectedQuickPreset, setSelectedQuickPreset] = useState<string | null>(
		null
	);

	// Conflict detection state
	const [showConflicts, setShowConflicts] = useState(false);
	const [conflicts, setConflicts] = useState<any[]>([]);

	const staffEligibleForReschedule = useMemo(() => {
		const others = staff.filter((m) => m.id !== selectedStaffId);
		const idsNeeded = new Set<string>();
		for (const c of conflicts) {
			const sid =
				(c as { serviceId?: string }).serviceId || c.service?.id;
			if (sid) idsNeeded.add(sid);
		}
		if (idsNeeded.size === 0) {
			return others;
		}
		return others.filter((member) => {
			for (const sid of idsNeeded) {
				if (!staffCanTakeServiceForTransfer(member, sid, salonServices)) {
					return false;
				}
			}
			return true;
		});
	}, [staff, conflicts, selectedStaffId, salonServices]);

	useEffect(() => {
		if (
			showConflicts &&
			blockFor === 'staff' &&
			conflictAction === 'RESCHEDULE' &&
			staffEligibleForReschedule.length === 0
		) {
			setConflictAction('CANCEL');
		}
	}, [
		showConflicts,
		blockFor,
		conflictAction,
		staffEligibleForReschedule.length,
	]);

	useEffect(() => {
		if (
			selectedStaffIdForReschedule &&
			!staffEligibleForReschedule.some(
				(s) => s.id === selectedStaffIdForReschedule,
			)
		) {
			setSelectedStaffIdForReschedule('');
		}
	}, [selectedStaffIdForReschedule, staffEligibleForReschedule]);

	// Helper functions for date conversion
	const stringToDate = (dateStr: string): Date | undefined => {
		if (!dateStr) return undefined;
		// Parse as local date to avoid timezone issues
		const [year, month, day] = dateStr.split('-').map(Number);
		return new Date(year, month - 1, day);
	};

	const dateToString = (date: Date | undefined): string => {
		if (!date) return '';
		// Format as local date to avoid timezone issues
		const year = date.getFullYear();
		const month = (date.getMonth() + 1).toString().padStart(2, '0');
		const day = date.getDate().toString().padStart(2, '0');
		return `${year}-${month}-${day}`;
	};

	// Helper to get today's date as local date (no timezone issues)
	const getTodayLocal = (): Date => {
		const today = new Date();
		return new Date(today.getFullYear(), today.getMonth(), today.getDate());
	};

	// Helper functions for antd TimePicker
	const parseTimeToDayjs = (timeStr: string): Dayjs | null => {
		if (!timeStr || !timeStr.includes(':')) return null;
		const [hours, minutes] = timeStr.split(':').map(Number);
		return dayjs().hour(hours).minute(minutes).second(0).millisecond(0);
	};

	const formatDayjsToTime = (time: Dayjs | null): string => {
		if (!time) return '';
		return time.format('HH:mm');
	};

	// Initialize form with preselected values
	useEffect(() => {
		if (isOpen) {
			if (preselectedStaffId) {
				setBlockFor('staff');
				setSelectedStaffId(preselectedStaffId);
			}
			if (preselectedDate) {
				const dateStr = dateToString(preselectedDate);
				setStartDate(dateStr);
				setEndDate(dateStr);
			}
			if (preselectedStartTime) {
				setStartTime(preselectedStartTime);
			}
			if (preselectedEndTime) {
				setEndTime(preselectedEndTime);
			}
		}
	}, [
		isOpen,
		preselectedStaffId,
		preselectedDate,
		preselectedStartTime,
		preselectedEndTime,
	]);

	// Reset form when modal closes
	useEffect(() => {
		if (!isOpen) {
			setBlockFor('staff');
			setSelectedStaffId('');
			setBlockType('TIME_OFF');
			setStartDate('');
			setStartTime('09:00');
			setEndDate('');
			setEndTime('18:00');
			setNotes('');
			setConflictAction('RESCHEDULE');
			setSelectedStaffIdForReschedule('');
			setShowConflicts(false);
			setConflicts([]);
			setSelectedQuickPreset(null);
		}
	}, [isOpen]);

	// Check for conflicts before submission
	const handleCheckConflicts = async () => {
		if (!validateForm()) return;

		// Handle full day (00:00 - 23:59) - set end time to end of day
		let finalEndTime = endTime;
		const finalEndDate = endDate;
		if (startTime === '00:00' && endTime === '23:59' && startDate === endDate) {
			// For full day, set end time to 23:59:59.999 to cover entire day
			finalEndTime = '23:59';
		}

		const startDateTime = new Date(
			`${startDate}T${startTime}:00`
		).toISOString();
		const endDateTime = new Date(
			`${finalEndDate}T${finalEndTime}:59.999`
		).toISOString();

		const data: CreateTimeBlockDto = {
			staffId: blockFor === 'staff' ? selectedStaffId : undefined,
			type: blockType,
			startDate: startDateTime,
			endDate: endDateTime,
			notes,
			conflictAction,
			rescheduleStaffId:
				conflictAction === 'RESCHEDULE'
					? selectedStaffIdForReschedule
					: undefined,
		};

		try {
			const result = await checkConflictsMutation.mutateAsync(data);
			if (result.conflictingBookings && result.conflictingBookings.length > 0) {
				setConflicts(result.conflictingBookings);
				if (blockFor === 'salon') setConflictAction('CANCEL');
				setShowConflicts(true);
			} else {
				// No conflicts, proceed directly
				handleSubmit();
			}
		} catch (error) {
			console.error('Error checking conflicts:', error);
		}
	};

	const validateForm = () => {
		if (blockFor === 'staff' && !selectedStaffId) {
			return false;
		}
		if (!blockType) {
			return false;
		}
		if (!startDate || !endDate) {
			return false;
		}
		if (!startTime || !endTime) {
			return false;
		}
		// Handle full day validation (00:00 - 23:59 is valid)
		const startDateTime = new Date(`${startDate}T${startTime}:00`);
		const endDateTime = new Date(
			`${endDate}T${endTime === '23:59' ? '23:59:59.999' : endTime + ':00'}`
		);
		if (endDateTime <= startDateTime) {
			return false;
		}
		return true;
	};

	const validateFormWithConflicts = () => {
		const basicValidation = validateForm();
		if (!basicValidation) {
			return false;
		}
		if (
			showConflicts &&
			blockFor === 'staff' &&
			conflictAction === 'RESCHEDULE' &&
			staffEligibleForReschedule.length === 0
		) {
			return false;
		}
		// If rescheduling to another staff (only when blocking one staff), need to select staff
		if (
			showConflicts &&
			blockFor === 'staff' &&
			conflictAction === 'RESCHEDULE' &&
			!selectedStaffIdForReschedule
		) {
			return false;
		}
		return true;
	};

	const handleSubmit = async () => {
		if (!validateFormWithConflicts()) return;

		// Handle full day (00:00 - 23:59) - set end time to end of day
		let finalEndTime = endTime;
		const finalEndDate = endDate;
		if (startTime === '00:00' && endTime === '23:59' && startDate === endDate) {
			// For full day, set end time to 23:59:59.999 to cover entire day
			finalEndTime = '23:59';
		}

		const startDateTime = new Date(
			`${startDate}T${startTime}:00`
		).toISOString();
		const endDateTime = new Date(
			`${finalEndDate}T${finalEndTime}:59.999`
		).toISOString();

		const data: CreateTimeBlockDto = {
			staffId: blockFor === 'staff' ? selectedStaffId : undefined,
			type: blockType,
			startDate: startDateTime,
			endDate: endDateTime,
			notes,
			conflictAction,
			rescheduleStaffId:
				conflictAction === 'RESCHEDULE'
					? selectedStaffIdForReschedule
					: undefined,
		};

		try {
			await createTimeBlockMutation.mutateAsync(data);
			onClose();
		} catch (error) {
			console.error('Error creating time block:', error);
		}
	};

	// Get working hours for a specific date
	const getWorkingHoursForDate = (date: string) => {
		const workingHours = salonData?.workingHours;
		if (!workingHours || !date) {
			return { startHour: 8, endHour: 17 }; // Default fallback
		}

		const targetDate = new Date(date);
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
		const dayHours = workingHours[dayName];

		if (dayHours && !dayHours.closed && dayHours.open && dayHours.close) {
			const openHour = parseInt(dayHours.open.split(':')[0]);
			const closeHour = parseInt(dayHours.close.split(':')[0]);
			return { startHour: openHour, endHour: closeHour };
		}

		return { startHour: 8, endHour: 17 }; // Default fallback
	};

	// Get working hours for a date range (min start, max end across all days)
	const getWorkingHoursForDateRange = (startDate: string, endDate: string) => {
		// If no dates provided, use today's working hours or default
		if (!startDate && !endDate) {
			const today = new Date();
			const todayStr = dateToString(today);
			return getWorkingHoursForDate(todayStr);
		}

		// If only one date provided, use that date's working hours
		if (!startDate || !endDate) {
			return getWorkingHoursForDate(startDate || endDate);
		}

		const workingHours = salonData?.workingHours;
		if (!workingHours) {
			return { startHour: 8, endHour: 17 }; // Default fallback
		}

		let minStartHour = 23; // Start with latest possible hour
		let maxEndHour = 0; // Start with earliest possible hour

		const start = new Date(startDate);
		const end = new Date(endDate);

		// Iterate through each day in the range
		for (
			let date = new Date(start);
			date <= end;
			date.setDate(date.getDate() + 1)
		) {
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
			const dayHours = workingHours[dayName];

			if (dayHours && !dayHours.closed && dayHours.open && dayHours.close) {
				const openHour = parseInt(dayHours.open.split(':')[0]);
				const closeHour = parseInt(dayHours.close.split(':')[0]);

				minStartHour = Math.min(minStartHour, openHour);
				maxEndHour = Math.max(maxEndHour, closeHour);
			}
		}

		// If no working hours found, use default
		if (minStartHour === 23 || maxEndHour === 0) {
			return { startHour: 8, endHour: 17 };
		}

		return { startHour: minStartHour, endHour: maxEndHour };
	};

	const getBlockTypeLabel = (type: 'TIME_OFF' | 'BUSY' | 'CLOSURE') => {
		switch (type) {
			case 'TIME_OFF':
				return t('owner.calendar.blockTimeModal.timeOff');
			case 'BUSY':
				return t('owner.calendar.blockTimeModal.busy');
			case 'CLOSURE':
				return t('owner.calendar.blockTimeModal.closure');
		}
	};

	const isSubmitting =
		createTimeBlockMutation.isPending || checkConflictsMutation.isPending;

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black/60 flex items-center justify-center z-40 p-4">
			<div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col relative">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
					<h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
						<Clock className="w-6 h-6 text-[#ff5b5b]" />
						{t('owner.calendar.blockTimeModal.title')}
					</h2>
					<button
						onClick={onClose}
						className="text-gray-400 hover:text-gray-600 transition-colors"
						disabled={isSubmitting}
					>
						<X className="w-6 h-6" />
					</button>
				</div>

				{/* Body */}
				<div className="p-6 space-y-6 overflow-y-auto flex-1">
					{showConflicts && conflicts.length > 0 ? (
						/* Step 2: Conflicts view */
						<div className="space-y-4">
							<div className="bg-red-50 border border-red-200 rounded-lg p-4">
								<div className="flex items-start gap-3 mb-3">
									<AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
									<div>
										<p className="text-sm font-medium text-red-900 mb-1">
											{conflicts.length}{' '}
											{t(
												'owner.calendar.blockTimeModal.conflictingBookingsFound'
											)}
										</p>
										<p className="text-sm text-red-700">
											{t(
												'owner.calendar.blockTimeModal.followingBookingsScheduled'
											)}
										</p>
									</div>
								</div>

								<div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
									{conflicts.map((conflict, index) => (
										<div
											key={index}
											className="bg-white rounded p-3 text-sm border border-red-100"
										>
											<div className="font-medium text-gray-900">
												{conflict.user?.name ||
													t('owner.calendar.blockTimeModal.unknownClient')}
											</div>
											<div className="text-gray-600 text-xs mt-1">
												{conflict.service?.name} •{' '}
												{(() => {
													const salonTz =
														salonData?.timezone || 'Asia/Ho_Chi_Minh';
													const date = parseBookingTimeAsLocal(
														conflict.time,
														salonTz
													);
													if (!date) return conflict.time;
													const locale =
														currentLocale === 'ru'
															? 'ru-RU'
															: currentLocale === 'vi'
																? 'vi-VN'
																: 'en-US';
													return date.toLocaleString(locale, {
														month: 'short',
														day: 'numeric',
														hour: '2-digit',
														minute: '2-digit',
													});
												})()}
											</div>
										</div>
									))}
								</div>

								<div>
									<label className="block text-sm font-medium text-red-900 mb-2">
										{t('owner.calendar.blockTimeModal.whatToDoWithBookings')}
									</label>
									<div className="space-y-2">
										{/* Option: Transfer to another staff — only when blocking one staff */}
										{blockFor === 'staff' && (
											<label
												className={cn(
													'flex items-center space-x-3 p-3 border border-blue-200 rounded-lg gap-2 transition-colors bg-white',
													staffEligibleForReschedule.length === 0
														? 'opacity-60 cursor-not-allowed'
														: 'hover:bg-blue-50 cursor-pointer',
												)}
											>
												<input
													type="radio"
													name="conflictAction"
													value="RESCHEDULE"
													checked={conflictAction === 'RESCHEDULE'}
													onChange={() => setConflictAction('RESCHEDULE')}
													disabled={staffEligibleForReschedule.length === 0}
													className="w-4 h-4 text-[#ff5b5b] border-gray-300 focus:ring-[#ff5b5b] disabled:opacity-50"
												/>
												<div className="flex-1 min-w-0">
													<div className="text-sm font-medium text-gray-900">
														{t(
															'owner.calendar.blockTimeModal.transferBookings'
														)}
													</div>
													{staffEligibleForReschedule.length === 0 && (
														<p className="text-xs text-amber-800 mt-1">
															{t(
																'owner.calendar.blockTimeModal.transferNoEligibleStaff',
															)}
														</p>
													)}
													{conflictAction === 'RESCHEDULE' &&
														staffEligibleForReschedule.length > 0 && (
														<div className="mt-2">
															<Select
																value={selectedStaffIdForReschedule}
																onValueChange={setSelectedStaffIdForReschedule}
															>
																<SelectTrigger className="w-full border border-gray-300 focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900">
																	<SelectValue
																		placeholder={t(
																			'owner.calendar.blockTimeModal.selectAStaffMember'
																		)}
																	/>
																</SelectTrigger>
																<SelectContent className="bg-white border border-gray-300 shadow-lg rounded-md">
																	{staffEligibleForReschedule.map(
																		(staffMember) => (
																			<SelectItem
																				key={staffMember.id}
																				value={staffMember.id}
																				className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
																			>
																				{staffMember.name}
																			</SelectItem>
																		),
																	)}
																</SelectContent>
															</Select>
														</div>
													)}
												</div>
											</label>
										)}

										{/* Option: Cancel all bookings (always shown; for salon closure it's the only option) */}
										<label className="flex items-center space-x-3 p-3 border border-red-200 rounded-lg gap-2 hover:bg-red-50 cursor-pointer transition-colors bg-white">
											<input
												type="radio"
												name="conflictAction"
												value="CANCEL"
												checked={conflictAction === 'CANCEL'}
												onChange={() => setConflictAction('CANCEL')}
												className="w-4 h-4 text-[#ff5b5b] border-gray-300 focus:ring-[#ff5b5b]"
											/>
											<div>
												<div className="text-sm font-medium text-gray-900">
													{t('owner.calendar.blockTimeModal.cancelAllBookings')}
												</div>
											</div>
										</label>
									</div>
								</div>
							</div>
						</div>
					) : (
						<>
							{/* Step 1: Form */}
							{/* Block For */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-3">
									{t('owner.calendar.blockTimeModal.blockFor')}
								</label>
								<RadioGroup
									value={blockFor}
									onValueChange={(value: 'salon' | 'staff') => {
										setBlockFor(value);
										if (value === 'salon') {
											setSelectedStaffId('');
										}
									}}
									className="flex gap-4"
								>
									<label className="flex items-center gap-2 space-x-3 p-4 border-2 border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors flex-1">
										<RadioGroupItem
											value="salon"
											id="salon"
											className="text-[#ff5b5b] border-gray-300 focus:ring-[#ff5b5b]"
										/>
										<span className="text-sm font-medium text-gray-900">
											{t('owner.calendar.blockTimeModal.entireSalon')}
										</span>
									</label>
									<label className="flex items-center gap-2 space-x-3 p-4 border-2 border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors flex-1">
										<RadioGroupItem
											value="staff"
											id="staff"
											className="text-[#ff5b5b] border-gray-300 focus:ring-[#ff5b5b]"
										/>
										<span className="text-sm font-medium text-gray-900">
											{t('owner.calendar.blockTimeModal.specificStaffMember')}
										</span>
									</label>
								</RadioGroup>
							</div>

							{/* Staff Selection */}
							{blockFor === 'staff' && (
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										{t('owner.calendar.blockTimeModal.selectStaffMember')}{' '}
										<span className="text-red-500">*</span>
									</label>
									{staffLoading ? (
										<div className="flex items-center justify-center py-4">
											<LoadingSpinner size="sm" />
										</div>
									) : staff.length === 0 ? (
										<div className="flex items-center justify-center py-4 text-gray-500">
											{t('owner.calendar.blockTimeModal.noStaffMembersFound')}
										</div>
									) : (
										<Select
											value={selectedStaffId}
											onValueChange={setSelectedStaffId}
										>
											<SelectTrigger className="w-full border border-gray-300 focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900">
												<SelectValue
													placeholder={t(
														'owner.calendar.blockTimeModal.selectAStaffMember'
													)}
												/>
											</SelectTrigger>
											<SelectContent className="bg-white border border-gray-300 shadow-lg rounded-md">
												{staff.map((member) => (
													<SelectItem
														key={member.id}
														value={member.id}
														className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
													>
														{member.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									)}
								</div>
							)}

							{/* Block Type */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									{t('owner.calendar.blockTimeModal.blockType')}
								</label>
								<Select
									value={blockType}
									onValueChange={(value: 'TIME_OFF' | 'BUSY' | 'CLOSURE') =>
										setBlockType(value)
									}
								>
									<SelectTrigger className="w-full border border-gray-300 focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900">
										<SelectValue
											placeholder={t(
												'owner.calendar.blockTimeModal.selectBlockType'
											)}
										/>
									</SelectTrigger>
									<SelectContent className="bg-white border border-gray-300 shadow-lg rounded-md">
										<SelectItem
											value="TIME_OFF"
											className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-600 cursor-pointer"
										>
											{getBlockTypeLabel('TIME_OFF')}
										</SelectItem>
										<SelectItem
											value="BUSY"
											className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-600 cursor-pointer"
										>
											{getBlockTypeLabel('BUSY')}
										</SelectItem>
										{blockFor === 'salon' && (
											<SelectItem
												value="CLOSURE"
												className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-600 cursor-pointer"
											>
												{getBlockTypeLabel('CLOSURE')}
											</SelectItem>
										)}
									</SelectContent>
								</Select>
							</div>

							{/* Quick Time Presets */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									{t('owner.calendar.blockTimeModal.quickPresets')}
								</label>
								<div className="flex flex-wrap gap-2">
									<button
										type="button"
										onClick={() => {
											setStartTime('00:00');
											setEndTime('23:59');
											setSelectedQuickPreset('fullDay');
										}}
										className={cn(
											'px-3 py-1.5 text-sm border border-[#ff5b5b] rounded-lg transition-colors',
											selectedQuickPreset === 'fullDay'
												? 'bg-[#ff5b5b] text-white'
												: 'bg-[#fff7f6] text-[#ff5b5b] hover:bg-[#ff5b5b] hover:text-white'
										)}
									>
										{t('owner.calendar.blockTimeModal.fullDay')}
									</button>
									<button
										type="button"
										onClick={() => {
											const { startHour } = getWorkingHoursForDateRange(
												startDate,
												endDate
											);
											const midHour = Math.floor((startHour + 12) / 2);
											setStartTime(
												`${startHour.toString().padStart(2, '0')}:00`
											);
											setEndTime(`${midHour.toString().padStart(2, '0')}:00`);
											setSelectedQuickPreset('morning');
										}}
										className={cn(
											'px-3 py-1.5 text-sm border border-[#ff5b5b] rounded-lg transition-colors',
											selectedQuickPreset === 'morning'
												? 'bg-[#ff5b5b] text-white'
												: 'bg-[#fff7f6] text-[#ff5b5b] hover:bg-[#ff5b5b] hover:text-white'
										)}
									>
										{t('owner.calendar.blockTimeModal.morning')}
									</button>
									<button
										type="button"
										onClick={() => {
											const { endHour } = getWorkingHoursForDateRange(
												startDate,
												endDate
											);
											const midHour = Math.ceil((endHour + 8) / 2);
											setStartTime(`${midHour.toString().padStart(2, '0')}:00`);
											setEndTime(`${endHour.toString().padStart(2, '0')}:00`);
											setSelectedQuickPreset('afternoon');
										}}
										className={cn(
											'px-3 py-1.5 text-sm border border-[#ff5b5b] rounded-lg transition-colors',
											selectedQuickPreset === 'afternoon'
												? 'bg-[#ff5b5b] text-white'
												: 'bg-[#fff7f6] text-[#ff5b5b] hover:bg-[#ff5b5b] hover:text-white'
										)}
									>
										{t('owner.calendar.blockTimeModal.afternoon')}
									</button>
								</div>
							</div>

							{/* Date Range */}

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										<CalendarIcon className="w-4 h-4 inline mr-1" />
										{t('owner.calendar.blockTimeModal.startDate')}{' '}
										<span className="text-red-500">*</span>
									</label>
									<Popover
										open={startDatePickerOpen}
										onOpenChange={setStartDatePickerOpen}
									>
										<PopoverTrigger asChild>
											<Button
												variant="outline"
												className={cn(
													'w-full justify-start text-left font-normal pl-3',
													!startDate && 'text-muted-foreground'
												)}
												type="button"
											>
												<CalendarIcon className="mr-2 h-4 w-4" />
												{startDate && stringToDate(startDate)
													? format(stringToDate(startDate)!, 'dd.MM.yy', {
															locale: getDateLocale(),
														})
													: t('owner.calendar.blockTimeModal.pickADate')}
											</Button>
										</PopoverTrigger>
										<PopoverContent
											className="w-auto p-0 bg-white"
											align="start"
										>
											<Calendar
												mode="single"
												selected={stringToDate(startDate)}
												locale={getCalendarLocale()}
												onSelect={(date: Date | undefined) => {
													if (date) {
														const dateStr = dateToString(date);
														setStartDate(dateStr);
														// Auto-set end date only if it's currently empty or before the new start date
														if (!endDate || endDate < dateStr) {
															setEndDate(dateStr);
														}
														setStartDatePickerOpen(false);
													}
												}}
												fromDate={getTodayLocal()}
												disabled={(date) => {
													const today = getTodayLocal();
													const dateToCheck = new Date(date);
													dateToCheck.setHours(0, 0, 0, 0);
													return dateToCheck < today;
												}}
											/>
										</PopoverContent>
									</Popover>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										<Clock className="w-4 h-4 inline mr-1" />
										{t('owner.calendar.blockTimeModal.startTime')}{' '}
										<span className="text-red-500">*</span>
									</label>
									<div
										className="w-full"
										style={{ width: '100%', minWidth: '80px' }}
									>
										<TimePicker
											value={parseTimeToDayjs(startTime)}
											onChange={(time) => {
												const timeStr = formatDayjsToTime(time);
												if (timeStr) {
													setStartTime(timeStr);
													setSelectedQuickPreset(null);
												}
											}}
											format="HH:mm"
											placeholder="09:00"
											minuteStep={5}
											inputReadOnly={true}
											className="custom-time-picker"
											style={{
												width: '100%',
												minWidth: '80px',
												maxWidth: '120px',
											}}
										/>
									</div>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										<CalendarIcon className="w-4 h-4 inline mr-1" />
										{t('owner.calendar.blockTimeModal.endDate')}{' '}
										<span className="text-red-500">*</span>
									</label>
									<Popover
										open={endDatePickerOpen}
										onOpenChange={setEndDatePickerOpen}
									>
										<PopoverTrigger asChild>
											<Button
												variant="outline"
												className={cn(
													'w-full justify-start text-left font-normal pl-3',
													!endDate && 'text-muted-foreground'
												)}
												type="button"
											>
												<CalendarIcon className="mr-2 h-4 w-4" />
												{endDate && stringToDate(endDate)
													? format(stringToDate(endDate)!, 'dd.MM.yy', {
															locale: getDateLocale(),
														})
													: t('owner.calendar.blockTimeModal.pickADate')}
											</Button>
										</PopoverTrigger>
										<PopoverContent
											className="w-auto p-0 bg-white"
											align="start"
										>
											<Calendar
												mode="single"
												selected={stringToDate(endDate)}
												locale={getCalendarLocale()}
												onSelect={(date: Date | undefined) => {
													if (date) {
														const dateStr = dateToString(date);
														// Ensure end date is not before start date
														if (!startDate || dateStr >= startDate) {
															setEndDate(dateStr);
															setEndDatePickerOpen(false);
														}
													}
												}}
												fromDate={
													startDate && stringToDate(startDate)
														? stringToDate(startDate)
														: getTodayLocal()
												}
												disabled={(date) => {
													const today = getTodayLocal();
													const dateToCheck = new Date(date);
													dateToCheck.setHours(0, 0, 0, 0);
													// Block past dates, or dates before start date if start date is set
													if (dateToCheck < today) return true;
													if (startDate && stringToDate(startDate)) {
														const startDateOnly = new Date(
															stringToDate(startDate)!
														);
														startDateOnly.setHours(0, 0, 0, 0);
														return dateToCheck < startDateOnly;
													}
													return false;
												}}
											/>
										</PopoverContent>
									</Popover>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										<Clock className="w-4 h-4 inline mr-1" />
										{t('owner.calendar.blockTimeModal.endTime')}{' '}
										<span className="text-red-500">*</span>
									</label>
									<div
										className="w-full"
										style={{ width: '100%', minWidth: '80px' }}
									>
										<TimePicker
											value={parseTimeToDayjs(endTime)}
											onChange={(time) => {
												const timeStr = formatDayjsToTime(time);
												if (timeStr) {
													setEndTime(timeStr);
													setSelectedQuickPreset(null);
												}
											}}
											format="HH:mm"
											placeholder="18:00"
											minuteStep={5}
											inputReadOnly={true}
											className="custom-time-picker"
											style={{
												width: '100%',
												minWidth: '80px',
												maxWidth: '120px',
											}}
										/>
									</div>
								</div>
							</div>

							{/* Date Range Info */}
							{startDate && endDate && startDate !== endDate && (
								<div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
									<p className="text-sm text-blue-800">
										<strong>
											{t('owner.calendar.blockTimeModal.multipleDaysSelected')}
										</strong>{' '}
										{t('owner.calendar.blockTimeModal.thisWillBlockTimeFrom')}{' '}
										{formatDateForDisplay(startDate)} {t('common.to') || 'to'}{' '}
										{formatDateForDisplay(endDate)} (
										{Math.ceil(
											(new Date(endDate).getTime() -
												new Date(startDate).getTime()) /
												(1000 * 60 * 60 * 24)
										) + 1}{' '}
										{t('owner.calendar.blockTimeModal.toDays')})
									</p>
								</div>
							)}

							{/* Notes */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									{t('owner.calendar.blockTimeModal.additionalNotes')}
								</label>
								<textarea
									value={notes}
									onChange={(e) => setNotes(e.target.value)}
									rows={3}
									placeholder={t(
										'owner.calendar.blockTimeModal.additionalNotesPlaceholder'
									)}
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
								/>
							</div>

							{/* Warning */}
							<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
								<AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
								<div className="text-sm text-yellow-800">
									<p className="font-medium mb-1">
										{t('owner.calendar.blockTimeModal.warningTitle')}
									</p>
									<p className="!mb-0">
										{t('owner.calendar.blockTimeModal.warningDescription')}
									</p>
								</div>
							</div>
						</>
					)}
				</div>

				{/* Footer */}
				<div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
					{showConflicts ? (
						<>
							<button
								type="button"
								onClick={() => setShowConflicts(false)}
								disabled={isSubmitting}
								className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								{t('owner.calendar.back')}
							</button>
							<button
								onClick={handleSubmit}
								disabled={isSubmitting || !validateFormWithConflicts()}
								className="px-4 py-2 text-sm font-medium !text-white bg-[#ff5b5b] rounded-lg hover:bg-[#e04a4a] focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
							>
								{isSubmitting && <LoadingSpinner size="sm" inline />}
								{isSubmitting
									? t('owner.calendar.blockTimeModal.blocking')
									: t('owner.calendar.blockTimeModal.confirmAndBlock')}
							</button>
						</>
					) : (
						<>
							<button
								onClick={onClose}
								disabled={isSubmitting}
								className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								{t('owner.calendar.blockTimeModal.cancel')}
							</button>
							<button
								onClick={handleCheckConflicts}
								disabled={!validateForm() || isSubmitting}
								className="px-4 py-2 text-sm font-medium !text-white bg-[#ff5b5b] rounded-lg hover:bg-[#e04a4a] focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
							>
								{isSubmitting && <LoadingSpinner size="sm" inline />}
								{isSubmitting
									? t('owner.calendar.blockTimeModal.checking')
									: t('owner.calendar.blockTimeModal.checkConflictsAndBlock')}
							</button>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
