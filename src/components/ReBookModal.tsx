'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Salon {
	id: string;
	name: string;
	address?: string;
	workingHours?: any;
}

interface Service {
	id: string;
	name: string;
	duration: number;
	price: number;
}

interface ReBookModalProps {
	isOpen: boolean;
	onClose: () => void;
	salon: Salon;
	service: Service;
	onSuccess?: () => void;
}

export default function ReBookModal({
	isOpen,
	onClose,
	salon,
	service,
	onSuccess,
}: ReBookModalProps) {
	const [selectedDate, setSelectedDate] = useState('');
	const [selectedTime, setSelectedTime] = useState('');
	const [availableSlots, setAvailableSlots] = useState<string[]>([]);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState('');

	// Generate available dates (next 30 days)
	const generateAvailableDates = () => {
		const dates = [];
		const today = new Date();

		for (let i = 1; i <= 30; i++) {
			const date = new Date(today);
			date.setDate(today.getDate() + i);

			// Skip if salon is closed on this day
			const dayName = date
				.toLocaleDateString('en-US', {
					weekday: 'long',
				})
				.toLowerCase();
			const isClosed = salon.workingHours?.[dayName]?.closed;

			if (!isClosed) {
				dates.push({
					value: date.toISOString().split('T')[0],
					label: date.toLocaleDateString('en-US', {
						weekday: 'long',
						month: 'long',
						day: 'numeric',
					}),
				});
			}
		}

		return dates;
	};

	// Generate time slots based on salon working hours
	const generateTimeSlots = (dateStr: string) => {
		if (!dateStr || !salon.workingHours) return [];

		const selectedDate = new Date(dateStr);
		const dayName = selectedDate
			.toLocaleDateString('en-US', {
				weekday: 'long',
			})
			.toLowerCase();
		const workingDay = salon.workingHours[dayName];

		if (!workingDay || workingDay.closed) return [];

		const slots = [];
		const startTime = workingDay.open;
		const endTime = workingDay.close;

		if (startTime && endTime) {
			const [startHour] = startTime.split(':').map(Number);
			const [endHour] = endTime.split(':').map(Number);

			for (let hour = startHour; hour < endHour; hour++) {
				slots.push(`${hour.toString().padStart(2, '0')}:00`);
				slots.push(`${hour.toString().padStart(2, '0')}:30`);
			}
		}

		return slots;
	};

	useEffect(() => {
		if (selectedDate) {
			const slots = generateTimeSlots(selectedDate);
			setAvailableSlots(slots);
			setSelectedTime(''); // Reset time when date changes
		}
	}, [selectedDate]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');

		if (!selectedDate || !selectedTime) {
			setError('Please select both date and time');
			return;
		}

		setIsSubmitting(true);

		try {
			const bookingDateTime = new Date(`${selectedDate}T${selectedTime}`);

			// Get auth token
			const { supabase } = await import('@/lib/supabase');
			const {
				data: { session },
			} = await supabase.auth.getSession();

			if (!session?.access_token) {
				throw new Error('You must be logged in to book an appointment');
			}

			const response = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/bookings`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${session.access_token}`,
					},
					body: JSON.stringify({
						salonId: salon.id,
						serviceId: service.id,
						time: bookingDateTime.toISOString(),
					}),
				}
			);

			if (!response.ok) {
				throw new Error('Failed to create booking');
			}

			onSuccess?.();
			onClose();
		} catch (err: unknown) {
			setError(
				err instanceof Error ? err.message : 'Failed to book appointment'
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	if (!isOpen) return null;

	const availableDates = generateAvailableDates();

	return (
		<div className="fixed inset-0 bg-black/60 bg-opacity-50 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-xl p-6 w-full max-w-md">
				<h2 className="text-2xl font-bold text-gray-900 mb-4">
					Book Again - {salon.name}
				</h2>

				<p className="text-gray-600 mb-4">
					Service: <strong>{service.name}</strong> (
					{service.price.toLocaleString()}₫, {service.duration} min)
				</p>

				<form onSubmit={handleSubmit} className="space-y-4">
					{/* Date Selection */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Select Date
						</label>
						<select
							value={selectedDate}
							onChange={(e) => setSelectedDate(e.target.value)}
							className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent"
							required
						>
							<option value="">Choose a date</option>
							{availableDates.map((date) => (
								<option key={date.value} value={date.value}>
									{date.label}
								</option>
							))}
						</select>
					</div>

					{/* Time Selection */}
					{selectedDate && (
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Select Time
							</label>
							<select
								value={selectedTime}
								onChange={(e) => setSelectedTime(e.target.value)}
								className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent"
								required
							>
								<option value="">Choose a time</option>
								{availableSlots.map((slot) => (
									<option key={slot} value={slot}>
										{slot}
									</option>
								))}
							</select>
						</div>
					)}

					{error && (
						<div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-md p-3">
							{error}
						</div>
					)}

					{/* Buttons */}
					<div className="flex gap-3 pt-4">
						<button
							type="button"
							onClick={onClose}
							className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={isSubmitting || !selectedDate || !selectedTime}
							className="flex-1 bg-[#ff5b5b] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#e04a4a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isSubmitting ? 'Booking...' : 'Book Appointment'}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
