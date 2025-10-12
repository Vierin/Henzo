'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, AlertCircle, Clock, Calendar, User } from 'lucide-react';
import { useStaffBySalon } from '@/hooks/useStaff';
import { useSalonId } from '@/hooks/useSalon';
import {
	useCreateTimeBlock,
	useCheckTimeBlockConflicts,
} from '@/hooks/useTimeBlocks';
import { CreateTimeBlockDto } from '@/types/dto/time-block.dto';
import LoadingSpinner from './LoadingSpinner';

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
	const { salonId } = useSalonId();
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
	const [startTime, setStartTime] = useState('09:00');
	const [endDate, setEndDate] = useState('');
	const [endTime, setEndTime] = useState('18:00');
	const [notes, setNotes] = useState('');
	const [conflictAction, setConflictAction] = useState<'KEEP' | 'CANCEL'>(
		'KEEP'
	);

	// Conflict detection state
	const [showConflicts, setShowConflicts] = useState(false);
	const [conflicts, setConflicts] = useState<any[]>([]);

	// Initialize form with preselected values
	useEffect(() => {
		if (isOpen) {
			if (preselectedStaffId) {
				setBlockFor('staff');
				setSelectedStaffId(preselectedStaffId);
			}
			if (preselectedDate) {
				const dateStr = preselectedDate.toISOString().split('T')[0];
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
			setConflictAction('KEEP');
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

	const handleSubmit = async () => {
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
		};

		try {
			await createTimeBlockMutation.mutateAsync(data);
			onClose();
		} catch (error) {
			console.error('Error creating time block:', error);
		}
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
		<div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[1000] p-4">
			<div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-gray-200">
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
				<div className="p-6 space-y-6">
					{/* Block For */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-3">
							Block for:
						</label>
						<div className="flex gap-4">
							<label className="flex items-center space-x-3 p-4 border-2 border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors flex-1">
								<input
									type="radio"
									name="blockFor"
									value="salon"
									checked={blockFor === 'salon'}
									onChange={() => {
										setBlockFor('salon');
										setSelectedStaffId('');
									}}
									className="w-4 h-4 text-[#ff5b5b] border-gray-300 focus:ring-[#ff5b5b]"
								/>
								<span className="text-sm font-medium text-gray-900">
									Entire Salon
								</span>
							</label>
							<label className="flex items-center space-x-3 p-4 border-2 border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors flex-1">
								<input
									type="radio"
									name="blockFor"
									value="staff"
									checked={blockFor === 'staff'}
									onChange={() => setBlockFor('staff')}
									className="w-4 h-4 text-[#ff5b5b] border-gray-300 focus:ring-[#ff5b5b]"
								/>
								<span className="text-sm font-medium text-gray-900">
									Specific Staff Member
								</span>
							</label>
						</div>
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
							) : (
								<select
									value={selectedStaffId}
									onChange={(e) => setSelectedStaffId(e.target.value)}
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
									required
								>
									<option value="">Select a staff member</option>
									{staff.map((member) => (
										<option key={member.id} value={member.id}>
											{member.name}
										</option>
									))}
								</select>
							)}
						</div>
					)}

					{/* Block Type */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-3">
							Reason: <span className="text-red-500">*</span>
						</label>
						<div className="space-y-2">
							<label className="flex items-center space-x-3 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
								<input
									type="radio"
									name="blockType"
									value="TIME_OFF"
									checked={blockType === 'TIME_OFF'}
									onChange={() => setBlockType('TIME_OFF')}
									className="w-4 h-4 text-[#ff5b5b] border-gray-300 focus:ring-[#ff5b5b]"
								/>
								<span className="text-sm font-medium text-gray-900">
									{getBlockTypeLabel('TIME_OFF')}
								</span>
							</label>
							<label className="flex items-center space-x-3 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
								<input
									type="radio"
									name="blockType"
									value="BUSY"
									checked={blockType === 'BUSY'}
									onChange={() => setBlockType('BUSY')}
									className="w-4 h-4 text-[#ff5b5b] border-gray-300 focus:ring-[#ff5b5b]"
								/>
								<span className="text-sm font-medium text-gray-900">
									{getBlockTypeLabel('BUSY')}
								</span>
							</label>
							{blockFor === 'salon' && (
								<label className="flex items-center space-x-3 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
									<input
										type="radio"
										name="blockType"
										value="CLOSURE"
										checked={blockType === 'CLOSURE'}
										onChange={() => setBlockType('CLOSURE')}
										className="w-4 h-4 text-[#ff5b5b] border-gray-300 focus:ring-[#ff5b5b]"
									/>
									<span className="text-sm font-medium text-gray-900">
										{getBlockTypeLabel('CLOSURE')}
									</span>
								</label>
							)}
						</div>
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
									setStartTime('08:00');
									setEndTime('17:00');
								}}
								className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
							>
								Full Day (8:00-17:00)
							</button>
							<button
								type="button"
								onClick={() => {
									setStartTime('08:00');
									setEndTime('12:00');
								}}
								className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
							>
								Morning (8:00-12:00)
							</button>
							<button
								type="button"
								onClick={() => {
									setStartTime('13:00');
									setEndTime('17:00');
								}}
								className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
							>
								Afternoon (13:00-17:00)
							</button>
							<button
								type="button"
								onClick={() => {
									setStartTime('12:00');
									setEndTime('13:00');
								}}
								className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
							>
								Lunch (12:00-13:00)
							</button>
						</div>
					</div>

					{/* Date Range */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								<Calendar className="w-4 h-4 inline mr-1" />
								Start Date <span className="text-red-500">*</span>
							</label>
							<div className="relative">
								<input
									type="date"
									value={startDate}
									onChange={(e) => {
										setStartDate(e.target.value);
										// Auto-set end date if not set
										if (!endDate) {
											setEndDate(e.target.value);
										}
									}}
									min={new Date().toISOString().split('T')[0]}
									className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900 bg-white"
									required
								/>
								<Calendar className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
							</div>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								<Clock className="w-4 h-4 inline mr-1" />
								Start Time <span className="text-red-500">*</span>
							</label>
							<div className="relative">
								<input
									type="time"
									value={startTime}
									onChange={(e) => setStartTime(e.target.value)}
									step="900"
									className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900 bg-white"
									required
								/>
								<Clock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
							</div>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								<Calendar className="w-4 h-4 inline mr-1" />
								End Date <span className="text-red-500">*</span>
							</label>
							<div className="relative">
								<input
									type="date"
									value={endDate}
									onChange={(e) => setEndDate(e.target.value)}
									min={startDate || new Date().toISOString().split('T')[0]}
									className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900 bg-white"
									required
								/>
								<Calendar className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
							</div>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								<Clock className="w-4 h-4 inline mr-1" />
								End Time <span className="text-red-500">*</span>
							</label>
							<div className="relative">
								<input
									type="time"
									value={endTime}
									onChange={(e) => setEndTime(e.target.value)}
									step="900"
									className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900 bg-white"
									required
								/>
								<Clock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
							</div>
						</div>
					</div>

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
									<label className="flex items-center space-x-3 p-3 border border-red-200 rounded-lg hover:bg-red-100 cursor-pointer transition-colors bg-white">
										<input
											type="radio"
											name="conflictAction"
											value="KEEP"
											checked={conflictAction === 'KEEP'}
											onChange={() => setConflictAction('KEEP')}
											className="w-4 h-4 text-[#ff5b5b] border-gray-300 focus:ring-[#ff5b5b]"
										/>
										<div>
											<div className="text-sm font-medium text-gray-900">
												Keep them (show warning)
											</div>
											<div className="text-xs text-gray-600">
												Bookings will remain, but time will be blocked for new
												appointments
											</div>
										</div>
									</label>
									<label className="flex items-center space-x-3 p-3 border border-red-200 rounded-lg hover:bg-red-100 cursor-pointer transition-colors bg-white">
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
												Auto-cancel with notification
											</div>
											<div className="text-xs text-gray-600">
												Bookings will be cancelled and clients will be notified
											</div>
										</div>
									</label>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
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
							disabled={isSubmitting}
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
