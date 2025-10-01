'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { STATIC_CATEGORIES } from '@/constants/categories';
import { checkLocationMatch } from '@/constants/locations';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import toast from 'react-hot-toast';

interface SalonSetupData {
	name: string;
	description: string;
	categories: number[];
	address: string;
	email: string;
	website: string;
}

export default function BusinessCompleteSetupPage() {
	const router = useRouter();
	const { user, session } = useAuthStore();
	const [formData, setFormData] = useState<SalonSetupData>({
		name: '',
		description: '',
		categories: [],
		address: '',
		email: user?.email || '',
		website: '',
	});
	const [loading, setLoading] = useState(false);
	const [errors, setErrors] = useState<{ [key: string]: string }>({});

	// Redirect if not authenticated or not a business user
	useEffect(() => {
		console.log('Complete setup page - user check:', {
			user: user ? { id: user.id, email: user.email, role: user.role } : null,
			session: session ? 'present' : 'missing',
		});

		if (!user || !session) {
			console.log('No user or session, redirecting to register');
			router.push('/business/register');
			return;
		}

		// Check if user already has a salon (already completed setup)
		const checkExistingSalon = async () => {
			try {
				console.log('Checking if user already has a salon...');
				const API_BASE_URL =
					process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
				const response = await fetch(`${API_BASE_URL}/salons/current`, {
					headers: {
						Authorization: `Bearer ${session.access_token}`,
						'Content-Type': 'application/json',
					},
				});

				if (response.ok) {
					const salonData = await response.json();
					if (salonData) {
						console.log('User already has a salon, redirecting to dashboard');
						// User already has a salon, redirect to dashboard immediately
						router.replace('/owner-dashboard');
						return;
					} else {
						console.log('No salon found, staying on setup page');
					}
				} else {
					console.log('Error fetching salon data, staying on setup page');
				}
			} catch (error) {
				console.error('Error checking existing salon:', error);
				console.log('Error occurred, staying on setup page');
			}
		};

		checkExistingSalon();
	}, [user, session, router]);

	const handleInputChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
	) => {
		const { name, value } = e.target;
		setFormData((prev) => ({
			...prev,
			[name]: value,
		}));
		// Clear error when user starts typing
		if (errors[name]) {
			setErrors((prev) => ({
				...prev,
				[name]: '',
			}));
		}
	};

	const handleCategoryToggle = (categoryId: number) => {
		setFormData((prev) => ({
			...prev,
			categories: prev.categories.includes(categoryId)
				? prev.categories.filter((id) => id !== categoryId)
				: [...prev.categories, categoryId],
		}));
		// Clear error when user selects a category
		if (errors.categories) {
			setErrors((prev) => ({
				...prev,
				categories: '',
			}));
		}
	};

	const validateForm = (): boolean => {
		const newErrors: { [key: string]: string } = {};

		if (!formData.name.trim()) {
			newErrors.name = 'Salon name is required';
		}

		if (formData.categories.length === 0) {
			newErrors.categories = 'Please select at least one category';
		}

		if (!formData.address.trim()) {
			newErrors.address = 'Address is required';
		}

		if (!formData.email.trim()) {
			newErrors.email = 'Email is required';
		} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
			newErrors.email = 'Please enter a valid email address';
		}

		if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
			newErrors.website =
				'Please enter a valid website URL (starting with http:// or https://)';
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!validateForm()) {
			return;
		}

		setLoading(true);

		try {
			const API_BASE_URL =
				process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

			// Create salon
			const salonData = {
				name: formData.name.trim(),
				description: formData.description.trim() || null,
				categoryIds: formData.categories, // Keep as numbers, don't convert to strings
				address: formData.address.trim(),
				email: formData.email.trim(),
				website: formData.website.trim() || null,
			};

			const response = await fetch(`${API_BASE_URL}/salons/current`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${session!.access_token}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(salonData),
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

	if (!user || !session) {
		return (
			<div className="min-h-screen bg-[#F8F5F2] flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff5b5b] mx-auto mb-4"></div>
					<p className="text-gray-600">Loading...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-[#F8F5F2] py-12 px-4 sm:px-6 lg:px-8">
			<div className="max-w-2xl mx-auto">
				<div className="bg-white rounded-xl shadow-lg p-8">
					{/* Header */}
					<div className="text-center mb-8">
						<div className="mx-auto h-16 w-16 flex items-center justify-center bg-[#ff5b5b] rounded-full mb-4">
							<span className="text-white text-2xl">🏢</span>
						</div>
						<h1 className="text-3xl font-bold text-gray-900 mb-2">
							Complete Your Salon Setup
						</h1>
						<p className="text-gray-600">
							Welcome, {user.name}! Please provide some details about your salon
							to get started.
						</p>
					</div>

					{/* Form */}
					<form onSubmit={handleSubmit} className="space-y-6">
						{/* Salon Name */}
						<div>
							<label
								htmlFor="name"
								className="block text-sm font-medium text-gray-700 mb-2"
							>
								Salon Name *
							</label>
							<input
								type="text"
								id="name"
								name="name"
								value={formData.name}
								onChange={handleInputChange}
								className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-gray-900 ${
									errors.name ? 'border-red-500' : 'border-gray-300'
								}`}
								placeholder="Enter your salon name"
							/>
							{errors.name && (
								<p className="mt-1 text-sm text-red-600">{errors.name}</p>
							)}
						</div>

						{/* Description */}
						<div>
							<label
								htmlFor="description"
								className="block text-sm font-medium text-gray-700 mb-2"
							>
								Description (Optional)
							</label>
							<textarea
								id="description"
								name="description"
								rows={4}
								value={formData.description}
								onChange={handleInputChange}
								className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-gray-900"
								placeholder="Describe your salon and services..."
							/>
						</div>

						{/* Categories */}
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-3">
								Categories * (Select at least one)
							</label>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
								{STATIC_CATEGORIES.map((category) => (
									<button
										key={category.id}
										type="button"
										onClick={() => handleCategoryToggle(category.id)}
										className={`p-4 border-2 rounded-lg text-left transition-all ${
											formData.categories.includes(category.id)
												? 'border-[#ff5b5b] bg-red-50'
												: 'border-gray-200 hover:border-gray-300'
										}`}
									>
										<div className="flex items-center space-x-3">
											<div>
												<h3 className="font-medium text-gray-900">
													{category.name}
												</h3>
												<p className="text-sm text-gray-600">
													{category.description}
												</p>
											</div>
										</div>
									</button>
								))}
							</div>
							{errors.categories && (
								<p className="mt-2 text-sm text-red-600">{errors.categories}</p>
							)}
						</div>

						{/* Address */}
						<div>
							<label
								htmlFor="address"
								className="block text-sm font-medium text-gray-700 mb-2"
							>
								Address *
							</label>
							<AddressAutocomplete
								value={formData.address}
								onChange={(address) => {
									setFormData((prev) => ({ ...prev, address }));
									if (errors.address) {
										setErrors((prev) => ({ ...prev, address: '' }));
									}
								}}
								placeholder="Enter your salon address"
								className={errors.address ? 'border-red-500' : ''}
							/>
							{errors.address && (
								<p className="mt-1 text-sm text-red-600">{errors.address}</p>
							)}
						</div>

						{/* Email */}
						<div>
							<label
								htmlFor="email"
								className="block text-sm font-medium text-gray-700 mb-2"
							>
								Email Address *
							</label>
							<input
								type="email"
								id="email"
								name="email"
								value={formData.email}
								onChange={handleInputChange}
								className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-gray-900 ${
									errors.email ? 'border-red-500' : 'border-gray-300'
								}`}
								placeholder="salon@example.com"
							/>
							{errors.email && (
								<p className="mt-1 text-sm text-red-600">{errors.email}</p>
							)}
						</div>

						{/* Website */}
						<div>
							<label
								htmlFor="website"
								className="block text-sm font-medium text-gray-700 mb-2"
							>
								Website (Optional)
							</label>
							<input
								type="url"
								id="website"
								name="website"
								value={formData.website}
								onChange={handleInputChange}
								className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-gray-900 ${
									errors.website ? 'border-red-500' : 'border-gray-300'
								}`}
								placeholder="https://www.yoursalon.com"
							/>
							{errors.website && (
								<p className="mt-1 text-sm text-red-600">{errors.website}</p>
							)}
						</div>

						{/* Submit Button */}
						<div className="pt-6">
							<button
								type="submit"
								disabled={loading}
								className="w-full bg-[#ff5b5b] text-white py-3 px-6 rounded-lg font-medium hover:bg-[#e04a4a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{loading ? (
									<div className="flex items-center justify-center">
										<div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
										Completing Setup...
									</div>
								) : (
									'Complete Setup'
								)}
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
}
