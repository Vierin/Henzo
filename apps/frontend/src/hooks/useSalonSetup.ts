import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { extractLocaleFromPath, withLocale } from '@/i18n/routing';
import { useAuth } from '@/lib/auth-unified';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';
import { useTranslation } from '@/contexts/LanguageContext';
import { useErrorHandler } from '@/hooks/useErrorHandler';

export interface SalonSetupData {
	// Step 1: General Information
	name: string;
	address: string;
	addressLat?: number;
	addressLon?: number;

	// Step 2: Working Hours
	workingHours: {
		monday: { open: string; close: string; closed: boolean };
		tuesday: { open: string; close: string; closed: boolean };
		wednesday: { open: string; close: string; closed: boolean };
		thursday: { open: string; close: string; closed: boolean };
		friday: { open: string; close: string; closed: boolean };
		saturday: { open: string; close: string; closed: boolean };
		sunday: { open: string; close: string; closed: boolean };
	};
}

const DEFAULT_WORKING_HOURS = {
	monday: { open: '09:00', close: '18:00', closed: false },
	tuesday: { open: '09:00', close: '18:00', closed: false },
	wednesday: { open: '09:00', close: '18:00', closed: false },
	thursday: { open: '09:00', close: '18:00', closed: false },
	friday: { open: '09:00', close: '18:00', closed: false },
	saturday: { open: '09:00', close: '17:00', closed: false },
	sunday: { open: '09:00', close: '17:00', closed: true },
};

export function useSalonSetup() {
	const router = useRouter();
	const pathname = usePathname();
	const queryClient = useQueryClient();
	const { user, isAuthenticated, isLoading } = useAuth();
	const { handleError } = useErrorHandler({ showToast: false });
	const t = useTranslation();

	const [currentStep, setCurrentStep] = useState(1);
	const [loading, setLoading] = useState(false);
	const [errors, setErrors] = useState<{ [key: string]: string }>({});
	const [isUpdatingAddress, setIsUpdatingAddress] = useState(false);
	const addressUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);
	const nameInputRef = useRef<HTMLInputElement>(null);

	const [formData, setFormData] = useState<SalonSetupData>({
		name: '',
		address: '',
		addressLat: undefined,
		addressLon: undefined,
		workingHours: DEFAULT_WORKING_HOURS,
	});

	const steps = useMemo(
		() => [
			{ number: 1, title: t('business.completeSetup.steps.1') },
			{ number: 2, title: t('business.completeSetup.steps.2') },
			{ number: 3, title: t('business.completeSetup.steps.3') },
		],
		[t]
	);

	// Memoize map props to prevent unnecessary re-renders
	const mapProps = useMemo(() => {
		return {
			lat: formData.addressLat,
			lon: formData.addressLon,
			address: formData.address,
		};
	}, [formData.addressLat, formData.addressLon, formData.address]);

	// Cleanup timer on unmount
	useEffect(() => {
		return () => {
			if (addressUpdateTimerRef.current) {
				clearTimeout(addressUpdateTimerRef.current);
			}
		};
	}, []);

	// Redirect if not authenticated or not a business user
	useEffect(() => {
		if (isLoading) return;

		if (!isAuthenticated || !user) {
			router.push('/business/register');
			return;
		}

		if (user.role !== 'OWNER') {
			router.push('/business/register');
			return;
		}

		// Check if user already has a salon
		const checkExistingSalon = async () => {
			try {
				const responseData = await apiClient.get<{
					success: boolean;
					data?: any;
				}>('/salons/current');

				if (responseData?.success && responseData?.data) {
					const locale = extractLocaleFromPath(pathname) ?? 'en';
					await queryClient.invalidateQueries({ queryKey: ['salons'] });
					await queryClient.invalidateQueries({ queryKey: ['salon'] });
					await new Promise((resolve) => setTimeout(resolve, 100));
					router.replace(
						withLocale('/owner-dashboard', locale as 'en' | 'ru' | 'vi')
					);
				}
			} catch (error: any) {
				// Salon doesn't exist, continue with setup
			}
		};

		checkExistingSalon();
	}, [user, isAuthenticated, isLoading, router, pathname, queryClient]);

	const handleMarkerMove = useCallback(
		(lat: number, lon: number, address?: string) => {
			setFormData((prev) => ({
				...prev,
				addressLat: lat,
				addressLon: lon,
			}));

			if (addressUpdateTimerRef.current) {
				clearTimeout(addressUpdateTimerRef.current);
			}

			if (address) {
				setFormData((prev) => ({
					...prev,
					address,
				}));
				setIsUpdatingAddress(false);
			} else {
				setIsUpdatingAddress(true);
				addressUpdateTimerRef.current = setTimeout(async () => {
					try {
						const result = await apiClient.get<{ address: string }>(
							`/mapbox/reverse-geocode?lat=${lat}&lon=${lon}`
						);
						if (result?.address) {
							setFormData((prev) => ({
								...prev,
								address: result.address,
							}));
						}
					} catch (error) {
						// Failed to reverse geocode, continue with coordinates only
					} finally {
						setIsUpdatingAddress(false);
					}
				}, 500);
			}
		},
		[]
	);

	const handleInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
			const { name, value } = e.target;
			setFormData((prev) => ({
				...prev,
				[name]: value,
			}));
			if (errors[name]) {
				setErrors((prev) => ({
					...prev,
					[name]: '',
				}));
			}
		},
		[errors]
	);


	const handleWorkingHoursChange = useCallback(
		(workingHours: typeof formData.workingHours) => {
			setFormData((prev) => ({
				...prev,
				workingHours,
			}));
		},
		[]
	);



	const handleAddressChange = useCallback((address: string) => {
		if (addressUpdateTimerRef.current) {
			clearTimeout(addressUpdateTimerRef.current);
			addressUpdateTimerRef.current = null;
		}
		setIsUpdatingAddress(false);
		setFormData((prev) => ({ ...prev, address }));
		if (errors.address) {
			setErrors((prev) => ({ ...prev, address: '' }));
		}
	}, [errors]);

	const handleAddressSelect = useCallback((address: string, lat: number, lon: number) => {
		if (addressUpdateTimerRef.current) {
			clearTimeout(addressUpdateTimerRef.current);
			addressUpdateTimerRef.current = null;
		}
		setIsUpdatingAddress(false);
		setFormData((prev) => ({
			...prev,
			address,
			addressLat: lat,
			addressLon: lon,
		}));
		if (errors.address) {
			setErrors((prev) => ({ ...prev, address: '' }));
		}
	}, [errors]);

	const validateStep = useCallback(
		(step: number): boolean => {
			const newErrors: { [key: string]: string } = {};

			switch (step) {
				case 1:
					if (!formData.name.trim())
						newErrors.name = t('business.completeSetup.errors.nameRequired');
					if (!formData.address.trim())
						newErrors.address = t('business.completeSetup.errors.addressRequired');
					break;
				case 2:
					// No validation needed for step 2 (working hours)
					break;
			}

			setErrors(newErrors);

			if (Object.keys(newErrors).length > 0) {
				const firstErrorField = Object.keys(newErrors)[0];
				setTimeout(() => {
					if (firstErrorField === 'name' && nameInputRef.current) {
						nameInputRef.current.focus();
					} else if (firstErrorField === 'address') {
						const addressInput = document.querySelector(
							'input[placeholder*="salon address"], input[placeholder*="адрес"], input[placeholder*="địa chỉ"]'
						) as HTMLInputElement;
						if (addressInput) {
							addressInput.focus();
						}
					}
				}, 100);
			}

			return Object.keys(newErrors).length === 0;
		},
		[formData, t]
	);

	const nextStep = useCallback(() => {
		if (validateStep(currentStep)) {
			setCurrentStep((prev) => Math.min(prev + 1, steps.length));
		}
	}, [currentStep, validateStep, steps.length]);

	const prevStep = useCallback(() => {
		setCurrentStep((prev) => Math.max(prev - 1, 1));
	}, []);

	const handleSubmit = useCallback(async () => {
		if (!validateStep(currentStep)) {
			return;
		}

		setLoading(true);

		try {
			const salonData = {
				name: formData.name.trim(),
				address: formData.address.trim(),
				latitude: formData.addressLat || undefined,
				longitude: formData.addressLon || undefined,
				workingHours: formData.workingHours,
			};

			await apiClient.post('/salons/current', salonData);

			await queryClient.invalidateQueries({ queryKey: ['salons'] });
			await queryClient.invalidateQueries({ queryKey: ['salon'] });

			toast.success(t('business.completeSetup.success.salonSetupCompleted'));

			await new Promise((resolve) => setTimeout(resolve, 100));

			const locale = extractLocaleFromPath(pathname) ?? 'en';
			router.push(withLocale('/owner-dashboard', locale as 'en' | 'ru' | 'vi'));
		} catch (error: any) {
			const errorMessage =
				error.message || t('business.completeSetup.error.failedToCompleteSetup');
			handleError(error, errorMessage);
			toast.error(errorMessage);
		} finally {
			setLoading(false);
		}
	}, [formData, currentStep, validateStep, pathname, router, queryClient, t, handleError]);

	return {
		// State
		formData,
		currentStep,
		loading,
		errors,
		isUpdatingAddress,
		isLoading,
		isAuthenticated,
		user,
		steps,
		mapProps,

		// Refs
		nameInputRef,

		// Handlers
		handleInputChange,
		handleMarkerMove,
		handleAddressChange,
		handleAddressSelect,
		handleWorkingHoursChange,
		nextStep,
		prevStep,
		handleSubmit,
		validateStep,
	};
}

