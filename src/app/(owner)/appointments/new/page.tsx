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
	const generateTimeSlots = (_date: Date) => {
		const slots = [];
		const startHour = 9;
		const endHour = 18;
		const slotDuration = 30; // minutes

		for (let hour = startHour; hour < endHour; hour++) {
			for (let minute = 0; minute < 60; minute += slotDuration) {
				const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
				const displayTime = new Date();
				displayTime.setHours(hour, minute, 0, 0);

				slots.push({
					value: timeString,
					display: displayTime.toLocaleTimeString('en-US', {
						hour: '2-digit',
						minute: '2-digit',
						hour12: false,
					}),
					available: Math.random() > 0.3, // Random availability for demo
				});
			}
		}

		return slots;
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
			// Create appointment
			const response = await fetch('/api/appointments', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					...formData,
					salonId,
					appointmentDateTime: new Date(
						`${formData.date}T${formData.time}`
					).toISOString(),
				}),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to create appointment');
			}

			// Redirect to appointments list
			router.push('/dashboard');
		} catch (err: any) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	const handleInputChange = (
		e: React.ChangeEvent<
			HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
		>
	) => {
		const { name, value } = e.target;
		setFormData((prev) => ({
			...prev,
			[name]: value,
		}));
	};

	const handleDateSelect = (date: Date) => {
		setSelectedDate(date);
		setFormData((prev) => ({
			...prev,
			date: date.toISOString().split('T')[0],
		}));
	};

	const handleTimeSelect = (time: string) => {
		setFormData((prev) => ({
			...prev,
			time,
		}));
	};

	const getDaysInMonth = (date: Date) => {
		const year = date.getFullYear();
		const month = date.getMonth();
		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);
		const daysInMonth = lastDay.getDate();
		const startingDayOfWeek = firstDay.getDay();

		const days = [];

		// Add empty cells for days before the first day of the month
		for (let i = 0; i < startingDayOfWeek; i++) {
			days.push(null);
		}

		// Add days of the month
		for (let day = 1; day <= daysInMonth; day++) {
			days.push(new Date(year, month, day));
		}

		return days;
	};

	const navigateMonth = (direction: 'prev' | 'next') => {
		const newMonth = new Date(currentMonth);
		newMonth.setMonth(
			currentMonth.getMonth() + (direction === 'next' ? 1 : -1)
		);
		setCurrentMonth(newMonth);
	};

	const formatDate = (date: Date) => {
		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
		});
	};

	const isToday = (date: Date) => {
		const today = new Date();
		return date.toDateString() === today.toDateString();
	};

	const isSelected = (date: Date) => {
		return selectedDate.toDateString() === date.toDateString();
	};

	const isPast = (date: Date) => {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		return date < today;
	};

	if (dataLoading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff5b5b]"></div>
			</div>
		);
	}

	return (
		<div>
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
					Schedule a new appointment for your client
				</p>
			</div>

			<form onSubmit={handleSubmit} className="space-y-8">
				{/* Client Information */}
				<div className="bg-white rounded-xl border border-[#f1d9d7] p-6">
					<h2 className="text-xl font-semibold text-gray-900 mb-6">
						Client Information
					</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Client Name *
							</label>
							<input
								type="text"
								name="clientName"
								value={formData.clientName}
								onChange={handleInputChange}
								required
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
								placeholder="Enter client name"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Phone Number *
							</label>
							<input
								type="tel"
								name="clientPhone"
								value={formData.clientPhone}
								onChange={handleInputChange}
								required
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
								placeholder="+1 (555) 123-4567"
							/>
						</div>
						<div className="md:col-span-2">
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Email Address
							</label>
							<input
								type="email"
								name="clientEmail"
								value={formData.clientEmail}
								onChange={handleInputChange}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
								placeholder="client@example.com"
							/>
						</div>
					</div>
				</div>

				{/* Service and Staff Selection */}
				<div className="bg-white rounded-xl border border-[#f1d9d7] p-6">
					<h2 className="text-xl font-semibold text-gray-900 mb-6">
						Service & Staff
					</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Service *
							</label>
							<select
								name="serviceId"
								value={formData.serviceId}
								onChange={handleInputChange}
								required
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
							>
								<option value="">Select a service</option>
								{services.map((service) => (
									<option key={service.id} value={service.id}>
										{service.name} - ${service.price} ({service.duration} min)
									</option>
								))}
							</select>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Staff Member *
							</label>
							<select
								name="staffId"
								value={formData.staffId}
								onChange={handleInputChange}
								required
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
							>
								<option value="">Select a staff member</option>
								{staff.map((member) => (
									<option key={member.id} value={member.id}>
										{member.name} ({member.accessLevel})
									</option>
								))}
							</select>
						</div>
					</div>
				</div>

				{/* Date and Time Selection */}
				<div className="bg-white rounded-xl border border-[#f1d9d7] p-6">
					<h2 className="text-xl font-semibold text-gray-900 mb-6">
						Date & Time
					</h2>
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
						{/* Calendar */}
						<div>
							<h3 className="text-lg font-medium text-gray-900 mb-4">
								Select Date
							</h3>
							<div className="border border-gray-200 rounded-lg p-4">
								{/* Calendar Header */}
								<div className="flex items-center justify-between mb-4">
									<button
										type="button"
										onClick={() => navigateMonth('prev')}
										className="p-2 hover:bg-gray-100 rounded-md"
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
									<h4 className="text-lg font-semibold text-gray-900">
										{formatDate(currentMonth)}
									</h4>
									<button
										type="button"
										onClick={() => navigateMonth('next')}
										className="p-2 hover:bg-gray-100 rounded-md"
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

								{/* Calendar Grid */}
								<div className="grid grid-cols-7 gap-1 mb-2">
									{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(
										(day) => (
											<div
												key={day}
												className="p-2 text-center text-sm font-medium text-gray-500"
											>
												{day}
											</div>
										)
									)}
								</div>
								<div className="grid grid-cols-7 gap-1">
									{getDaysInMonth(currentMonth).map((day, index) => (
										<button
											key={index}
											type="button"
											onClick={() => day && handleDateSelect(day)}
											disabled={!day || isPast(day)}
											className={`
												p-2 text-sm rounded-md transition-colors
												${
													!day
														? ''
														: isPast(day)
															? 'text-gray-300 cursor-not-allowed'
															: isSelected(day)
																? 'bg-[#ff5b5b] text-white'
																: isToday(day)
																	? 'bg-gray-100 text-gray-900 hover:bg-gray-200'
																	: 'text-gray-700 hover:bg-gray-100'
												}
											`}
										>
											{day?.getDate()}
										</button>
									))}
								</div>
							</div>
						</div>

						{/* Time Slots */}
						<div>
							<h3 className="text-lg font-medium text-gray-900 mb-4">
								Select Time
							</h3>
							<div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
								{availableSlots.map((slot) => (
									<button
										key={slot.value}
										type="button"
										onClick={() => handleTimeSelect(slot.value)}
										disabled={!slot.available}
										className={`
											p-3 text-sm rounded-md border transition-colors
											${
												!slot.available
													? 'border-gray-200 text-gray-400 cursor-not-allowed'
													: formData.time === slot.value
														? 'bg-[#ff5b5b] text-white border-[#ff5b5b]'
														: 'border-gray-300 text-gray-700 hover:border-[#ff5b5b] hover:bg-[#ff5b5b]/5'
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

				{/* Notes */}
				<div className="bg-white rounded-xl border border-[#f1d9d7] p-6">
					<h2 className="text-xl font-semibold text-gray-900 mb-6">
						Additional Notes
					</h2>
					<textarea
						name="notes"
						value={formData.notes}
						onChange={handleInputChange}
						rows={4}
						className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
						placeholder="Any special requests or notes for this appointment..."
					/>
				</div>

				{error && (
					<div className="bg-red-50 border border-red-200 rounded-md p-4">
						<div className="flex">
							<div className="flex-shrink-0">
								<svg
									className="h-5 w-5 text-red-400"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fillRule="evenodd"
										d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
										clipRule="evenodd"
									/>
								</svg>
							</div>
							<div className="ml-3">
								<h3 className="text-sm font-medium text-red-800">Error</h3>
								<div className="mt-2 text-sm text-red-700">
									<p>{error}</p>
								</div>
							</div>
						</div>
					</div>
				)}

				{/* Submit Button */}
				<div className="flex justify-end gap-4">
					<button
						type="button"
						onClick={() => router.back()}
						className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={loading}
						className="bg-[#ff5b5b] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#e04a4a] focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:ring-offset-2 disabled:opacity-50"
					>
						{loading ? 'Creating...' : 'Create Appointment'}
					</button>
				</div>
			</form>
		</div>
	);
}
