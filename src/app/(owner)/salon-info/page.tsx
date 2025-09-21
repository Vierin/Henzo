'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import MapComponent from '@/components/MapComponent';

export default function SalonInfoPage() {
	const [formData, setFormData] = useState({
		salonName: '',
		description: '',
		address: '',
		phone: '',
		email: '',
		website: '',
		instagram: '',
		logo: '',
		operatingHours: {
			monday: { open: '9:00 AM', close: '6:00 PM', closed: false },
			tuesday: { open: '9:00 AM', close: '6:00 PM', closed: false },
			wednesday: { open: '9:00 AM', close: '6:00 PM', closed: false },
			thursday: { open: '9:00 AM', close: '6:00 PM', closed: false },
			friday: { open: '9:00 AM', close: '7:00 PM', closed: false },
			saturday: { open: '10:00 AM', close: '5:00 PM', closed: false },
			sunday: { open: '', close: '', closed: true },
		},
	});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [initialLoading, setInitialLoading] = useState(true);
	const router = useRouter();

	// Load existing salon data
	useEffect(() => {
		fetchSalonData();
	}, []);

	const fetchSalonData = async () => {
		try {
			const response = await fetch('/api/salon');
			if (!response.ok) throw new Error('Failed to fetch salon data');
			const data = await response.json();

			if (data.salon) {
				setFormData({
					salonName: data.salon.name || '',
					description: data.salon.description || '',
					address: data.salon.address || '',
					phone: data.salon.phone || '',
					email: data.salon.email || '',
					website: data.salon.website || '',
					instagram: data.salon.instagram || '',
					logo: data.salon.logo || '',
					operatingHours: data.salon.workingHours || formData.operatingHours,
				});
			}
		} catch (err: any) {
			console.error('Error fetching salon data:', err);
		} finally {
			setInitialLoading(false);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError('');

		const saveToast = toast.loading('Saving salon information...');

		try {
			const response = await fetch('/api/salon', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					name: formData.salonName,
					address: formData.address,
					phone: formData.phone,
					logo: formData.logo,
					workingHours: formData.operatingHours,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to save salon information');
			}

			toast.success('Salon information saved successfully!', { id: saveToast });

			// Small delay before redirect to show the success message
			setTimeout(() => {
				router.push('/dashboard');
			}, 1000);
		} catch (err: any) {
			setError(err.message);
			toast.error(err.message || 'Failed to save salon information', {
				id: saveToast,
			});
		} finally {
			setLoading(false);
		}
	};

	const handleTimeChange = (
		day: string,
		field: 'open' | 'close',
		value: string
	) => {
		setFormData((prev) => ({
			...prev,
			operatingHours: {
				...prev.operatingHours,
				[day]: {
					...prev.operatingHours[day as keyof typeof prev.operatingHours],
					[field]: value,
				},
			},
		}));
	};

	const toggleDayClosed = (day: string) => {
		setFormData((prev) => ({
			...prev,
			operatingHours: {
				...prev.operatingHours,
				[day]: {
					...prev.operatingHours[day as keyof typeof prev.operatingHours],
					closed:
						!prev.operatingHours[day as keyof typeof prev.operatingHours]
							.closed,
					open: prev.operatingHours[day as keyof typeof prev.operatingHours]
						.closed
						? '9:00 AM'
						: '',
					close: prev.operatingHours[day as keyof typeof prev.operatingHours]
						.closed
						? '6:00 PM'
						: '',
				},
			},
		}));
	};

	const days = [
		{ key: 'monday', label: 'Monday' },
		{ key: 'tuesday', label: 'Tuesday' },
		{ key: 'wednesday', label: 'Wednesday' },
		{ key: 'thursday', label: 'Thursday' },
		{ key: 'friday', label: 'Friday' },
		{ key: 'saturday', label: 'Saturday' },
		{ key: 'sunday', label: 'Sunday' },
	];

	return (
		<div>
			{initialLoading ? (
				<div className="text-center py-12">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff5b5b] mx-auto mb-4"></div>
					<p className="text-gray-600">Loading salon information...</p>
				</div>
			) : (
				<>
					<div className="text-center mb-8">
						<h1 className="text-4xl font-bold text-gray-900 mb-4">
							Salon Information
						</h1>
						<p className="text-lg text-gray-600">
							Provide details about your salon, including name, description,
							address, contact information, photos, and operating hours.
						</p>
					</div>

					<form onSubmit={handleSubmit} className="space-y-8">
						{/* Basic Details Section */}
						<div className="bg-white border border-gray-200 rounded-lg p-6">
							<h2 className="text-2xl font-semibold text-gray-900 mb-6">
								Basic Details
							</h2>

							<div className="space-y-6">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Salon Name
									</label>
									<input
										type="text"
										required
										value={formData.salonName}
										onChange={(e) =>
											setFormData({ ...formData, salonName: e.target.value })
										}
										className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
										placeholder="Enter salon name"
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Description
									</label>
									<textarea
										rows={4}
										value={formData.description}
										onChange={(e) =>
											setFormData({ ...formData, description: e.target.value })
										}
										className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
										placeholder="Describe your salon..."
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Address
									</label>
									<AddressAutocomplete
										value={formData.address}
										onChange={(address) =>
											setFormData({ ...formData, address })
										}
									/>
								</div>
							</div>
						</div>

						{/* Contact Information Section */}
						<div className="bg-white border border-gray-200 rounded-lg p-6">
							<h2 className="text-2xl font-semibold text-gray-900 mb-6">
								Contact Information
							</h2>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Phone Number
									</label>
									<input
										type="tel"
										value={formData.phone}
										onChange={(e) =>
											setFormData({ ...formData, phone: e.target.value })
										}
										className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
										placeholder="+1 (555) 123-4567"
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Email Address
									</label>
									<input
										type="email"
										value={formData.email}
										onChange={(e) =>
											setFormData({ ...formData, email: e.target.value })
										}
										className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
										placeholder="contact@salon.com"
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Website
									</label>
									<input
										type="url"
										value={formData.website}
										onChange={(e) =>
											setFormData({ ...formData, website: e.target.value })
										}
										className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
										placeholder="https://www.salon.com"
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Instagram
									</label>
									<input
										type="text"
										value={formData.instagram}
										onChange={(e) =>
											setFormData({ ...formData, instagram: e.target.value })
										}
										className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
										placeholder="@salon_handle"
									/>
								</div>
							</div>
						</div>

						{/* Logo Section */}
						<div className="bg-white border border-gray-200 rounded-lg p-6">
							<h2 className="text-2xl font-semibold text-gray-900 mb-6">
								Salon Logo
							</h2>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Logo URL
								</label>
								<input
									type="url"
									value={formData.logo}
									onChange={(e) =>
										setFormData({ ...formData, logo: e.target.value })
									}
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
									placeholder="https://example.com/logo.png"
								/>
								{formData.logo && (
									<div className="mt-4">
										<img
											src={formData.logo}
											alt="Salon Logo"
											className="w-32 h-32 object-cover rounded-lg border border-gray-200"
											onError={(e) => {
												e.currentTarget.style.display = 'none';
											}}
										/>
									</div>
								)}
							</div>
						</div>

						{/* Operating Hours Section */}
						<div className="bg-white border border-gray-200 rounded-lg p-6">
							<h2 className="text-2xl font-semibold text-gray-900 mb-6">
								Operating Hours
							</h2>

							<div className="space-y-4">
								{days.map((day) => {
									const dayData =
										formData.operatingHours[
											day.key as keyof typeof formData.operatingHours
										];
									return (
										<div key={day.key} className="flex items-center space-x-4">
											<div className="w-24">
												<label className="flex items-center space-x-2">
													<input
														type="checkbox"
														checked={!dayData.closed}
														onChange={() => toggleDayClosed(day.key)}
														className="rounded border-gray-300 text-[#ff5b5b] focus:ring-[#ff5b5b]"
													/>
													<span className="text-sm font-medium text-gray-700">
														{day.label}
													</span>
												</label>
											</div>

											{!dayData.closed && (
												<>
													<div className="flex-1">
														<input
															type="time"
															value={dayData.open}
															onChange={(e) =>
																handleTimeChange(
																	day.key,
																	'open',
																	e.target.value
																)
															}
															className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
														/>
													</div>
													<span className="text-gray-500">to</span>
													<div className="flex-1">
														<input
															type="time"
															value={dayData.close}
															onChange={(e) =>
																handleTimeChange(
																	day.key,
																	'close',
																	e.target.value
																)
															}
															className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
														/>
													</div>
												</>
											)}

											{dayData.closed && (
												<div className="flex-1 text-center text-gray-500">
													Closed
												</div>
											)}
										</div>
									);
								})}
							</div>
						</div>

						{/* Map Section */}
						{formData.address && (
							<div className="bg-white border border-gray-200 rounded-lg p-6">
								<h2 className="text-2xl font-semibold text-gray-900 mb-6">
									Location Preview
								</h2>
								<MapComponent address={formData.address} />
							</div>
						)}

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
										<h3 className="text-sm font-medium text-red-800">
											Error saving salon information
										</h3>
										<div className="mt-2 text-sm text-red-700">
											<p>{error}</p>
										</div>
									</div>
								</div>
							</div>
						)}

						{/* Submit Button */}
						<div className="flex justify-end">
							<button
								type="submit"
								disabled={loading}
								className="bg-[#ff5b5b] text-white px-8 py-3 rounded-lg font-medium hover:bg-[#e04a4a] focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{loading ? 'Saving...' : 'Save Salon Information'}
							</button>
						</div>
					</form>
				</>
			)}
		</div>
	);
}
