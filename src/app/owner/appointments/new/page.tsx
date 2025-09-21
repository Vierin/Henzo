'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useServices } from '@/hooks/useServices';
import { useStaffBySalon } from '@/hooks/useStaff';

export default function NewAppointmentPage() {
	const [formData, setFormData] = useState({
		clientName: '',
		clientPhone: '',
		clientEmail: '',
		serviceId: '',
		staffId: '',
		date: '',
		time: '',
		notes: '',
	});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	// Временное решение - используем salonId = "1" для тестирования
	const salonId = '1';
	const [selectedDate, setSelectedDate] = useState(new Date());
	const [currentMonth, setCurrentMonth] = useState(new Date());
	const [availableSlots, setAvailableSlots] = useState([]);
	const router = useRouter();

	// Используем новые хуки для получения данных
	const {
		data: services = [],
		isLoading: servicesLoading,
		error: servicesError,
	} = useServices(salonId);

	const {
		data: staff = [],
		isLoading: staffLoading,
		error: staffError,
	} = useStaffBySalon(salonId);

	const dataLoading = servicesLoading || staffLoading;

	// Initialize available slots for today
	useEffect(() => {
		if (selectedDate) {
			setAvailableSlots(generateTimeSlots(selectedDate));
		}
	}, [selectedDate]);

	// Generate available time slots for selected date
	const generateTimeSlots = (date: Date) => {
		const slots = [];
		const startHour = 9; // 9 AM
		const endHour = 18; // 6 PM
		const slotDuration = 60; // 60 minutes

		for (let hour = startHour; hour < endHour; hour++) {
			const timeString = `${hour.toString().padStart(2, '0')}:00`;
			const displayTime = new Date(2000, 0, 1, hour).toLocaleTimeString(
				'en-US',
				{
					hour: '2-digit',
					minute: '2-digit',
					hour12: false,
				}
			);

			slots.push({
				value: timeString,
				display: displayTime,
				available: Math.random() > 0.3, // Random availability for demo
			});
		}

		return slots;
	};

	// Generate calendar days for current month
	const generateCalendarDays = () => {
		const year = currentMonth.getFullYear();
		const month = currentMonth.getMonth();
		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);
		const startDate = new Date(firstDay);
		startDate.setDate(startDate.getDate() - firstDay.getDay());

		const days = [];
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		for (let i = 0; i < 42; i++) {
			const date = new Date(startDate);
			date.setDate(startDate.getDate() + i);

			const isCurrentMonth = date.getMonth() === month;
			const isToday = date.getTime() === today.getTime();
			const isSelected = selectedDate.getTime() === date.getTime();
			const isPast = date < today;

			days.push({
				date,
				isCurrentMonth,
				isToday,
				isSelected,
				isPast,
			});
		}

		return days;
	};

	// Handle date selection
	const handleDateSelect = (date: Date) => {
		if (date < new Date().setHours(0, 0, 0, 0)) return; // Don't allow past dates

		setSelectedDate(date);
		setFormData({ ...formData, date: date.toISOString().split('T')[0] });
		setAvailableSlots(generateTimeSlots(date));
	};

	// Handle time slot selection
	const handleTimeSelect = (time: string) => {
		setFormData({ ...formData, time });
	};

	// Navigate months
	const navigateMonth = (direction: 'prev' | 'next') => {
		const newMonth = new Date(currentMonth);
		if (direction === 'prev') {
			newMonth.setMonth(newMonth.getMonth() - 1);
		} else {
			newMonth.setMonth(newMonth.getMonth() + 1);
		}
		setCurrentMonth(newMonth);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError('');

		// Validate form
		if (
			!formData.clientName ||
			!formData.clientPhone ||
			!formData.serviceId ||
			!formData.staffId ||
			!formData.date ||
			!formData.time
		) {
			setError('Please fill in all required fields');
			setLoading(false);
			return;
		}

		try {
			// Save appointment to database
			const response = await fetch('/api/appointments', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					...formData,
					salonId: '1', // TODO: Get from user context
				}),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to create appointment');
			}

			// Redirect to appointments page or dashboard
			router.push('/');
		} catch (err: any) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-[#fff7f6]">
			{/* Header */}
			<header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-[#f1d9d7]">
				<div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="h-8 w-8 rounded-full bg-[#ff5b5b]" />
						<span className="text-xl font-semibold">Henzo</span>
					</div>
					<nav className="hidden md:flex items-center gap-8 text-[15px]">
						<a className="text-[#6b6b6b] hover:text-black" href="/">
							Dashboard
						</a>
						<a className="text-[#6b6b6b] hover:text-black" href="#">
							Calendar
						</a>
						<a className="text-[#6b6b6b] hover:text-black" href="#">
							Customers
						</a>
						<a className="text-[#6b6b6b] hover:text-black" href="#">
							Reports
						</a>
						<a className="text-[#6b6b6b] hover:text-black" href="#">
							Marketing
						</a>
					</nav>
					<div className="flex items-center gap-4">
						<button
							aria-label="notifications"
							className="h-9 w-9 rounded-full border border-[#ead2d0] grid place-items-center text-[#6b6b6b]"
						>
							🔔
						</button>
						<div className="h-9 w-9 rounded-full bg-[#ffd6d2]" />
						<button
							onClick={async () => {
								window.location.href = '/login';
							}}
							className="text-sm text-[#6b6b6b] hover:text-black"
						>
							Logout
						</button>
					</div>
				</div>
			</header>

			<main className="mx-auto max-w-2xl px-6 py-8">
				<div className="mb-8">
					<button
						onClick={() => router.back()}
						className="flex items-center gap-2 text-[#6b6b6b] hover:text-black mb-4"
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
								d="M15 19l-7-7 7-7"
							/>
						</svg>
						Back
					</button>
					<h1 className="text-3xl font-bold text-gray-900 mb-2">
						New Appointment
					</h1>
					<p className="text-gray-600">
						Schedule a new appointment for a client with your salon services.
					</p>
				</div>

				{dataLoading ? (
					<div className="bg-white rounded-xl border border-[#f1d9d7] p-6">
						<div className="flex items-center justify-center py-8">
							<div className="text-center">
								<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff5b5b] mx-auto mb-4"></div>
								<p className="text-gray-600">Loading services and staff...</p>
							</div>
						</div>
					</div>
				) : (
					<div className="bg-white rounded-xl border border-[#f1d9d7] p-6">
						<form onSubmit={handleSubmit} className="space-y-6">
							{/* Client Information Section */}
							<div>
								<h3 className="text-lg font-semibold text-gray-900 mb-4">
									Client Information
								</h3>
								<div className="space-y-4">
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											Client Name *
										</label>
										<input
											type="text"
											required
											value={formData.clientName}
											onChange={(e) =>
												setFormData({ ...formData, clientName: e.target.value })
											}
											className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
											placeholder="Enter client's full name"
										/>
									</div>

									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div>
											<label className="block text-sm font-medium text-gray-700 mb-2">
												Phone Number *
											</label>
											<input
												type="tel"
												required
												value={formData.clientPhone}
												onChange={(e) =>
													setFormData({
														...formData,
														clientPhone: e.target.value,
													})
												}
												className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
												placeholder="+1 (555) 123-4567"
											/>
										</div>
										<div>
											<label className="block text-sm font-medium text-gray-700 mb-2">
												Email
											</label>
											<input
												type="email"
												value={formData.clientEmail}
												onChange={(e) =>
													setFormData({
														...formData,
														clientEmail: e.target.value,
													})
												}
												className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
												placeholder="client@email.com"
											/>
										</div>
									</div>
								</div>
							</div>

							{/* Service and Staff Selection */}
							<div>
								<h3 className="text-lg font-semibold text-gray-900 mb-4">
									Service & Staff
								</h3>
								<div className="space-y-4">
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											Service *
										</label>
										<select
											required
											value={formData.serviceId}
											onChange={(e) =>
												setFormData({ ...formData, serviceId: e.target.value })
											}
											className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
										>
											<option value="">Select a service</option>
											{services.map((service) => (
												<option key={service.id} value={service.id}>
													{service.name} - {service.duration}min - $
													{service.price}
												</option>
											))}
										</select>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											Staff Member *
										</label>
										<select
											required
											value={formData.staffId}
											onChange={(e) =>
												setFormData({ ...formData, staffId: e.target.value })
											}
											className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
										>
											<option value="">Select a staff member</option>
											{staff.map((member) => (
												<option key={member.id} value={member.id}>
													{member.name} - {member.role}
												</option>
											))}
										</select>
									</div>
								</div>
							</div>

							{/* Date and Time Selection */}
							<div>
								<h3 className="text-lg font-semibold text-gray-900 mb-4">
									Select a date and time
								</h3>
								<div className="bg-[#f8f6f4] rounded-xl p-6">
									<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
										{/* Calendar */}
										<div>
											<div className="flex items-center justify-between mb-4">
												<h4 className="text-lg font-semibold text-gray-900">
													{currentMonth.toLocaleDateString('en-US', {
														month: 'long',
														year: 'numeric',
													})}
												</h4>
												<div className="flex gap-2">
													<button
														type="button"
														onClick={() => navigateMonth('prev')}
														className="p-2 hover:bg-gray-200 rounded-md transition-colors"
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
																d="M15 19l-7-7 7-7"
															/>
														</svg>
													</button>
													<button
														type="button"
														onClick={() => navigateMonth('next')}
														className="p-2 hover:bg-gray-200 rounded-md transition-colors"
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
																d="M9 5l7 7-7 7"
															/>
														</svg>
													</button>
												</div>
											</div>

											{/* Days of week */}
											<div className="grid grid-cols-7 gap-1 mb-2">
												{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(
													(day, index) => (
														<div
															key={`day-${index}`}
															className="text-center text-sm font-medium text-gray-600 py-2"
														>
															{day}
														</div>
													)
												)}
											</div>

											{/* Calendar grid */}
											<div className="grid grid-cols-7 gap-1">
												{generateCalendarDays().map((day, index) => (
													<button
														key={index}
														type="button"
														onClick={() => handleDateSelect(day.date)}
														disabled={day.isPast || !day.isCurrentMonth}
														className={`
														h-10 w-10 rounded-full text-sm font-medium transition-colors
														${
															day.isSelected
																? 'bg-[#8B4513] text-white'
																: day.isToday
																	? 'bg-[#ff5b5b] text-white'
																	: day.isCurrentMonth
																		? 'text-gray-900 hover:bg-gray-200'
																		: 'text-gray-400'
														}
														${day.isPast ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
													`}
													>
														{day.date.getDate()}
													</button>
												))}
											</div>
										</div>

										{/* Available Times */}
										<div>
											<h4 className="text-lg font-semibold text-gray-900 mb-4">
												Available Times on{' '}
												{selectedDate.toLocaleDateString('en-US', {
													month: 'long',
													day: 'numeric',
													year: 'numeric',
												})}
											</h4>
											<div className="grid grid-cols-2 gap-3">
												{availableSlots.map((slot) => (
													<button
														key={slot.value}
														type="button"
														onClick={() => handleTimeSelect(slot.value)}
														disabled={!slot.available}
														className={`
														px-4 py-3 rounded-lg text-sm font-medium transition-colors
														${
															formData.time === slot.value
																? 'bg-[#8B4513] text-white'
																: slot.available
																	? 'bg-white text-gray-900 hover:bg-gray-50 border border-gray-200'
																	: 'bg-gray-100 text-gray-400 cursor-not-allowed'
														}
													`}
													>
														{slot.display}
													</button>
												))}
											</div>
										</div>
									</div>
								</div>
							</div>

							{/* Additional Notes */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Notes
								</label>
								<textarea
									rows={3}
									value={formData.notes}
									onChange={(e) =>
										setFormData({ ...formData, notes: e.target.value })
									}
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
									placeholder="Any special requests or notes for this appointment..."
								/>
							</div>

							{error && (
								<div className="text-red-600 text-sm text-center bg-red-50 border border-red-200 rounded-md p-3">
									{error}
								</div>
							)}

							<div className="flex gap-4 pt-6">
								<button
									type="button"
									onClick={() => router.back()}
									className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={loading || !formData.date || !formData.time}
									className="flex-1 bg-[#8B4513] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#6B3410] focus:outline-none focus:ring-2 focus:ring-[#8B4513] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
								>
									{loading ? 'Creating...' : 'Book Appointment'}
								</button>
							</div>
						</form>
					</div>
				)}
			</main>
		</div>
	);
}
