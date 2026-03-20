import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { apiClient } from '@/lib/api-client';
import { WorkingHours } from '@/types';
import { logger } from '@/lib/logger';

interface UseBookingDataProps {
	salonId?: string;
	isOpen: boolean;
	selectedDate: string;
}

export function useBookingData({
	salonId,
	isOpen,
	selectedDate,
}: UseBookingDataProps) {
	const [salonWorkingHours, setSalonWorkingHours] =
		useState<WorkingHours | null>(null);
	const [salonTimezone, setSalonTimezone] =
		useState<string>('Asia/Ho_Chi_Minh');
	const [existingBookings, setExistingBookings] = useState<any[]>([]);
	const [bookingsLoaded, setBookingsLoaded] = useState(true);
	const [bookingsLoadError, setBookingsLoadError] = useState(false);

	// Load salon data when modal opens
	useEffect(() => {
		if (isOpen && salonId) {
			fetchSalonData();
		}
	}, [isOpen, salonId]);

	// Load existing bookings when date changes
	useEffect(() => {
		if (selectedDate && salonId) {
			fetchExistingBookings(selectedDate);
		}
	}, [selectedDate, salonId]);

	const fetchSalonData = async () => {
		try {
			if (salonId) {
				const data = await apiClient.get<{
					workingHours?: WorkingHours;
					timezone?: string;
				}>(`/salons/${salonId}`);
				if (data) {
					if (data.workingHours) setSalonWorkingHours(data.workingHours);
					if (data.timezone) setSalonTimezone(data.timezone);
				}
			} else {
				const responseData = await apiClient.get<{
					success?: boolean;
					data?: { workingHours?: WorkingHours; timezone?: string };
				}>('/salons/current');
				if (responseData?.success && responseData.data) {
					if (responseData.data.workingHours)
						setSalonWorkingHours(responseData.data.workingHours);
					if (responseData.data.timezone)
						setSalonTimezone(responseData.data.timezone);
				}
			}
		} catch (error) {
			logger.warn('Could not fetch salon data, using defaults', error);
		}
	};

	const fetchExistingBookings = async (date: string) => {
		if (!salonId || !date) return;

		try {
			const bookings = await apiClient.get<any[]>(
				`/bookings?salonId=${salonId}&date=${date}`
			);
			setExistingBookings(bookings ?? []);
			setBookingsLoaded(true);
			setBookingsLoadError(false);
		} catch (error: any) {
			if (error?.status === 401) {
				try {
					const publicBookings = await apiClient.get<any[]>(
						`/bookings/public?salonId=${salonId}&date=${date}`
					);
					setExistingBookings(publicBookings ?? []);
					setBookingsLoaded(true);
					setBookingsLoadError(false);
				} catch {
					setExistingBookings([]);
					setBookingsLoadError(true);
				}
			} else {
				logger.error('Error fetching existing bookings:', error);
				setExistingBookings([]);
				setBookingsLoadError(true);
			}
		}
	};

	return {
		salonWorkingHours,
		setSalonWorkingHours,
		salonTimezone,
		existingBookings,
		bookingsLoaded,
		bookingsLoadError,
	};
}
