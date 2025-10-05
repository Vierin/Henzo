'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-unified';
import { STATIC_CATEGORIES } from '@/constants/categories';
import { checkLocationMatch } from '@/constants/locations';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import WorkingHoursSection from '@/components/WorkingHoursSection';
import toast from 'react-hot-toast';

interface SalonSetupData {
	// Step 1: General Information
	name: string;
	address: string;
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
	logo: File | null;
	photos: File[];
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

export default function BusinessCompleteSetupPage() {
	const router = useRouter();
	const { user, isAuthenticated, isLoading } = useAuth();
	const [currentStep, setCurrentStep] = useState(1);
	const [loading, setLoading] = useState(false);
	const [errors, setErrors] = useState<{ [key: string]: string }>({});

	const [formData, setFormData] = useState<SalonSetupData>({
		name: '',
		address: '',
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

		// Check if user already has a salon (optional check, don't block if fails)
		const checkExistingSalon = async () => {
			try {
				// Get fresh session from Supabase
				const {
					data: { session: freshSession },
				} = await supabase.auth.getSession();
				if (!freshSession) {
					console.log('No fresh session available');
					return;
				}

				const API_BASE_URL =
					process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
				const response = await fetch(`${API_BASE_URL}/salons/current`, {
					headers: {
						Authorization: `Bearer ${freshSession.access_token}`,
						'Content-Type': 'application/json',
					},
				});

				if (response.ok) {
					const responseData = await response.json();
					if (responseData.success && responseData.data) {
						console.log('User already has a salon, redirecting to dashboard');
						router.replace('/owner-dashboard');
						return;
					}
				}
				console.log('No existing salon found, staying on setup page');
			} catch (error) {
				console.error('Error checking existing salon:', error);
				// Don't redirect on error, let user continue with setup
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

	const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			setFormData((prev) => ({
				...prev,
				logo: file,
			}));
		}
	};

	const handlePhotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files || []);
		if (files.length > 0) {
			setFormData((prev) => ({
				...prev,
				photos: [...prev.photos, ...files].slice(0, 3), // Max 3 photos
			}));
		}
	};

	const removePhoto = (index: number) => {
		setFormData((prev) => ({
			...prev,
			photos: prev.photos.filter((_, i) => i !== index),
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

			// Create FormData for file uploads
			const formDataToSend = new FormData();
			
			// Add basic salon data
			formDataToSend.append('name', formData.name.trim());
			if (formData.description.trim()) {
				formDataToSend.append('description', formData.description.trim());
			}
			formDataToSend.append('categoryIds', JSON.stringify(formData.categories));
			formDataToSend.append('address', formData.address.trim());
			formDataToSend.append('phone', formData.phone.trim());
			if (formData.socialMedia.website.trim()) {
				formDataToSend.append('website', formData.socialMedia.website.trim());
			}
			if (formData.socialMedia.instagram.trim()) {
				formDataToSend.append('instagram', formData.socialMedia.instagram.trim());
			}
			formDataToSend.append('workingHours', JSON.stringify(formData.workingHours));

			// Add logo if provided
			if (formData.logo) {
				formDataToSend.append('logo', formData.logo);
			}

			// Add photos if provided
			formData.photos.forEach((photo, index) => {
				formDataToSend.append(`photos`, photo);
			});

			const response = await fetch(`${API_BASE_URL}/salons/current`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${freshSession.access_token}`,
					// Don't set Content-Type for FormData, let browser set it with boundary
				},
				body: formDataToSend,
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Failed to create salon');
			}

			toast.success('Salon setup completed successfully!');
			router.push('/owner-dashboard');
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
							<AddressAutocomplete
								value={formData.address}
								onChange={(address) => {
									setFormData((prev) => ({ ...prev, address }));
									if (errors.address) {
										setErrors((prev) => ({ ...prev, address: '' }));
									}
								}}
								placeholder="Select your salon address"
								className="w-full h-13 px-4 py-3 rounded-lg text-gray-900 placeholder-gray-300 focus:ring-2 bg-white focus:ring-[#F8F5F2] focus:border-transparent"
								showIcon={false}
							/>
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
								className="w-full px-4 py-3 bg-white border border-gray-600 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent"
								placeholder="Describe your salon and what makes it special..."
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-900 mb-2">
								Logo Upload (Optional)
							</label>
							<input
								type="file"
								accept="image/*"
								onChange={handleLogoChange}
								className="w-full px-4 py-3 bg-white border border-gray-600 rounded-lg text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-[#ff5b5b] file:text-white hover:file:bg-red-600"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-900 mb-2">
								Photos (Up to 3, Optional)
							</label>
							<input
								type="file"
								accept="image/*"
								multiple
								onChange={handlePhotosChange}
								className="w-full px-4 py-3 bg-white border border-gray-600 rounded-lg text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-[#ff5b5b] file:text-white hover:file:bg-red-600"
							/>
							{formData.photos.length > 0 && (
								<div className="mt-4 grid grid-cols-3 gap-4">
									{formData.photos.map((photo, index) => (
										<div key={index} className="relative">
											<img
												src={URL.createObjectURL(photo)}
												alt={`Photo ${index + 1}`}
												className="w-full h-24 object-cover rounded-lg"
											/>
											<button
												type="button"
												onClick={() => removePhoto(index)}
												className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
											>
												×
											</button>
										</div>
									))}
								</div>
							)}
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
