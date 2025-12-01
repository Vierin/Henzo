'use client';

import { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { extractLocaleFromPath, withLocale } from '@/i18n/routing';
import { useAuth } from '@/lib/auth-unified';
import { useQueryClient } from '@tanstack/react-query';
import { STATIC_CATEGORIES } from '@/constants/categories';
import { checkLocationMatch } from '@/constants/locations';
import MapboxAddressAutocomplete from '@/components/MapboxAddressAutocomplete';
import WorkingHoursSection from '@/components/WorkingHoursSection';
import EnhancedFileUpload from '@/components/EnhancedFileUpload';
import EnhancedPhotoUpload from '@/components/EnhancedPhotoUpload';
import dynamic from 'next/dynamic';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/api-client';

const MapComponentWithCoords = dynamic(
	() => import('@/components/MapComponentWithCoords'),
	{ ssr: false }
);

interface SalonSetupData {
	// Step 1: General Information
	name: string;
	address: string;
	addressLat?: number;
	addressLon?: number;
	phone: string;

	// Step 2: Categories
	categories: number[];

	// Step 3: Working Hours
	workingHours: {
		monday: { open: string; close: string; closed: boolean };
		tuesday: { open: string; close: string; closed: boolean };
		wednesday: { open: string; close: string; closed: boolean };
		thursday: { open: string; close: string; closed: boolean };
		friday: { open: string; close: string; closed: boolean };
		saturday: { open: string; close: string; closed: boolean };
		sunday: { open: string; close: string; closed: boolean };
	};

	// Step 4: Branding
	description: string;
	logo: string | null;
	photos: string[];
	socialMedia: {
		website: string;
		instagram: string;
	};
}

const WEEKDAYS = [
	{ key: 'monday', label: 'Monday' },
	{ key: 'tuesday', label: 'Tuesday' },
	{ key: 'wednesday', label: 'Wednesday' },
	{ key: 'thursday', label: 'Thursday' },
	{ key: 'friday', label: 'Friday' },
	{ key: 'saturday', label: 'Saturday' },
	{ key: 'sunday', label: 'Sunday' },
];

function BusinessCompleteSetupContent() {
	const router = useRouter();
	const pathname = usePathname();
	const queryClient = useQueryClient();
	const { user, isAuthenticated, isLoading } = useAuth();
	const [currentStep, setCurrentStep] = useState(1);
	const [loading, setLoading] = useState(false);
	const [errors, setErrors] = useState<{ [key: string]: string }>({});
	const [isUpdatingAddress, setIsUpdatingAddress] = useState(false);
	const addressUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);

	// Memoize marker move handler to prevent unnecessary re-renders
	const handleMarkerMove = useCallback(
		(lat: number, lon: number, address?: string) => {
			// Update coordinates immediately
			setFormData((prev) => ({
				...prev,
				addressLat: lat,
				addressLon: lon,
			}));

			// Debounce address update to avoid too many requests
			if (addressUpdateTimerRef.current) {
				clearTimeout(addressUpdateTimerRef.current);
			}

			if (address) {
				// If address is already provided from reverse geocoding, update immediately
				setFormData((prev) => ({
					...prev,
					address,
				}));
				setIsUpdatingAddress(false);
			} else {
				// Show loading indicator
				setIsUpdatingAddress(true);

				// Debounce reverse geocoding request (500ms delay)
				addressUpdateTimerRef.current = setTimeout(async () => {
					try {
						const API_BASE_URL =
							process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
						const response = await fetch(
							`${API_BASE_URL}/mapbox/reverse-geocode?lat=${lat}&lon=${lon}`
						);

						if (response.ok) {
							const result = await response.json();
							if (result?.address) {
								setFormData((prev) => ({
									...prev,
									address: result.address,
								}));
							}
						}
					} catch (error) {
						console.error('Failed to reverse geocode:', error);
					} finally {
						setIsUpdatingAddress(false);
					}
				}, 500);
			}
		},
		[]
	);

	const [formData, setFormData] = useState<SalonSetupData>({
		name: '',
		address: '',
		addressLat: undefined,
		addressLon: undefined,
		phone: '',
		categories: [],
		workingHours: {
			monday: { open: '09:00', close: '18:00', closed: false },
			tuesday: { open: '09:00', close: '18:00', closed: false },
			wednesday: { open: '09:00', close: '18:00', closed: false },
			thursday: { open: '09:00', close: '18:00', closed: false },
			friday: { open: '09:00', close: '18:00', closed: false },
			saturday: { open: '09:00', close: '17:00', closed: false },
			sunday: { open: '09:00', close: '17:00', closed: true },
		},
		description: '',
		logo: null,
		photos: [],
		socialMedia: {
			website: '',
			instagram: '',
		},
	});

	const steps = [
		{ number: 1, title: 'General Information' },
		{ number: 2, title: 'Categories' },
		{ number: 3, title: 'Working Hours' },
		{ number: 4, title: 'Branding' },
		{ number: 5, title: 'Confirmation & Review' },
	];

	// Memoize map props to prevent unnecessary re-renders
	const mapProps = useMemo(
		() => ({
			lat: formData.addressLat,
			lon: formData.addressLon,
			address: formData.address,
		}),
		[formData.addressLat, formData.addressLon, formData.address]
	);

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
		// Wait for auth to load
		if (isLoading) return;

		// Check authentication
		if (!isAuthenticated || !user) {
			router.push('/business/register');
			return;
		}

		// Check if user is an owner
		if (user.role !== 'OWNER') {
			router.push('/business/register');
			return;
		}

		// Check if user already has a salon
		const checkExistingSalon = async () => {
			try {
				// Use apiClient which handles errors and adds auth token automatically
				const responseData = await apiClient.get<{
					success: boolean;
					data?: any;
				}>('/salons/current');

				if (responseData?.success && responseData?.data) {
					// Салон существует - редиректим на дашборд
					const locale = extractLocaleFromPath(pathname) ?? 'en';
					
					// Invalidate queries before redirect
					await queryClient.invalidateQueries({ queryKey: ['salons'] });
					await queryClient.invalidateQueries({ queryKey: ['salon'] });

					// Small delay to ensure queries are invalidated
					await new Promise((resolve) => setTimeout(resolve, 100));

					router.replace(withLocale('/owner-dashboard', locale as 'en' | 'ru' | 'vi'));
					return;
				}
			} catch (error: any) {
				// Если ошибка (например, салон не найден или сеть недоступна), 
				// просто продолжаем - пользователь останется на странице настройки
				// Это нормально, т.к. если салона нет, пользователь должен его создать
			}
		};

		checkExistingSalon();
	}, [user, isAuthenticated, isLoading, router]);

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
		if (errors[name]) {
			setErrors((prev) => ({
				...prev,
				[name]: '',
			}));
		}
	};

	const handleSocialMediaChange = (platform: string, value: string) => {
		setFormData((prev) => ({
			...prev,
			socialMedia: {
				...prev.socialMedia,
				[platform]: value,
			},
		}));
	};

	const handleWorkingHoursChange = (
		workingHours: typeof formData.workingHours
	) => {
		setFormData((prev) => ({
			...prev,
			workingHours,
		}));
	};

	const handleCategoryToggle = (categoryId: number) => {
		setFormData((prev) => ({
			...prev,
			categories: prev.categories.includes(categoryId)
				? prev.categories.filter((id) => id !== categoryId)
				: [...prev.categories, categoryId],
		}));
		if (errors.categories) {
			setErrors((prev) => ({
				...prev,
				categories: '',
			}));
		}
	};

	const handleLogoChange = (filePath: string) => {
		setFormData((prev) => ({
			...prev,
			logo: filePath,
		}));
	};

	const handleLogoRemove = () => {
		setFormData((prev) => ({
			...prev,
			logo: null,
		}));
	};

	const handlePhotosChange = (photos: string[]) => {
		setFormData((prev) => ({
			...prev,
			photos,
		}));
	};

	const validateStep = (step: number): boolean => {
		const newErrors: { [key: string]: string } = {};

		switch (step) {
			case 1:
				if (!formData.name.trim()) newErrors.name = 'Salon name is required';
				if (!formData.address.trim()) newErrors.address = 'Address is required';
				if (!formData.phone.trim())
					newErrors.phone = 'Phone number is required';
				break;
			case 2:
				if (formData.categories.length === 0)
					newErrors.categories = 'Please select at least one category';
				break;
			case 3:
				// Working hours validation is optional, they have defaults
				break;
			case 4:
				// Branding is optional, can be skipped
				break;
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const nextStep = () => {
		if (validateStep(currentStep)) {
			setCurrentStep((prev) => Math.min(prev + 1, steps.length));
		}
	};

	const prevStep = () => {
		setCurrentStep((prev) => Math.max(prev - 1, 1));
	};

	const skipStep = () => {
		setCurrentStep((prev) => Math.min(prev + 1, steps.length));
	};

	const handleSubmit = async () => {
		if (!validateStep(currentStep)) {
			return;
		}

		setLoading(true);

		try {
			// Get fresh session from Supabase
			const {
				data: { session: freshSession },
			} = await supabase.auth.getSession();
			if (!freshSession) {
				throw new Error('No active session found. Please log in again.');
			}

			const API_BASE_URL =
				process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

			// Create salon data with file paths
			const salonData = {
				name: formData.name.trim(),
				description: formData.description.trim() || null,
				// categoryIds removed: categories are derived from services
				address: formData.address.trim(),
				latitude: formData.addressLat || undefined,
				longitude: formData.addressLon || undefined,
				phone: formData.phone.trim(),
				website: formData.socialMedia.website.trim() || null,
				instagram: formData.socialMedia.instagram.trim() || null,
				workingHours: formData.workingHours,
				logo: formData.logo || null,
				photos: formData.photos,
			};

			const response = await fetch(`${API_BASE_URL}/salons/current`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${freshSession.access_token}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(salonData),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Failed to create salon');
			}

			// Invalidate salon queries to refresh data on owner-dashboard
			await queryClient.invalidateQueries({ queryKey: ['salons'] });
			await queryClient.invalidateQueries({ queryKey: ['salon'] });

			toast.success('Salon setup completed successfully!');

			// Small delay to ensure queries are invalidated before navigation
			await new Promise((resolve) => setTimeout(resolve, 100));

			const locale = extractLocaleFromPath(pathname) ?? 'en';
			router.push(withLocale('/owner-dashboard', locale as 'en' | 'ru' | 'vi'));
		} catch (error: any) {
			console.error('Error completing salon setup:', error);
			toast.error(error.message || 'Failed to complete salon setup');
		} finally {
			setLoading(false);
		}
	};

	const renderStepContent = () => {
		switch (currentStep) {
			case 1:
				return (
					<div className="space-y-6">
						{/* Salon Name */}
						<div className="relative">
							<label
								htmlFor="name"
								className="block text-sm font-medium text-gray-900 mb-2"
							>
								Salon Name
							</label>
							<input
								type="text"
								id="name"
								name="name"
								value={formData.name}
								onChange={handleInputChange}
								className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 bg-white focus:ring-[#F8F5F2] focus:border-transparent"
								placeholder="e.g., Henzo Beauty"
							/>
							{errors.name && (
								<p className="absolute -bottom-[1.4rem] right-0 text-sm text-red-400">
									{errors.name}
								</p>
							)}
						</div>

						{/* Salon Address */}
						<div className="relative">
							<label
								htmlFor="address"
								className="block text-sm font-medium text-gray-900 mb-2"
							>
								Salon Address
							</label>
							{/* Map above address field */}
							{mapProps.lat && mapProps.lon ? (
								<div className="mb-4 w-full aspect-[4/3] rounded-lg overflow-hidden border border-gray-200 shadow-sm">
									<MapComponentWithCoords
										lat={mapProps.lat}
										lon={mapProps.lon}
										address={mapProps.address}
										height="100%"
										zoom={16}
										interactive={true}
										showPopup={false}
										editable={true}
										onMarkerMove={handleMarkerMove}
										className="w-full h-full"
									/>
								</div>
							) : (
								<div className="mb-4 w-full aspect-[4/3] rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center">
									<p className="text-sm text-gray-400">
										Select address to see map
									</p>
								</div>
							)}
							{/* Address input field below map */}
							<div className="relative">
								<MapboxAddressAutocomplete
									value={formData.address}
									onChange={(address) => {
										// Clear loading indicator when user types manually
										if (addressUpdateTimerRef.current) {
											clearTimeout(addressUpdateTimerRef.current);
											addressUpdateTimerRef.current = null;
										}
										setIsUpdatingAddress(false);

										setFormData((prev) => ({ ...prev, address }));
										if (errors.address) {
											setErrors((prev) => ({ ...prev, address: '' }));
										}
									}}
									onAddressSelect={(address, lat, lon) => {
										// Clear any pending updates when selecting from autocomplete
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
									}}
									placeholder="Select your salon address"
									className="w-full h-13 px-4 py-3 rounded-lg text-gray-900 placeholder-gray-300 focus:ring-2 bg-white focus:ring-[#F8F5F2] focus:border-transparent"
									showIcon={false}
								/>
								{isUpdatingAddress && (
									<div className="absolute right-3 top-1/2 transform -translate-y-1/2">
										<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
									</div>
								)}
							</div>
							{errors.address && (
								<p className="absolute -bottom-[1.4rem] right-0 text-sm text-red-400">
									{errors.address}
								</p>
							)}
						</div>

						{/* Salon Phone Number */}
						<div className="relative">
							<label
								htmlFor="phone"
								className="block text-sm font-medium text-gray-900 mb-2"
							>
								Salon Phone Number
							</label>
							<input
								type="tel"
								id="phone"
								name="phone"
								value={formData.phone}
								onChange={handleInputChange}
								className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 bg-white focus:ring-[#F8F5F2] focus:border-transparent"
								placeholder="(123) 456-7890"
							/>
							{errors.phone && (
								<p className="absolute -bottom-[1.4rem] right-0 text-sm text-red-400">
									{errors.phone}
								</p>
							)}
						</div>
					</div>
				);

			case 2:
				return (
					<div className="space-y-6">
						<div>
							<label className="block text-sm font-medium text-gray-900 mb-4">
								Select Categories (Choose at least one)
							</label>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								{STATIC_CATEGORIES.map((category) => (
									<button
										key={category.id}
										type="button"
										onClick={() => handleCategoryToggle(category.id)}
										className={`p-4 border-1 rounded-lg text-left transition-all ${
											formData.categories.includes(category.id)
												? 'border-[#ff5b5b] bg-red-400/20'
												: 'border-gray-600 hover:border-gray-500 bg-white'
										}`}
									>
										<div className="flex items-center space-x-3">
											<div>
												<h3 className="font-bold text-gray-900">
													{category.name}
												</h3>
												<p className="text-sm text-gray-500">
													{category.description}
												</p>
											</div>
										</div>
									</button>
								))}
							</div>
							{errors.categories && (
								<p className="mt-2 text-sm text-red-400">{errors.categories}</p>
							)}
						</div>
					</div>
				);

			case 3:
				return (
					<div className="space-y-6">
						<WorkingHoursSection
							workingHours={formData.workingHours}
							onChange={handleWorkingHoursChange}
						/>
					</div>
				);

			case 4:
				return (
					<div className="space-y-6">
						<div>
							<label
								htmlFor="description"
								className="block text-sm font-medium text-gray-900 mb-2"
							>
								Salon Description (1-2 sentences)
							</label>
							<textarea
								id="description"
								name="description"
								rows={3}
								value={formData.description}
								onChange={handleInputChange}
								maxLength={250}
								className="w-full px-4 py-3 bg-white border border-gray-600 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent"
								placeholder="Describe your salon and what makes it special..."
							/>
							<div className="mt-1 flex justify-end">
								<span className="text-xs text-gray-400">
									{formData.description.length}/250
								</span>
							</div>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-900 mb-2">
								Logo Upload (Optional)
							</label>
							<EnhancedFileUpload
								onUpload={handleLogoChange}
								onRemove={handleLogoRemove}
								currentFile={formData.logo || undefined}
								accept="image/*"
								maxSize={2}
								placeholder="Upload salon logo"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-900 mb-2">
								Photos (Up to 3, Optional)
							</label>
							<EnhancedPhotoUpload
								photos={formData.photos}
								onPhotosChange={handlePhotosChange}
								maxPhotos={3}
								maxSize={2}
							/>
						</div>

						<div className="space-y-4">
							<label className="block text-sm font-medium text-gray-900 mb-2">
								Social Media (Optional)
							</label>
							<div>
								<input
									type="url"
									placeholder="Website URL"
									value={formData.socialMedia.website}
									onChange={(e) =>
										handleSocialMediaChange('website', e.target.value)
									}
									className="w-full px-4 py-3 bg-white border border-gray-600 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent mb-3"
								/>
								<input
									type="text"
									placeholder="Instagram handle (e.g., @yoursalon)"
									value={formData.socialMedia.instagram}
									onChange={(e) =>
										handleSocialMediaChange('instagram', e.target.value)
									}
									className="w-full px-4 py-3 bg-white border border-gray-600 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent"
								/>
							</div>
						</div>
					</div>
				);

			case 5:
				return (
					<div className="space-y-6">
						<div className="bg-white border-1 border-gray-300 rounded-lg p-6">
							<h3 className="text-lg font-semibold text-gray-900 mb-4">
								Review Your Information
							</h3>

							<div className="space-y-4 text-sm">
								<div>
									<span className="text-gray-500">Salon Name:</span>
									<span className="text-gray-900 ml-2">{formData.name}</span>
								</div>
								<div>
									<span className="text-gray-500">Address:</span>
									<span className="text-gray-900 ml-2">{formData.address}</span>
								</div>
								<div>
									<span className="text-gray-500">Phone:</span>
									<span className="text-gray-900 ml-2">{formData.phone}</span>
								</div>
								<div>
									<span className="text-gray-500">Categories:</span>
									<span className="text-gray-900 ml-2">
										{formData.categories
											.map(
												(id) =>
													STATIC_CATEGORIES.find((cat) => cat.id === id)?.name
											)
											.join(', ')}
									</span>
								</div>
								{formData.description && (
									<div>
										<span className="text-gray-500">Description:</span>
										<span className="text-gray-900 ml-2">
											{formData.description}
										</span>
									</div>
								)}
							</div>
						</div>

						<div className="bg-white border-1 border-gray-300 rounded-lg p-6">
							<h3 className="text-lg font-semibold text-gray-900 mb-4">
								Working Hours
							</h3>
							<div className="space-y-2 text-sm">
								{WEEKDAYS.map((day) => {
									const dayHours =
										formData.workingHours[
											day.key as keyof typeof formData.workingHours
										];
									return (
										<div key={day.key} className="flex justify-between">
											<span className="text-gray-500">{day.label}:</span>
											<span className="text-gray-900">
												{!dayHours.closed
													? `${dayHours.open} - ${dayHours.close}`
													: 'Closed'}
											</span>
										</div>
									);
								})}
							</div>
						</div>
					</div>
				);

			default:
				return null;
		}
	};

	if (isLoading || !isAuthenticated || !user) {
		return (
			<div className="min-h-screen bg-white flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff5b5b] mx-auto mb-4"></div>
					<p className="text-gray-900">Loading...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-[#F8F5F2] py-12 px-4 sm:px-6 lg:px-8">
			<div className="max-w-2xl mx-auto">
				{/* Header */}
				<div className="text-center mb-8">
					<h1 className="text-3xl font-bold text-gray-900 mb-2">
						Complete Your Salon Setup
					</h1>
					<p className="text-gray-500">
						Let's get your business ready for clients.
					</p>
				</div>

				{/* Form Card */}
				<div className="bg-white rounded-xl shadow-lg p-8">
					{/* Progress */}
					<div className="flex justify-between items-center mb-6">
						<span className="text-gray-900 font-medium">
							Step {currentStep} of {steps.length}
						</span>
						<span className="text-gray-500">
							{steps[currentStep - 1].title}
						</span>
					</div>

					{/* Progress Bar */}
					<div className="w-full bg-gray-300 rounded-full h-2 mb-8">
						<div
							className="bg-[#ff5b5b] h-2 rounded-full transition-all duration-300"
							style={{ width: `${(currentStep / steps.length) * 100}%` }}
						></div>
					</div>

					{/* Step Content */}
					{renderStepContent()}

					{/* Navigation */}
					<div className="pt-8">
						{currentStep === 4 ? (
							// Special layout for step 4 with Skip button
							<div className="flex justify-between items-center">
								<button
									type="button"
									onClick={prevStep}
									className="px-6 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-500 transition-colors"
								>
									Previous
								</button>

								<div className="flex gap-3">
									<button
										type="button"
										onClick={skipStep}
										className="px-6 py-3 border border-gray-500 bg-white text-gray-900 rounded-lg font-medium hover:bg-gray-50 transition-colors"
									>
										Skip This Step
									</button>
									<button
										type="button"
										onClick={nextStep}
										className="px-6 py-3 bg-[#ff5b5b] text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
									>
										Next: {steps[currentStep]?.title || 'Continue'}
									</button>
								</div>
							</div>
						) : (
							// Standard layout for other steps
							<div className="flex justify-between">
								<button
									type="button"
									onClick={prevStep}
									disabled={currentStep === 1}
									className="px-6 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								>
									Previous
								</button>

								{currentStep === steps.length ? (
									<button
										type="button"
										onClick={handleSubmit}
										disabled={loading}
										className="px-6 py-3 bg-[#ff5b5b] text-white rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
									>
										{loading ? 'Creating Salon...' : 'Complete Setup'}
									</button>
								) : (
									<button
										type="button"
										onClick={nextStep}
										className="px-6 py-3 bg-[#ff5b5b] text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
									>
										Next: {steps[currentStep]?.title || 'Continue'}
									</button>
								)}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

export default function BusinessCompleteSetupPage() {
	return (
		<Suspense
			fallback={
				<div className="min-h-screen bg-[#F8F5F2] flex items-center justify-center">
					<div className="text-center">
						<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff5b5b] mx-auto mb-4"></div>
						<p className="text-gray-900">Loading...</p>
					</div>
				</div>
			}
		>
			<BusinessCompleteSetupContent />
		</Suspense>
	);
}
