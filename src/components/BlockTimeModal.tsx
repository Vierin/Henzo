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
import { useSalonId } from '@/hooks/useSalon';
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
import { TimePicker } from 'rsuite';
import 'rsuite/dist/rsuite-no-reset.min.css';

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
	const { salonId, salon: salonData } = useSalonId();
	const { data: staff = [], isLoading: staffLoading } = useStaffBySalon(
		salonId || ''
	);

	const createTimeBlockMutation = useCreateTimeBlock();
	const checkConflictsMutation = useCheckTimeBlockConflicts();

	// Form state
	const [blockFor, setBlockFor] = useState<'salon' | 'staff'>('staff');
	const [selectedStaffId, setSelectedStaffId] = useState<string>('');
	const [blockType, setBlockType] = useState<'TIME_OFF' | 'BUSY' | 'CLOSURE'>(
		'TIME_OFF'
	);
	const [reason, setReason] = useState('');
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

	// Conflict detection state
	const [showConflicts, setShowConflicts] = useState(false);
	const [conflicts, setConflicts] = useState<any[]>([]);

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

	// Helper functions for rsuite TimePicker
	const parseTimeToDate = (timeStr: string): Date | null => {
		if (!timeStr || !timeStr.includes(':')) return null;
		const [hours, minutes] = timeStr.split(':').map(Number);
		const date = new Date();
		date.setHours(hours, minutes, 0, 0);
		return date;
	};

	const formatDateToTime = (date: Date | null): string => {
		if (!date) return '';
		const hours = date.getHours().toString().padStart(2, '0');
		const minutes = date.getMinutes().toString().padStart(2, '0');
		return `${hours}:${minutes}`;
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
			setReason('');
			setStartDate('');
			setStartTime('09:00');
			setEndDate('');
			setEndTime('18:00');
			setNotes('');
			setConflictAction('RESCHEDULE');
			setSelectedStaffIdForReschedule('');
			setShowConflicts(false);
			setConflicts([]);
		}
	}, [isOpen]);

	// Check for conflicts before submission
	const handleCheckConflicts = async () => {
		if (!validateForm()) return;

		const startDateTime = new Date(`${startDate}T${startTime}`).toISOString();
		const endDateTime = new Date(`${endDate}T${endTime}`).toISOString();

		const data: CreateTimeBlockDto = {
			staffId: blockFor === 'staff' ? selectedStaffId : undefined,
			type: blockType,
			reason,
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
		if (!reason.trim()) {
			return false;
		}
		if (!startDate || !endDate) {
			return false;
		}
		if (
			new Date(`${endDate}T${endTime}`) < new Date(`${startDate}T${startTime}`)
		) {
			return false;
		}
		return true;
	};

	const validateFormWithConflicts = () => {
		const basicValidation = validateForm();
		if (!basicValidation) {
			return false;
		}
		// If rescheduling conflicts, need to select staff member
		if (
			showConflicts &&
			conflictAction === 'RESCHEDULE' &&
			!selectedStaffIdForReschedule
		) {
			return false;
		}
		return true;
	};

	const handleSubmit = async () => {
		if (!validateFormWithConflicts()) return;

		const startDateTime = new Date(`${startDate}T${startTime}`).toISOString();
		const endDateTime = new Date(`${endDate}T${endTime}`).toISOString();

		const data: CreateTimeBlockDto = {
			staffId: blockFor === 'staff' ? selectedStaffId : undefined,
			type: blockType,
			reason,
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
				return 'Time Off / Vacation';
			case 'BUSY':
				return 'Busy / Break';
			case 'CLOSURE':
				return 'Closure';
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
						Block Time
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
					{/* Block For */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-3">
							Block for:
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
							<label className="flex items-center space-x-3 p-4 border-2 border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors flex-1">
								<RadioGroupItem
									value="salon"
									id="salon"
									className="text-[#ff5b5b] border-gray-300 focus:ring-[#ff5b5b]"
								/>
								<span className="text-sm font-medium text-gray-900">
									Entire Salon
								</span>
							</label>
							<label className="flex items-center space-x-3 p-4 border-2 border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors flex-1">
								<RadioGroupItem
									value="staff"
									id="staff"
									className="text-[#ff5b5b] border-gray-300 focus:ring-[#ff5b5b]"
								/>
								<span className="text-sm font-medium text-gray-900">
									Specific Staff Member
								</span>
							</label>
						</RadioGroup>
					</div>

					{/* Staff Selection */}
					{blockFor === 'staff' && (
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Select Staff Member <span className="text-red-500">*</span>
							</label>
							{staffLoading ? (
								<div className="flex items-center justify-center py-4">
									<LoadingSpinner size="sm" />
								</div>
							) : staff.length === 0 ? (
								<div className="flex items-center justify-center py-4 text-gray-500">
									No staff members found
								</div>
							) : (
								<Select
									value={selectedStaffId}
									onValueChange={setSelectedStaffId}
								>
									<SelectTrigger className="w-full border border-gray-300 focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900">
										<SelectValue placeholder="Select a staff member" />
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
							Reason: <span className="text-red-500">*</span>
						</label>
						<Select
							value={blockType}
							onValueChange={(value: 'TIME_OFF' | 'BUSY' | 'CLOSURE') =>
								setBlockType(value)
							}
						>
							<SelectTrigger className="w-full border border-gray-300 focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900">
								<SelectValue placeholder="Select a reason" />
							</SelectTrigger>
							<SelectContent className="bg-white border border-gray-300 shadow-lg rounded-md">
								<SelectItem
									value="TIME_OFF"
									className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
								>
									{getBlockTypeLabel('TIME_OFF')}
								</SelectItem>
								<SelectItem
									value="BUSY"
									className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
								>
									{getBlockTypeLabel('BUSY')}
								</SelectItem>
								{blockFor === 'salon' && (
									<SelectItem
										value="CLOSURE"
										className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
									>
										{getBlockTypeLabel('CLOSURE')}
									</SelectItem>
								)}
							</SelectContent>
						</Select>
					</div>

					{/* Reason Description */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Description <span className="text-red-500">*</span>
						</label>
						<input
							type="text"
							value={reason}
							onChange={(e) => setReason(e.target.value)}
							placeholder="e.g., Annual vacation, Sick leave, Team meeting"
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
							required
						/>
					</div>

					{/* Quick Time Presets */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Quick Presets
						</label>
						<div className="flex flex-wrap gap-2">
							<button
								type="button"
								onClick={() => {
									setStartTime('00:00');
									setEndTime('24:00');
								}}
								className="px-3 py-1.5 text-sm border border-[#ff5b5b] bg-[#fff7f6] text-[#ff5b5b] rounded-lg hover:bg-[#ff5b5b] hover:text-white transition-colors"
							>
								Full Day
							</button>
							<button
								type="button"
								onClick={() => {
									const { startHour } = getWorkingHoursForDateRange(
										startDate,
										endDate
									);
									const midHour = Math.floor((startHour + 12) / 2);
									setStartTime(`${startHour.toString().padStart(2, '0')}:00`);
									setEndTime(`${midHour.toString().padStart(2, '0')}:00`);
								}}
								className="px-3 py-1.5 text-sm border border-[#ff5b5b] bg-[#fff7f6] text-[#ff5b5b] rounded-lg hover:bg-[#ff5b5b] hover:text-white transition-colors"
							>
								Morning
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
								}}
								className="px-3 py-1.5 text-sm border border-[#ff5b5b] bg-[#fff7f6] text-[#ff5b5b] rounded-lg hover:bg-[#ff5b5b] hover:text-white transition-colors"
							>
								Afternoon
							</button>
							<button
								type="button"
								onClick={() => {
									setStartTime('12:00');
									setEndTime('13:00');
								}}
								className="px-3 py-1.5 text-sm border border-[#ff5b5b] bg-[#fff7f6] text-[#ff5b5b] rounded-lg hover:bg-[#ff5b5b] hover:text-white transition-colors"
							>
								Lunch (12:00-13:00)
							</button>
						</div>
					</div>

					{/* Date Range */}

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								<CalendarIcon className="w-4 h-4 inline mr-1" />
								Start Date <span className="text-red-500">*</span>
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
											? format(stringToDate(startDate)!, 'PPP')
											: 'Pick a date'}
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-auto p-0 bg-white" align="start">
									<Calendar
										mode="single"
										selected={stringToDate(startDate)}
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
									/>
								</PopoverContent>
							</Popover>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								<Clock className="w-4 h-4 inline mr-1" />
								Start Time <span className="text-red-500">*</span>
							</label>
							<div className="w-full">
								<TimePicker
									value={parseTimeToDate(startTime) || null}
									onChange={(date) => {
										const timeStr = formatDateToTime(date);
										if (timeStr) {
											setStartTime(timeStr);
										}
									}}
									format="HH:mm"
									cleanable={false}
									placeholder="09:00"
									className="w-full custom-time-picker"
									style={
										{
											width: '100%',
											'--rs-picker-toggle-border': '#d1d5db',
											'--rs-picker-toggle-focus-border': '#ff5b5b',
											'--rs-picker-toggle-focus-shadow':
												'rgba(255, 91, 91, 0.2)',
										} as React.CSSProperties
									}
									container={() => document.body}
									preventOverflow={true}
									menuStyle={{ zIndex: 9999 }}
								/>
							</div>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								<CalendarIcon className="w-4 h-4 inline mr-1" />
								End Date <span className="text-red-500">*</span>
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
											? format(stringToDate(endDate)!, 'PPP')
											: 'Pick a date'}
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-auto p-0 bg-white" align="start">
									<Calendar
										mode="single"
										selected={stringToDate(endDate)}
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
									/>
								</PopoverContent>
							</Popover>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								<Clock className="w-4 h-4 inline mr-1" />
								End Time <span className="text-red-500">*</span>
							</label>
							<div className="w-full">
								<TimePicker
									value={parseTimeToDate(endTime) || null}
									onChange={(date) => {
										const timeStr = formatDateToTime(date);
										if (timeStr) {
											setEndTime(timeStr);
										}
									}}
									format="HH:mm"
									cleanable={false}
									placeholder="18:00"
									className="w-full custom-time-picker"
									style={
										{
											width: '100%',
											'--rs-picker-toggle-border': '#d1d5db',
											'--rs-picker-toggle-focus-border': '#ff5b5b',
											'--rs-picker-toggle-focus-shadow':
												'rgba(255, 91, 91, 0.2)',
										} as React.CSSProperties
									}
									container={() => document.body}
									preventOverflow={true}
									menuStyle={{ zIndex: 9999 }}
								/>
							</div>
						</div>
					</div>

					{/* Date Range Info */}
					{startDate && endDate && startDate !== endDate && (
						<div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
							<p className="text-sm text-blue-800">
								<strong>Multiple days selected:</strong> This will block time
								from{' '}
								{new Date(startDate).toLocaleDateString('en-US', {
									weekday: 'short',
									month: 'short',
									day: 'numeric',
								})}{' '}
								to{' '}
								{new Date(endDate).toLocaleDateString('en-US', {
									weekday: 'short',
									month: 'short',
									day: 'numeric',
								})}{' '}
								(
								{Math.ceil(
									(new Date(endDate).getTime() -
										new Date(startDate).getTime()) /
										(1000 * 60 * 60 * 24)
								) + 1}{' '}
								days)
							</p>
						</div>
					)}

					{/* Notes */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Additional Notes (Optional)
						</label>
						<textarea
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							rows={3}
							placeholder="Any additional information..."
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
						/>
					</div>

					{/* Warning */}
					<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
						<AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
						<div className="text-sm text-yellow-800">
							<p className="font-medium mb-1">
								This will prevent new bookings during this time.
							</p>
							<p>
								If there are existing bookings during this period, you'll be
								able to choose whether to keep or cancel them.
							</p>
						</div>
					</div>

					{/* Conflicts Section */}
					{showConflicts && conflicts.length > 0 && (
						<div className="bg-red-50 border border-red-200 rounded-lg p-4">
							<div className="flex items-start gap-3 mb-3">
								<AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
								<div>
									<p className="text-sm font-medium text-red-900 mb-1">
										{conflicts.length} Conflicting Booking
										{conflicts.length > 1 ? 's' : ''} Found
									</p>
									<p className="text-sm text-red-700">
										The following bookings are scheduled during this time:
									</p>
								</div>
							</div>

							<div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
								{conflicts.map((conflict, index) => (
									<div
										key={index}
										className="bg-white rounded p-3 text-sm border border-red-100"
									>
										<div className="font-medium text-gray-900">
											{conflict.user?.name || 'Unknown Client'}
										</div>
										<div className="text-gray-600 text-xs mt-1">
											{conflict.service?.name} •{' '}
											{new Date(conflict.time).toLocaleString('en-US', {
												month: 'short',
												day: 'numeric',
												hour: '2-digit',
												minute: '2-digit',
											})}
										</div>
									</div>
								))}
							</div>

							<div>
								<label className="block text-sm font-medium text-red-900 mb-2">
									What would you like to do with these bookings?
								</label>
								<div className="space-y-2">
									{/* Option 1: Reschedule to another staff member */}
									<label className="flex items-center space-x-3 p-3 border border-blue-200 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors bg-white">
										<input
											type="radio"
											name="conflictAction"
											value="RESCHEDULE"
											checked={conflictAction === 'RESCHEDULE'}
											onChange={() => setConflictAction('RESCHEDULE')}
											className="w-4 h-4 text-[#ff5b5b] border-gray-300 focus:ring-[#ff5b5b]"
										/>
										<div className="flex-1">
											<div className="text-sm font-medium text-gray-900">
												Transfer bookings to another staff member
											</div>
											<div className="text-xs text-gray-600">
												Move existing bookings to a different staff member
											</div>
											{conflictAction === 'RESCHEDULE' && (
												<div className="mt-2">
													<Select
														value={selectedStaffIdForReschedule}
														onValueChange={setSelectedStaffIdForReschedule}
													>
														<SelectTrigger className="w-full border border-gray-300 focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900">
															<SelectValue placeholder="Select staff member" />
														</SelectTrigger>
														<SelectContent>
															{staff
																.filter(
																	(staffMember) =>
																		staffMember.id !== selectedStaffId
																)
																.map((staffMember) => (
																	<SelectItem
																		key={staffMember.id}
																		value={staffMember.id}
																	>
																		{staffMember.name}
																	</SelectItem>
																))}
														</SelectContent>
													</Select>
												</div>
											)}
										</div>
									</label>

									{/* Option 2: Cancel all bookings */}
									<label className="flex items-center space-x-3 p-3 border border-red-200 rounded-lg hover:bg-red-50 cursor-pointer transition-colors bg-white">
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
												Cancel all conflicting bookings
											</div>
											<div className="text-xs text-gray-600">
												Cancel all bookings and notify clients automatically
											</div>
										</div>
									</label>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
					<button
						onClick={onClose}
						disabled={isSubmitting}
						className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						Cancel
					</button>
					{!showConflicts ? (
						<button
							onClick={handleCheckConflicts}
							disabled={!validateForm() || isSubmitting}
							className="px-4 py-2 text-sm font-medium text-white bg-[#ff5b5b] rounded-lg hover:bg-[#e04a4a] focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
						>
							{isSubmitting && <LoadingSpinner size="sm" />}
							{isSubmitting ? 'Checking...' : 'Check Conflicts & Block Time'}
						</button>
					) : (
						<button
							onClick={handleSubmit}
							disabled={isSubmitting || !validateFormWithConflicts()}
							className="px-4 py-2 text-sm font-medium text-white bg-[#ff5b5b] rounded-lg hover:bg-[#e04a4a] focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
						>
							{isSubmitting && <LoadingSpinner size="sm" />}
							{isSubmitting ? 'Blocking...' : 'Confirm & Block Time'}
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
