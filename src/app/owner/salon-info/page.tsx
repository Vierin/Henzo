'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import AddressAutocomplete from '../../../components/AddressAutocomplete';
import MapComponent from '../../../components/MapComponent';

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
					operatingHours: data.salon.workingHours || {
						monday: { open: '9:00 AM', close: '6:00 PM', closed: false },
						tuesday: { open: '9:00 AM', close: '6:00 PM', closed: false },
						wednesday: { open: '9:00 AM', close: '6:00 PM', closed: false },
						thursday: { open: '9:00 AM', close: '6:00 PM', closed: false },
						friday: { open: '9:00 AM', close: '7:00 PM', closed: false },
						saturday: { open: '10:00 AM', close: '5:00 PM', closed: false },
						sunday: { open: '', close: '', closed: true },
					},
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
				router.push('/owner');
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
		<div className="min-h-screen bg-[#fff7f6]">
			{/* Header */}
			<header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-[#f1d9d7]">
				<div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="h-8 w-8 rounded-full bg-[#ff5b5b]" />
						<span className="text-xl font-semibold">Henzo</span>
					</div>
					<nav className="hidden md:flex items-center gap-8 text-[15px]">
						<a
							className="text-gray-800 hover:text-black font-medium"
							href="/owner"
						>
							Dashboard
						</a>
						<a className="text-gray-800 hover:text-black font-medium" href="#">
							Calendar
						</a>
						<a
							className="text-gray-800 hover:text-black font-medium"
							href="/owner/services"
						>
							Services
						</a>
						<a
							className="text-gray-800 hover:text-black font-medium"
							href="/owner/staff"
						>
							Staff
						</a>
						<a className="text-gray-800 hover:text-black font-medium" href="#">
							Marketing
						</a>
					</nav>
					<div className="flex items-center gap-4">
						<button
							aria-label="notifications"
							className="h-9 w-9 rounded-full border border-[#ead2d0] grid place-items-center text-gray-700"
						>
							🔔
						</button>
						<div className="flex items-center gap-3">
							<div className="text-right">
								<div className="text-sm font-medium text-gray-800">
									Salon Owner
								</div>
								<div className="text-xs text-gray-500">Business Account</div>
							</div>
							<div className="h-9 w-9 rounded-full bg-gray-200" />
						</div>
					</div>
				</div>
			</header>

			<main className="mx-auto max-w-4xl px-6 py-8">
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
												setFormData({
													...formData,
													description: e.target.value,
												})
											}
											className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
											placeholder="Describe your salon"
										/>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											Salon Logo URL
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
										<p className="text-sm text-gray-500 mt-1">
											Enter the URL of your salon logo image
										</p>
										{formData.logo && (
											<div className="mt-3">
												<p className="text-sm text-gray-700 mb-2">
													Logo Preview:
												</p>
												<img
													src={formData.logo}
													alt="Salon logo preview"
													className="w-20 h-20 object-cover rounded-lg border border-gray-200"
													onError={(e) => {
														e.currentTarget.style.display = 'none';
													}}
												/>
											</div>
										)}
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
											placeholder="Enter salon address"
										/>
										{formData.address && (
											<div className="mt-3">
												<label className="block text-sm font-medium text-gray-700 mb-2">
													Location Preview
												</label>
												<MapComponent
													address={formData.address}
													height="200px"
												/>
											</div>
										)}
									</div>

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
												placeholder="Enter phone number"
											/>
										</div>
										<div>
											<label className="block text-sm font-medium text-gray-700 mb-2">
												Email
											</label>
											<input
												type="email"
												value={formData.email}
												onChange={(e) =>
													setFormData({ ...formData, email: e.target.value })
												}
												className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
												placeholder="Enter email"
											/>
										</div>
									</div>

									<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
												placeholder="https://example.com"
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
													setFormData({
														...formData,
														instagram: e.target.value,
													})
												}
												className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
												placeholder="@username"
											/>
										</div>
									</div>
								</div>
							</div>

							{/* Photos Section */}
							<div className="bg-white border border-gray-200 rounded-lg p-6">
								<h2 className="text-2xl font-semibold text-gray-900 mb-6">
									Photos
								</h2>

								<div className="border-2 border-dashed border-[#ff5b5b] rounded-lg p-8 text-center">
									<div className="mx-auto w-16 h-16 text-[#ff5b5b] mb-4">
										<svg
											className="w-full h-full"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
											/>
										</svg>
									</div>
									<h3 className="text-lg font-medium text-gray-900 mb-2">
										Upload Photos
									</h3>
									<p className="text-gray-600 mb-2">
										Drag and drop photos here, or{' '}
										<button
											type="button"
											className="text-[#ff5b5b] hover:underline"
										>
											browse
										</button>{' '}
										to upload.
									</p>
									<p className="text-sm text-gray-500">
										Recommended size: 1024x768px
									</p>
								</div>
							</div>

							{/* Operating Hours Section */}
							<div className="bg-white border border-gray-200 rounded-lg p-6">
								<h2 className="text-2xl font-semibold text-gray-900 mb-6">
									Operating Hours
								</h2>

								<div className="overflow-hidden border border-gray-200 rounded-lg">
									<table className="w-full">
										<thead className="bg-[#fff2f1]">
											<tr>
												<th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
													DAY
												</th>
												<th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
													OPENING TIME
												</th>
												<th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
													CLOSING TIME
												</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-gray-200">
											{days.map((day) => {
												const dayData =
													formData.operatingHours[
														day.key as keyof typeof formData.operatingHours
													];
												return (
													<tr key={day.key}>
														<td className="px-4 py-3 text-sm font-medium text-gray-900">
															{day.label}
														</td>
														<td className="px-4 py-3">
															{dayData.closed ? (
																<span className="text-red-600 font-medium">
																	Closed
																</span>
															) : (
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
																	className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#ff5b5b] text-gray-900"
																/>
															)}
														</td>
														<td className="px-4 py-3">
															{dayData.closed ? (
																<span className="text-red-600 font-medium">
																	Closed
																</span>
															) : (
																<div className="flex items-center gap-2">
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
																		className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#ff5b5b] text-gray-900"
																	/>
																	<button
																		type="button"
																		onClick={() => toggleDayClosed(day.key)}
																		className="text-xs text-[#ff5b5b] hover:underline"
																	>
																		{dayData.closed ? 'Open' : 'Close'}
																	</button>
																</div>
															)}
														</td>
													</tr>
												);
											})}
										</tbody>
									</table>
								</div>
							</div>

							{error && (
								<div className="text-red-600 text-sm text-center">{error}</div>
							)}

							{/* Save Button */}
							<div className="flex justify-end">
								<button
									type="submit"
									disabled={loading}
									className="bg-[#ff5b5b] text-white px-8 py-3 rounded-md text-lg font-medium hover:bg-[#e04a4a] focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:ring-offset-2 disabled:opacity-50"
								>
									{loading ? 'Saving...' : 'Save Information'}
								</button>
							</div>
						</form>
					</>
				)}
			</main>
		</div>
	);
}
