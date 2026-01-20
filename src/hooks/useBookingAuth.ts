import { useState } from 'react';
import { Service, WorkingHours } from '@/types';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import toast from 'react-hot-toast';
import { fromZonedTime } from 'date-fns-tz';

interface UseBookingAuthProps {
	salonId?: string;
	salonName?: string;
	salonTimezone?: string;
	salonWorkingHours?: WorkingHours | null;
	selectedService: Service | null;
	selectedDate: string;
	selectedTime: string;
	selectedStaff: string;
	clientEmail: string;
	clientName: string;
	clientPhone: string;
	isOwner: boolean;
	isOwnerOfThisSalon: () => boolean;
	editingBooking?: any;
	t: (key: string) => string;
}

export function useBookingAuth({
	salonId,
	salonName,
	salonTimezone = 'Asia/Ho_Chi_Minh',
	salonWorkingHours,
	selectedService,
	selectedDate,
	selectedTime,
	selectedStaff,
	clientEmail,
	clientName,
	clientPhone,
	isOwner,
	isOwnerOfThisSalon,
	editingBooking,
	t,
}: UseBookingAuthProps) {
	const [showLoginModal, setShowLoginModal] = useState(false);
	const [showMagicLinkSent, setShowMagicLinkSent] = useState(false);
	const [guestEmail, setGuestEmail] = useState('');
	const [pendingBookingData, setPendingBookingData] = useState<{
		service: Service;
		date: string;
		time: string;
		staff: string;
		notes?: string;
	} | null>(null);
	const { user, isClient, refreshUser } = useAuthStore();

	// Check if client is authenticated
	const checkClientAuth = (): boolean => {
		if (isOwner && isOwnerOfThisSalon()) {
			return true;
		}
		if (isOwner && !isOwnerOfThisSalon()) {
			return false;
		}
		return isClient;
	};

	// Create UTC date time string for API
	const createBookingDateTimeUTC = (
		dateStr: string,
		timeStr: string,
		timezone: string = salonTimezone
	): string => {
		const [year, month, day] = dateStr.split('-').map(Number);
		const [hours, minutes] = timeStr.split(':').map(Number);

		if (isNaN(year) || isNaN(month) || isNaN(day)) {
			throw new Error(`Invalid date format: ${dateStr}`);
		}

		if (isNaN(hours) || isNaN(minutes)) {
			throw new Error(`Invalid time format: ${timeStr}`);
		}

		const localDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
		const utcDate = fromZonedTime(localDate, timezone);
		const utcDateString = utcDate.toISOString();

		logger.log('Creating UTC date string (salon timezone):', {
			dateStr,
			timeStr,
			timezone,
			selectedTime: `${hours}:${minutes}`,
			localDateComponents: { year, month, day, hours, minutes },
			utcTime: utcDateString,
		});

		return utcDateString;
	};

	// Handle magic link sending
	const handleSendMagicLink = async (email: string) => {
		try {
			const API_BASE_URL =
				process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

			const bookingData = {
				serviceId: pendingBookingData?.service?.id || selectedService?.id,
				staffId: pendingBookingData?.staff === t('booking.anyStaff')
					? undefined
					: undefined, // Will be resolved from staff name
				time: createBookingDateTimeUTC(
					pendingBookingData?.date || selectedDate,
					pendingBookingData?.time || selectedTime,
					salonTimezone
				),
				salonId: salonId,
				clientEmail: email.trim(),
				clientName: '',
				clientPhone: '',
			};

			const response = await fetch(`${API_BASE_URL}/bookings/send-magic-link`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					email: email.trim(),
					bookingData,
				}),
			});

			if (!response.ok) {
				const error = await response.json();

				if (
					response.status === 409 &&
					(error.code === 'USER_EXISTS' || error.error_code === 'USER_EXISTS')
				) {
					const userExistsError: any = new Error(
						error.msg ||
							error.message ||
							'An account with this email already exists. Please login with your password.'
					);
					userExistsError.code = 'USER_EXISTS';
					userExistsError.email = email.trim();
					throw userExistsError;
				}

				throw new Error(
					error.msg || error.message || 'Failed to send magic link'
				);
			}

			setGuestEmail(email.trim());
			setShowMagicLinkSent(true);
			toast.success(t('booking.confirmationEmailSent'));
		} catch (error: any) {
			logger.error('Error sending magic link:', error);

			if (
				error &&
				typeof error === 'object' &&
				'code' in error &&
				error.code === 'USER_EXISTS'
			) {
				throw error;
			}

			toast.error(
				error instanceof Error ? error.message : t('booking.failedToSendEmail')
			);
			throw error;
		}
	};

	// Prepare booking data for pending booking
	const preparePendingBookingData = () => {
		if (!selectedService || !selectedDate || !selectedTime) {
			return null;
		}

		return {
			service: selectedService,
			date: selectedDate,
			time: selectedTime,
			staff: selectedStaff,
			notes: '',
		};
	};

	// Check if booking requires authentication
	const requiresAuth = (): boolean => {
		if (editingBooking) {
			return false; // Editing doesn't require client auth
		}
		if (isOwner && isOwnerOfThisSalon()) {
			return false; // Owner can book in their own salon
		}
		return !checkClientAuth();
	};

	return {
		showLoginModal,
		setShowLoginModal,
		showMagicLinkSent,
		setShowMagicLinkSent,
		guestEmail,
		setGuestEmail,
		pendingBookingData,
		setPendingBookingData,
		checkClientAuth,
		handleSendMagicLink,
		preparePendingBookingData,
		requiresAuth,
		createBookingDateTimeUTC,
		user,
		isClient,
		refreshUser,
	};
}

