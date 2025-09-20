'use client';

import React, { useState } from 'react';

interface BookingModalProps {
	isOpen: boolean;
	onClose: () => void;
	service?: {
		name: string;
		description: string;
		duration: string;
		price: string;
	};
}

export default function BookingModal({
	isOpen,
	onClose,
	service,
}: BookingModalProps) {
	const [selectedDate, setSelectedDate] = useState('Wed 16');
	const [selectedTime, setSelectedTime] = useState('12:00 PM');
	const [selectedStaff, setSelectedStaff] = useState('Any Staff');
	const [isStaffDropdownOpen, setIsStaffDropdownOpen] = useState(false);
	const [currentDateIndex, setCurrentDateIndex] = useState(0); // Start from the beginning

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

	const dates = generateDates();
	const timeSlots = [
		'10:00 AM',
		'11:00 AM',
		'12:00 PM',
		'1:00 PM',
		'2:00 PM',
		'3:00 PM',
	];
	const staffMembers = [
		{ id: 'any', name: 'Any Staff', icon: '👥' },
		{ id: 'emily', name: 'Emily Carter', avatar: '👩‍🦱' },
		{ id: 'sophia', name: 'Sophia Bennett', avatar: '👩‍🦳' },
	];

	const handleDateNavigation = (direction: 'prev' | 'next') => {
		if (direction === 'prev' && currentDateIndex > 0) {
			setCurrentDateIndex(currentDateIndex - 1);
		} else if (direction === 'next' && currentDateIndex < dates.length - 5) {
			setCurrentDateIndex(currentDateIndex + 1);
		}
	};

	const visibleDates = dates.slice(currentDateIndex, currentDateIndex + 5);

	// Set initial selected date to today
	React.useEffect(() => {
		const today = new Date();
		const todayString = today.toLocaleDateString('en-US', {
			weekday: 'short',
			day: 'numeric',
		});
		setSelectedDate(todayString);
	}, []);

	const handleBooking = () => {
		// Handle booking logic here
		console.log('Booking:', {
			service,
			selectedDate,
			selectedTime,
			selectedStaff,
		});
		onClose();
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
			className="fixed inset-0 bg-[#F8F5F2] bg-opacity-80 flex items-center justify-center z-50 p-4"
			onClick={handleClickOutside}
		>
			<div
				className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative"
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
				<div className="flex">
					{/* Left Section - Service Details, Date, and Time Selection */}
					<div className="flex-1 p-8">
						{/* Header */}
						<div className="flex items-center gap-3 mb-6">
							<div className="h-8 w-8 rounded-full bg-[#ff5b5b]" />
							<span className="text-xl font-semibold text-gray-900">Henzo</span>
						</div>

						{/* Service Details */}
						<div className="mb-8">
							<h2 className="text-2xl font-bold text-gray-900 mb-2">
								{service?.name || 'Lychee Peel Facial'}
							</h2>
							<p className="text-gray-700 mb-4">
								{service?.description ||
									'A rejuvenating facial treatment using natural lychee extracts to exfoliate and brighten the skin.'}
							</p>
							<div className="flex items-center gap-6">
								<div className="flex items-center gap-2">
									<span className="text-gray-500">🕒</span>
									<span className="text-sm text-gray-600">
										{service?.duration || '60 min'}
									</span>
								</div>
								<div className="flex items-center gap-2">
									<span className="text-gray-500">$</span>
									<span className="text-lg font-bold text-[#8B4513]">
										{service?.price || '$120'}
									</span>
								</div>
							</div>
						</div>

						{/* Select Date */}
						<div className="mb-8">
							<h3 className="text-lg font-bold text-gray-900 mb-4">
								Select Date
							</h3>
							<div className="flex items-center gap-2">
								<button
									onClick={() => handleDateNavigation('prev')}
									disabled={currentDateIndex === 0}
									className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
								>
									<svg
										className="w-5 h-5"
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
								<div className="flex gap-2 flex-1">
									{visibleDates.map((dateObj) => (
										<button
											key={dateObj.display}
											onClick={() => setSelectedDate(dateObj.display)}
											className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
												selectedDate === dateObj.display
													? 'bg-[#ff5b5b] text-white'
													: dateObj.isToday
														? 'bg-[#8B4513] text-white border-2 border-[#6B3410]'
														: 'bg-white text-gray-900 border border-gray-200 hover:bg-gray-50'
											}`}
											title={dateObj.full}
										>
											{dateObj.display}
										</button>
									))}
								</div>
								<button
									onClick={() => handleDateNavigation('next')}
									disabled={currentDateIndex >= dates.length - 5}
									className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
								>
									<svg
										className="w-5 h-5"
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

						{/* Select Time */}
						<div className="mb-8">
							<h3 className="text-lg font-bold text-gray-900 mb-4">
								Select a Time
							</h3>
							<div className="grid grid-cols-3 gap-3">
								{timeSlots.map((time) => (
									<button
										key={time}
										onClick={() => setSelectedTime(time)}
										className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
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

					{/* Right Section - Staff Selection and Booking Button */}
					<div className="w-80 bg-gray-50 p-8 rounded-r-2xl">
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
												{staffMembers.find((s) => s.name === selectedStaff)
													?.icon ||
													staffMembers.find((s) => s.name === selectedStaff)
														?.avatar}
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
										{staffMembers.map((staff) => (
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
														{staff.icon || staff.avatar}
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
							className="w-full bg-[#ff5b5b] text-white py-4 rounded-lg font-semibold text-lg hover:bg-[#e04a4a] transition-colors"
						>
							Book Appointment - {service?.price || '$120'}
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
		</div>
	);
}
