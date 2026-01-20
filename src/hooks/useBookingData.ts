import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { WorkingHours } from '@/types';
import { logger } from '@/lib/logger';

interface UseBookingDataProps {
	salonId?: string;
	isOpen: boolean;
	selectedDate: string;
}

export function useBookingData({ salonId, isOpen, selectedDate }: UseBookingDataProps) {
	const [salonWorkingHours, setSalonWorkingHours] = useState<WorkingHours | null>(null);
	const [salonTimezone, setSalonTimezone] = useState<string>('Asia/Ho_Chi_Minh');
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
			const API_BASE_URL =
				process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

			if (salonId) {
				const response = await fetch(`${API_BASE_URL}/salons/${salonId}`);
				if (response.ok) {
					const data = await response.json();
					if (data) {
						if (data.workingHours) {
							setSalonWorkingHours(data.workingHours);
						}
						if (data.timezone) {
							setSalonTimezone(data.timezone);
						}
					}
				}
			} else {
				const {
					data: { session },
				} = await supabase.auth.getSession();

				if (!session?.access_token) {
					logger.warn('No session found for fetching salon data');
					return;
				}

				const response = await fetch(`${API_BASE_URL}/salons/current`, {
					headers: {
						Authorization: `Bearer ${session.access_token}`,
					},
				});

				if (!response.ok) {
					logger.warn('Could not fetch salon data, using defaults');
					return;
				}

				const responseData = await response.json();
				if (responseData.success && responseData.data) {
					if (responseData.data.workingHours) {
						setSalonWorkingHours(responseData.data.workingHours);
					}
					if (responseData.data.timezone) {
						setSalonTimezone(responseData.data.timezone);
					}
				}
			}
		} catch (error) {
			logger.error('Error fetching salon data:', error);
		}
	};

	const fetchExistingBookings = async (date: string) => {
		if (!salonId || !date) return;

		try {
			const API_BASE_URL =
				process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

			const { data: session } = await supabase.auth.getSession();

			const headers: HeadersInit = {
				'Content-Type': 'application/json',
			};

			if (session?.session?.access_token) {
				headers.Authorization = `Bearer ${session.session.access_token}`;
			}

			const response = await fetch(
				`${API_BASE_URL}/bookings?salonId=${salonId}&date=${date}`,
				{
					method: 'GET',
					headers,
				}
			);

			if (response.ok) {
				const bookings = await response.json();
				logger.log('Fetched existing bookings:', bookings);
				setExistingBookings(bookings);
				setBookingsLoaded(true);
				setBookingsLoadError(false);
			} else if (response.status === 401) {
				logger.warn('Unauthorized, trying to fetch public bookings...');
				const publicResponse = await fetch(
					`${API_BASE_URL}/bookings/public?salonId=${salonId}&date=${date}`
				);

				if (publicResponse.ok) {
					const bookings = await publicResponse.json();
					setExistingBookings(bookings);
					setBookingsLoaded(true);
					setBookingsLoadError(false);
				} else {
					logger.warn('Could not fetch public bookings either');
					setExistingBookings([]);
					setBookingsLoadError(true);
				}
			} else {
				logger.warn('Could not fetch existing bookings:', response.status);
				setExistingBookings([]);
				setBookingsLoadError(true);
			}
		} catch (error) {
			logger.error('Error fetching existing bookings:', error);
			setExistingBookings([]);
			setBookingsLoadError(true);
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

