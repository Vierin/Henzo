import { useState, useEffect } from 'react';
import { Service, WorkingHours } from '@/types';
import { storage } from '@/utils/storage';
import { logger } from '@/lib/logger';
import toast from 'react-hot-toast';

interface BookingState {
	selectedService: Service | null;
	selectedDate: string;
	selectedTime: string;
	selectedStaff: string;
	salonWorkingHours: WorkingHours | null;
}

interface UseBookingStateProps {
	salonId?: string;
	initialService?: Service;
	initialWorkingHours?: WorkingHours;
}

export function useBookingState({
	salonId,
	initialService,
	initialWorkingHours,
}: UseBookingStateProps) {
	const [selectedService, setSelectedService] = useState<Service | null>(
		initialService || null
	);
	const [selectedDate, setSelectedDate] = useState('');
	const [selectedTime, setSelectedTime] = useState('');
	const [selectedStaff, setSelectedStaff] = useState('Any Staff Member');
	const [salonWorkingHours, setSalonWorkingHours] = useState<WorkingHours | null>(
		initialWorkingHours || null
	);

	// Save booking state to localStorage
	const saveBookingState = (salonName?: string) => {
		const bookingState = {
			service: selectedService,
			date: selectedDate,
			time: selectedTime,
			staff: selectedStaff,
			salonId: salonId,
			salonName: salonName,
			workingHours: salonWorkingHours,
			timestamp: Date.now(),
			returnUrl: window.location.href,
		};
		storage.setItem('pendingBooking', JSON.stringify(bookingState));
	};

	// Restore booking state from localStorage
	const restoreBookingState = (): boolean => {
		const pendingBooking = storage.getItem('pendingBooking');
		if (pendingBooking) {
			try {
				const bookingData = JSON.parse(pendingBooking);
				// Check if data is older than 1 hour
				const isExpired = Date.now() - bookingData.timestamp > 60 * 60 * 1000;

				if (!isExpired && bookingData.salonId === salonId) {
					setSelectedService(bookingData.service);
					setSelectedDate(bookingData.date);
					setSelectedTime(bookingData.time);
					setSelectedStaff(bookingData.staff);
					setSalonWorkingHours(bookingData.workingHours);

					toast.success('Booking details restored!');
					storage.removeItem('pendingBooking');
					return true;
				} else {
					storage.removeItem('pendingBooking');
				}
			} catch (error) {
				logger.error('Error restoring booking state:', error);
				storage.removeItem('pendingBooking');
			}
		}
		return false;
	};

	// Reset all state
	const resetState = () => {
		setSelectedService(null);
		setSelectedDate('');
		setSelectedTime('');
		setSelectedStaff('Any Staff Member');
	};

	return {
		selectedService,
		setSelectedService,
		selectedDate,
		setSelectedDate,
		selectedTime,
		setSelectedTime,
		selectedStaff,
		setSelectedStaff,
		salonWorkingHours,
		setSalonWorkingHours,
		saveBookingState,
		restoreBookingState,
		resetState,
	};
}

