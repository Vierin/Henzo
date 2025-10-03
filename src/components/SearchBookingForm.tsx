'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AddressAutocomplete from './AddressAutocomplete';
import ServiceAutocomplete from './ServiceAutocomplete';
import { TIME_INTERVALS } from '@/constants/timeIntervals';

interface SearchBookingFormProps {
	className?: string;
}

export default function SearchBookingForm({
	className = '',
}: SearchBookingFormProps) {
	const router = useRouter();
	const [activeTab, setActiveTab] = useState<'treatments' | 'salon'>(
		'treatments'
	);
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedLocation, setSelectedLocation] = useState('');
	const [showCurrentLocation, setShowCurrentLocation] = useState(true);
	const [selectedDate, setSelectedDate] = useState<Date | null>(null);
	const [selectedTimeInterval, setSelectedTimeInterval] = useState<string>('');
	const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
	const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
	const [currentMonth, setCurrentMonth] = useState(new Date());
	const datePickerRef = useRef<HTMLDivElement>(null);
	const timePickerRef = useRef<HTMLDivElement>(null);

	const handleSearch = () => {
		const params = new URLSearchParams();

		if (activeTab === 'treatments') {
			if (searchQuery) params.set('service', searchQuery);
			if (selectedLocation) params.set('location', selectedLocation);
			if (selectedDate)
				params.set('date', selectedDate.toISOString().split('T')[0]);
			if (selectedTimeInterval) params.set('time', selectedTimeInterval);
		} else {
			if (searchQuery) params.set('salon', searchQuery);
		}

		router.push(`/salons${params.toString() ? `?${params.toString()}` : ''}`);
	};

	const handleClearSearch = () => {
		setSearchQuery('');
	};

	const handleCurrentLocation = () => {
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(
				(position) => {
					const { latitude, longitude } = position.coords;
					setSelectedLocation(`${latitude}, ${longitude}`);
					setShowCurrentLocation(false);
				},
				(error) => {
					console.error('Error getting location:', error);
				}
			);
		}
	};

	const handleClearDate = () => {
		setSelectedDate(null);
		setSelectedTimeInterval(''); // Also clear time when clearing date
		setIsDatePickerOpen(false);
	};

	const handleClearTime = () => {
		setSelectedTimeInterval('');
		setIsTimePickerOpen(false);
	};

	const formatDateDisplay = (date: Date | null) => {
		if (!date) return 'Select date';

		// If time is also selected, show both date and time
		if (selectedTimeInterval) {
			const timeInterval = TIME_INTERVALS.find(
				(ti) => ti.value === selectedTimeInterval
			);
			const timeLabel = timeInterval ? timeInterval.label : '';
			const dateStr = date.toLocaleDateString('en-US', {
				weekday: 'short',
				month: 'short',
				day: 'numeric',
			});
			return `${dateStr} • ${timeLabel}`;
		}

		// If only date is selected, show just date
		return date.toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
		});
	};

	const getTimeIntervalLabel = (interval: string) => {
		if (!interval) return 'Select time';
		const timeInterval = TIME_INTERVALS.find((ti) => ti.value === interval);
		return timeInterval ? timeInterval.label : 'Select time';
	};

	const navigateMonth = (direction: 'prev' | 'next') => {
		setCurrentMonth((prev) => {
			const newMonth = new Date(prev);
			if (direction === 'prev') {
				newMonth.setMonth(prev.getMonth() - 1);
			} else {
				newMonth.setMonth(prev.getMonth() + 1);
			}
			return newMonth;
		});
	};

	const getDaysInMonth = (date: Date) => {
		const year = date.getFullYear();
		const month = date.getMonth();
		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);
		const daysInMonth = lastDay.getDate();

		// Get first day of week (0 = Sunday, 1 = Monday, etc.)
		let firstDayOfWeek = firstDay.getDay();
		// Convert to Monday = 0, Sunday = 6
		firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

		const days: (Date | null)[] = [];

		// Add empty cells for days before the first day of the month
		for (let i = 0; i < firstDayOfWeek; i++) {
			days.push(null);
		}

		// Add all days of the month
		for (let day = 1; day <= daysInMonth; day++) {
			days.push(new Date(year, month, day));
		}

		return days;
	};

	const handleDateSelect = (date: Date) => {
		setSelectedDate(date);
		setIsDatePickerOpen(false);
	};

	const handleTimeIntervalSelect = (interval: string) => {
		setSelectedTimeInterval(interval);
		setIsTimePickerOpen(false);
	};

	const isPastDate = (date: Date) => {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		return date < today;
	};

	const isToday = (date: Date) => {
		const today = new Date();
		return (
			date.getDate() === today.getDate() &&
			date.getMonth() === today.getMonth() &&
			date.getFullYear() === today.getFullYear()
		);
	};

	const isSelectedDate = (date: Date) => {
		if (!selectedDate) return false;
		return (
			date.getDate() === selectedDate.getDate() &&
			date.getMonth() === selectedDate.getMonth() &&
			date.getFullYear() === selectedDate.getFullYear()
		);
	};

	return (
		<div
			className={`bg-white rounded-xl p-6 shadow-lg ${className}`}
			role="search"
			aria-label="Appointment booking form"
		>
			{/* Tabs */}
			<div className="flex mb-4">
				<button
					onClick={() => setActiveTab('treatments')}
					className={`flex items-center space-x-2 px-3 py-2 text-sm font-medium transition-colors ${
						activeTab === 'treatments'
							? 'border-b-2 border-red-500 text-red-500'
							: 'text-gray-600 hover:text-gray-800'
					}`}
				>
					<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
						<path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					<span>Treatments</span>
				</button>
				<button
					onClick={() => setActiveTab('salon')}
					className={`flex items-center space-x-2 px-3 py-2 text-sm font-medium transition-colors ${
						activeTab === 'salon'
							? 'border-b-2 border-red-500 text-red-500'
							: 'text-gray-600 hover:text-gray-800'
					}`}
				>
					<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
						<path
							fillRule="evenodd"
							d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-6a1 1 0 00-1-1H9a1 1 0 00-1 1v6a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z"
							clipRule="evenodd"
						/>
					</svg>
					<span>Salon Name</span>
				</button>
			</div>

			{/* Input Fields */}
			<div className="space-y-3">
				{/* Search by treatment or salon */}
				<div className="relative">
					{activeTab === 'treatments' ? (
						<ServiceAutocomplete
							value={searchQuery}
							onChange={setSearchQuery}
							placeholder="Search for treatments"
							className="w-full text-sm py-3"
						/>
					) : (
						<>
							<input
								type="text"
								placeholder="Search for salon name"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="w-full px-4 py-3 pl-12 pr-12 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 text-sm"
							/>
							<svg
								className="absolute left-4 top-3.5 h-5 w-5 text-gray-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
								/>
							</svg>
							{/* Clear button for salon search */}
							{searchQuery && (
								<button
									onClick={handleClearSearch}
									className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
									type="button"
								>
									<svg
										className="w-4 h-4 text-gray-400 hover:text-gray-600"
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
							)}
						</>
					)}
				</div>

				{/* Location Input - только для Treatments */}
				{activeTab === 'treatments' && (
					<div className="relative">
						{/* Current Location Button */}
						{showCurrentLocation && (
							<button
								onClick={handleCurrentLocation}
								className="w-full mb-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 hover:bg-blue-100 transition-colors flex items-center justify-center space-x-2 text-sm"
							>
								<svg
									className="w-4 h-4"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
									/>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
									/>
								</svg>
								<span className="text-xs font-medium">
									Use Current Location
								</span>
							</button>
						)}

						{/* Address Autocomplete */}
						<div className="relative">
							<AddressAutocomplete
								value={selectedLocation}
								onChange={(address) => {
									setSelectedLocation(address);
									setShowCurrentLocation(false);
								}}
								placeholder="Enter address"
								className="w-full px-4 py-3 pl-12 pr-12 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 text-sm"
							/>
							<svg
								className="absolute left-4 top-3.5 h-5 w-5 text-gray-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
								/>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
								/>
							</svg>
						</div>
					</div>
				)}

				{/* Date Picker - только для Treatments */}
				{activeTab === 'treatments' && (
					<div className="relative" ref={datePickerRef}>
						<button
							onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
							className="w-full px-4 py-3 pl-12 pr-12 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 text-left flex items-center justify-between text-sm"
						>
							<span
								className={selectedDate ? 'text-gray-900' : 'text-gray-500'}
							>
								{formatDateDisplay(selectedDate)}
							</span>
							<div className="flex items-center space-x-2">
								{/* Clear button for date */}
								{selectedDate && (
									<button
										onClick={(e) => {
											e.stopPropagation();
											handleClearDate();
										}}
										className="p-1 hover:bg-gray-100 rounded-full transition-colors"
										type="button"
									>
										<svg
											className="w-4 h-4 text-gray-400 hover:text-gray-600"
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
								)}
								<svg
									className={`w-5 h-5 text-gray-400 transition-transform ${
										isDatePickerOpen ? 'rotate-180' : ''
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
							</div>
						</button>
						<svg
							className="absolute left-4 top-3.5 h-5 w-5 text-gray-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
							/>
						</svg>

						{/* Date Picker Calendar */}
						{isDatePickerOpen && (
							<div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 p-4">
								{/* Calendar Header */}
								<div className="flex items-center justify-between mb-3">
									<button
										onClick={() => navigateMonth('prev')}
										className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
									>
										<svg
											className="w-4 h-4 text-gray-700"
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
									<h3 className="text-lg font-semibold text-gray-900">
										{currentMonth.toLocaleDateString('en-US', {
											month: 'long',
											year: 'numeric',
										})}
									</h3>
									<button
										onClick={() => navigateMonth('next')}
										className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
									>
										<svg
											className="w-4 h-4 text-gray-700"
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

								{/* Calendar Grid */}
								<div className="grid grid-cols-7 gap-1 mb-2">
									{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(
										(day) => (
											<div
												key={day}
												className="h-10 flex items-center justify-center text-sm font-medium text-gray-500"
											>
												{day}
											</div>
										)
									)}
								</div>

								<div className="grid grid-cols-7 gap-1">
									{getDaysInMonth(currentMonth).map((day, index) => (
										<div key={index} className="aspect-square">
											{day ? (
												<button
													onClick={() => handleDateSelect(day)}
													disabled={isPastDate(day)}
													className={`w-full h-full rounded-lg text-sm font-medium transition-colors ${
														isSelectedDate(day)
															? 'bg-[#ff5b5b] text-white'
															: isToday(day)
																? 'bg-white text-gray-900 border-2 border-[#ff5b5b]'
																: isPastDate(day)
																	? 'text-gray-300 cursor-not-allowed'
																	: 'text-gray-900 hover:bg-gray-100'
													}`}
												>
													{day.getDate()}
												</button>
											) : (
												<div></div>
											)}
										</div>
									))}
								</div>
							</div>
						)}
					</div>
				)}

				{/* Time Interval Picker - только для Treatments */}
				{activeTab === 'treatments' && (
					<div className="relative" ref={timePickerRef}>
						<button
							onClick={() => setIsTimePickerOpen(!isTimePickerOpen)}
							className="w-full px-4 py-3 pl-12 pr-12 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 text-left flex items-center justify-between text-sm"
						>
							<span
								className={
									selectedTimeInterval ? 'text-gray-900' : 'text-gray-500'
								}
							>
								{getTimeIntervalLabel(selectedTimeInterval)}
							</span>
							<div className="flex items-center space-x-2">
								{/* Clear button for time */}
								{selectedTimeInterval && (
									<button
										onClick={(e) => {
											e.stopPropagation();
											handleClearTime();
										}}
										className="p-1 hover:bg-gray-100 rounded-full transition-colors"
										type="button"
									>
										<svg
											className="w-4 h-4 text-gray-400 hover:text-gray-600"
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
								)}
								<svg
									className={`w-5 h-5 text-gray-400 transition-transform ${
										isTimePickerOpen ? 'rotate-180' : ''
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
							</div>
						</button>
						<svg
							className="absolute left-4 top-3.5 h-5 w-5 text-gray-400"
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

						{/* Time Interval Picker */}
						{isTimePickerOpen && (
							<div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 p-4">
								<div className="text-center mb-3">
									<h3 className="text-lg font-semibold text-gray-900">Time</h3>
								</div>
								<div className="space-y-2">
									{TIME_INTERVALS.map((interval) => (
										<button
											key={interval.value}
											onClick={() => handleTimeIntervalSelect(interval.value)}
											className={`w-full px-4 py-3 text-left rounded-lg border transition-colors ${
												selectedTimeInterval === interval.value
													? 'bg-[#ff5b5b] text-white border-[#ff5b5b]'
													: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
											}`}
										>
											{interval.label}
										</button>
									))}
								</div>
							</div>
						)}
					</div>
				)}
			</div>

			{/* Search Button */}
			<button
				onClick={handleSearch}
				className="w-full bg-red-500 text-white py-3 rounded-lg font-medium hover:bg-red-600 transition-colors mt-4 text-sm"
			>
				Search
			</button>
		</div>
	);
}
