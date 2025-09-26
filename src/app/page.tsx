'use client';

import { useRouter } from 'next/navigation';
import PublicHeader from '../components/PublicHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorDisplay from '../components/ErrorDisplay';
import { useSalonsWithServices } from '@/hooks/useSalons';
import { STATIC_CATEGORIES } from '@/constants/categories';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import ServiceAutocomplete from '@/components/ServiceAutocomplete';
import { supabase } from '@/lib/supabase';
import { Salon, Service } from '@/types';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';

export default function HomePage() {
	const router = useRouter();
	const [activeTab, setActiveTab] = useState<'treatments' | 'salon'>(
		'treatments'
	);
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedLocation, setSelectedLocation] = useState('');
	const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
	const [showCurrentLocation, setShowCurrentLocation] = useState(true);
	const [selectedDateTime, setSelectedDateTime] = useState('');
	const [isDateTimePickerOpen, setIsDateTimePickerOpen] = useState(false);
	const [currentMonth, setCurrentMonth] = useState(new Date());

	const categories = STATIC_CATEGORIES;

	// Time slots for booking
	const timeSlots = [
		'09:00',
		'09:30',
		'10:00',
		'10:30',
		'11:00',
		'11:30',
		'12:00',
		'12:30',
		'13:00',
		'13:30',
		'14:00',
		'14:30',
		'15:00',
		'15:30',
		'16:00',
		'16:30',
		'17:00',
		'17:30',
		'18:00',
		'18:30',
		'19:00',
		'19:30',
		'20:00',
	];
	const {
		data: salons = [],
		isLoading: loading,
		error,
		refetch,
	} = useSalonsWithServices();

	const handleSalonClick = (salonId: string) => {
		router.push(`/salon/${salonId}`);
	};

	const handleCurrentLocation = () => {
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(
				(position) => {
					const { latitude, longitude } = position.coords;
					// Use the same API as AddressAutocomplete for consistency
					const API_BASE_URL =
						process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
					fetch(
						`${API_BASE_URL}/geocoding/reverse?lat=${latitude}&lon=${longitude}`
					)
						.then((response) => response.json())
						.then((data) => {
							if (data.success && data.data && data.data.display_name) {
								setSelectedLocation(data.data.display_name);
								setShowCurrentLocation(false);
							} else {
								// Fallback to coordinates if no address found
								setSelectedLocation(
									`Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
								);
								setShowCurrentLocation(false);
							}
						})
						.catch((error) => {
							console.error('Error getting address:', error);
							// Fallback to coordinates if API fails
							setSelectedLocation(
								`Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
							);
							setShowCurrentLocation(false);
						});
				},
				(error) => {
					console.error('Error getting location:', error);

					// Handle different geolocation errors
					let errorMessage = 'Current Location';
					switch (error.code) {
						case 1: // PERMISSION_DENIED
							errorMessage = 'Location access denied';
							break;
						case 2: // POSITION_UNAVAILABLE
							errorMessage = 'Location unavailable';
							break;
						case 3: // TIMEOUT
							errorMessage = 'Location request timeout';
							break;
						default:
							errorMessage = 'Current Location';
					}

					setSelectedLocation(errorMessage);
					setShowCurrentLocation(false);

					// Show user-friendly message
					if (error.code === 1) {
						alert(
							'Please allow location access to use current location feature.'
						);
					}
				}
			);
		} else {
			setSelectedLocation('Current Location');
			setShowCurrentLocation(false);
		}
	};

	// Calendar functions
	const getDaysInMonth = (date: Date) => {
		const year = date.getFullYear();
		const month = date.getMonth();
		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);
		const daysInMonth = lastDay.getDate();
		const startingDayOfWeek = firstDay.getDay();

		const days = [];

		// Add empty cells for days before the first day of the month
		for (let i = 0; i < startingDayOfWeek; i++) {
			days.push(null);
		}

		// Add days of the month
		for (let day = 1; day <= daysInMonth; day++) {
			days.push(new Date(year, month, day));
		}

		return days;
	};

	const formatDate = (date: Date) => {
		return date.toISOString().split('T')[0];
	};

	const isToday = (date: Date) => {
		const today = new Date();
		return date.toDateString() === today.toDateString();
	};

	const isPastDate = (date: Date) => {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		return date < today;
	};

	const isSelectedDate = (date: Date) => {
		const selectedDate = selectedDateTime.split(' ')[0];
		return formatDate(date) === selectedDate;
	};

	const handleDateSelect = (date: Date) => {
		if (isPastDate(date)) return;

		const selectedTime = selectedDateTime.split(' ')[1] || '';
		setSelectedDateTime(
			selectedTime ? `${formatDate(date)} ${selectedTime}` : formatDate(date)
		);
	};

	const navigateMonth = (direction: 'prev' | 'next') => {
		setCurrentMonth((prev) => {
			const newMonth = new Date(prev);
			if (direction === 'prev') {
				newMonth.setMonth(prev.getMonth() - 1);
			} else {
				newMonth.setMonth(prev.getMonth() + 1);
			}
			return newMonth;
		});
	};

	const handleSearch = () => {
		const params = new URLSearchParams();

		if (activeTab === 'treatments') {
			if (searchQuery) {
				params.set('search', searchQuery);
			}
			if (selectedLocation) {
				params.set('location', selectedLocation);
			}
			if (selectedDateTime) {
				params.set('datetime', selectedDateTime);
			}
		} else {
			if (searchQuery) {
				params.set('salon', searchQuery);
			}
		}

		router.push(`/salons?${params.toString()}`);
	};

	const handleCategoryClick = (categorySlug: string) => {
		router.push(`/category/${categorySlug}`);
	};

	const handleClearSearch = () => {
		setSearchQuery('');
	};

	const handleClearLocation = () => {
		setSelectedLocation('');
		setShowCurrentLocation(true);
	};

	const handleClearDateTime = () => {
		setSelectedDateTime('');
	};

	const getImageSrc = (imageSrc: string) => {
		// If it's a URL, return it directly
		if (imageSrc.startsWith('http')) {
			return imageSrc;
		}
		// If it's a file path, get the public URL from Supabase
		const { data } = supabase.storage
			.from('salon-files')
			.getPublicUrl(imageSrc);
		return data.publicUrl;
	};

	const isExternalUrl = (imageSrc: string) => {
		return imageSrc.startsWith('http');
	};

	const getSalonImage = (
		salon: Salon
	): { url: string | undefined; isExternal: boolean } => {
		// If salon has photos, use the first photo
		if (salon.photos && salon.photos.length > 0) {
			return {
				url: getImageSrc(salon.photos[0]),
				isExternal: isExternalUrl(salon.photos[0]),
			};
		}
		// If no photos but has logo, use logo
		if (salon.logo) {
			return {
				url: getImageSrc(salon.logo),
				isExternal: isExternalUrl(salon.logo),
			};
		}
		// No images available
		return { url: undefined, isExternal: false };
	};

	return (
		<div className="min-h-screen bg-[#F8F5F2]">
			<PublicHeader />

			<main>
				{/* Hero Section */}
				<section className="py-16 px-6 bg-[#F8F5F2]">
					<div className="mx-auto max-w-7xl">
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
							{/* Left Panel - Search/Booking Form */}
							<div className="bg-white rounded-2xl p-8 shadow-lg">
								{/* Tabs */}
								<div className="flex mb-6">
									<button
										onClick={() => setActiveTab('treatments')}
										className={`flex items-center space-x-2 px-4 py-2 font-medium transition-colors ${
											activeTab === 'treatments'
												? 'border-b-2 border-red-500 text-red-500'
												: 'text-gray-600 hover:text-gray-800'
										}`}
									>
										<svg
											className="w-5 h-5"
											fill="currentColor"
											viewBox="0 0 20 20"
										>
											<path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
										</svg>
										<span>Treatments</span>
									</button>
									<button
										onClick={() => setActiveTab('salon')}
										className={`flex items-center space-x-2 px-4 py-2 font-medium transition-colors ${
											activeTab === 'salon'
												? 'border-b-2 border-red-500 text-red-500'
												: 'text-gray-600 hover:text-gray-800'
										}`}
									>
										<svg
											className="w-5 h-5"
											fill="currentColor"
											viewBox="0 0 20 20"
										>
											<path
												fillRule="evenodd"
												d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-6a1 1 0 00-1-1H9a1 1 0 00-1 1v6a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z"
												clipRule="evenodd"
											/>
										</svg>
										<span>Salon Name</span>
									</button>
								</div>

								{/* Input Fields */}
								<div className="space-y-4">
									{/* Search by treatment or salon */}
									<div className="relative">
										{activeTab === 'treatments' ? (
											<ServiceAutocomplete
												value={searchQuery}
												onChange={setSearchQuery}
												placeholder="Search for treatments"
												className="w-full"
											/>
										) : (
											<>
												<input
													type="text"
													placeholder="Search for salon name"
													value={searchQuery}
													onChange={(e) => setSearchQuery(e.target.value)}
													className="w-full px-4 py-4 pl-12 pr-12 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900"
												/>
												<svg
													className="absolute left-4 top-4 h-6 w-6 text-gray-400"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={2}
														d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
													/>
												</svg>
												{/* Clear button for salon search */}
												{searchQuery && (
													<button
														onClick={handleClearSearch}
														className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
														type="button"
													>
														<svg
															className="w-4 h-4 text-gray-400 hover:text-gray-600"
															fill="none"
															stroke="currentColor"
															viewBox="0 0 24 24"
														>
															<path
																strokeLinecap="round"
																strokeLinejoin="round"
																strokeWidth={2}
																d="M6 18L18 6M6 6l12 12"
															/>
														</svg>
													</button>
												)}
											</>
										)}
									</div>

									{/* Location Input - только для Treatments */}
									{activeTab === 'treatments' && (
										<div className="relative">
											{/* Current Location Button */}
											{showCurrentLocation && (
												<button
													onClick={handleCurrentLocation}
													className="w-full mb-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 hover:bg-blue-100 transition-colors flex items-center justify-center space-x-2"
												>
													<svg
														className="w-4 h-4"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															strokeWidth={2}
															d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
														/>
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															strokeWidth={2}
															d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
														/>
													</svg>
													<span className="text-sm font-medium">
														Use Current Location
													</span>
												</button>
											)}

											{/* Address Autocomplete */}
											<div className="relative">
												<AddressAutocomplete
													value={selectedLocation}
													onChange={(address) => {
														setSelectedLocation(address);
														setShowCurrentLocation(false);
													}}
													placeholder="Enter address or postal code"
													className="w-full px-4 py-4 pl-12 pr-12 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900"
												/>
												<svg
													className="absolute left-4 top-4 h-6 w-6 text-gray-400"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={2}
														d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
													/>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={2}
														d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
													/>
												</svg>
											</div>
										</div>
									)}

									{/* Date & Time Picker - только для Treatments */}
									{activeTab === 'treatments' && (
										<div className="relative">
											<button
												onClick={() =>
													setIsDateTimePickerOpen(!isDateTimePickerOpen)
												}
												className="w-full px-4 py-4 pl-12 pr-12 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 text-left flex items-center justify-between"
											>
												<span
													className={
														selectedDateTime ? 'text-gray-900' : 'text-gray-500'
													}
												>
													{selectedDateTime || 'Select date & time'}
												</span>
												<div className="flex items-center space-x-2">
													{/* Clear button for date/time */}
													{selectedDateTime && (
														<button
															onClick={(e) => {
																e.stopPropagation();
																handleClearDateTime();
															}}
															className="p-1 hover:bg-gray-100 rounded-full transition-colors"
															type="button"
														>
															<svg
																className="w-4 h-4 text-gray-400 hover:text-gray-600"
																fill="none"
																stroke="currentColor"
																viewBox="0 0 24 24"
															>
																<path
																	strokeLinecap="round"
																	strokeLinejoin="round"
																	strokeWidth={2}
																	d="M6 18L18 6M6 6l12 12"
																/>
															</svg>
														</button>
													)}
													<svg
														className={`w-5 h-5 text-gray-400 transition-transform ${
															isDateTimePickerOpen ? 'rotate-180' : ''
														}`}
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															strokeWidth={2}
															d="M19 9l-7 7-7-7"
														/>
													</svg>
												</div>
											</button>
											<svg
												className="absolute left-4 top-4 h-6 w-6 text-gray-400"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
												/>
											</svg>

											{/* Date & Time Picker */}
											{isDateTimePickerOpen && (
												<div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 p-4">
													{/* Custom Calendar */}
													<div className="mb-4">
														<label className="block text-sm font-medium text-gray-700 mb-3">
															Select Date
														</label>

														{/* Calendar Header */}
														<div className="flex items-center justify-between mb-3">
															<button
																onClick={() => navigateMonth('prev')}
																className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
															>
																<svg
																	className="w-4 h-4"
																	fill="none"
																	stroke="currentColor"
																	viewBox="0 0 24 24"
																>
																	<path
																		strokeLinecap="round"
																		strokeLinejoin="round"
																		strokeWidth={2}
																		d="M15 19l-7-7 7-7"
																	/>
																</svg>
															</button>
															<h3 className="text-lg font-semibold text-gray-900">
																{currentMonth.toLocaleDateString('en-US', {
																	month: 'long',
																	year: 'numeric',
																})}
															</h3>
															<button
																onClick={() => navigateMonth('next')}
																className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
															>
																<svg
																	className="w-4 h-4"
																	fill="none"
																	stroke="currentColor"
																	viewBox="0 0 24 24"
																>
																	<path
																		strokeLinecap="round"
																		strokeLinejoin="round"
																		strokeWidth={2}
																		d="M9 5l7 7-7 7"
																	/>
																</svg>
															</button>
														</div>

														{/* Calendar Grid */}
														<div className="grid grid-cols-7 gap-1 mb-2">
															{[
																'Sun',
																'Mon',
																'Tue',
																'Wed',
																'Thu',
																'Fri',
																'Sat',
															].map((day) => (
																<div
																	key={day}
																	className="p-2 text-center text-xs font-medium text-gray-500"
																>
																	{day}
																</div>
															))}
														</div>

														<div className="grid grid-cols-7 gap-1">
															{getDaysInMonth(currentMonth).map(
																(day, index) => (
																	<div key={index} className="aspect-square">
																		{day ? (
																			<button
																				onClick={() => handleDateSelect(day)}
																				disabled={isPastDate(day)}
																				className={`w-full h-full rounded-lg text-sm font-medium transition-colors ${
																					isSelectedDate(day)
																						? 'bg-red-500 text-white'
																						: isToday(day)
																							? 'bg-red-100 text-red-600 font-semibold'
																							: isPastDate(day)
																								? 'text-gray-300 cursor-not-allowed'
																								: 'text-gray-700 hover:bg-gray-100'
																				}`}
																			>
																				{day.getDate()}
																			</button>
																		) : (
																			<div></div>
																		)}
																	</div>
																)
															)}
														</div>
													</div>

													{/* Time Selection */}
													<div>
														<label className="block text-sm font-medium text-gray-700 mb-2">
															Select Time
														</label>
														<div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
															{timeSlots.map((time) => (
																<button
																	key={time}
																	onClick={() => {
																		const date =
																			selectedDateTime.split(' ')[0] ||
																			new Date().toISOString().split('T')[0];
																		setSelectedDateTime(`${date} ${time}`);
																	}}
																	className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
																		selectedDateTime.includes(time)
																			? 'bg-red-500 text-white border-red-500'
																			: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
																	}`}
																>
																	{time}
																</button>
															))}
														</div>
													</div>

													{/* Close Button */}
													<div className="mt-4 pt-4 border-t border-gray-200">
														<button
															onClick={() => setIsDateTimePickerOpen(false)}
															className="w-full bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition-colors"
														>
															Done
														</button>
													</div>
												</div>
											)}
										</div>
									)}
								</div>

								{/* Search Button */}
								<button
									onClick={handleSearch}
									className="w-full bg-red-500 text-white py-4 rounded-lg font-medium hover:bg-red-600 transition-colors mt-6"
								>
									Search
								</button>
							</div>

							{/* Right Section - Image and Slogan */}
							<div className="relative">
								{/* Slogan */}
								<div className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10">
									<h1 className="text-4xl lg:text-5xl font-bold text-blue-900 leading-tight">
										Book your
										<br />
										favorite treatments
									</h1>
								</div>

								{/* Image */}
								<div className="relative">
									<div className="w-full h-96 lg:h-[500px] bg-gradient-to-br from-pink-200 to-purple-200 rounded-2xl overflow-hidden">
										{/* Placeholder for person image */}
										<div className="w-full h-full flex items-center justify-center">
											<div className="w-64 h-64 bg-gradient-to-br from-pink-300 to-purple-300 rounded-full flex items-center justify-center">
												<span className="text-6xl">💇‍♀️</span>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</section>

				{/* Recommended Salons Section */}
				<section className="py-16 px-6 bg-white">
					<div className="mx-auto max-w-6xl">
						<h2 className="text-3xl font-bold text-gray-900 mb-8">
							Recommended Salons
						</h2>

						{loading ? (
							<LoadingSpinner message="Loading salons..." />
						) : error ? (
							<ErrorDisplay
								error={error}
								message="Failed to load salons"
								onRetry={() => refetch()}
							/>
						) : salons.length === 0 ? (
							<div className="text-center py-12">
								<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
									<span className="text-2xl">🏪</span>
								</div>
								<h3 className="text-xl font-semibold text-gray-900 mb-2">
									No salons available
								</h3>
								<p className="text-gray-600">
									Check back later for available salons.
								</p>
							</div>
						) : (
							<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
								{salons.slice(0, 3).map((salon: Salon) => (
									<div
										key={salon.id}
										onClick={() => handleSalonClick(salon.id)}
										className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
									>
										<div className="h-48 bg-gradient-to-br from-pink-100 to-pink-200 flex items-center justify-center">
											{(() => {
												const imageData = getSalonImage(salon);
												return imageData.url ? (
													<Image
														src={imageData.url}
														alt={salon.name}
														width={400}
														height={192}
														className="w-full h-full object-cover"
														unoptimized={imageData.isExternal}
													/>
												) : (
													<span className="text-6xl">💇‍♀️</span>
												);
											})()}
										</div>
										<div className="p-6">
											<h3 className="text-xl font-bold text-gray-900 mb-2">
												{salon.name}
											</h3>
											<p className="text-[#ff5b5b] text-sm mb-2">
												{salon.address}
											</p>
											{salon.phone && (
												<p className="text-gray-500 text-xs mb-3">
													📞 {salon.phone}
												</p>
											)}
											{salon.services && salon.services.length > 0 && (
												<div className="flex flex-wrap gap-1 mb-4">
													{salon.services
														.slice(0, 2)
														.map((service: Service, index: number) => (
															<span
																key={service.id || index}
																className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
															>
																{service.name}
															</span>
														))}
													{salon.services.length > 2 && (
														<span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
															+{salon.services.length - 2} more
														</span>
													)}
												</div>
											)}
											<a
												href={`/salon/${salon.id}`}
												className="block w-full bg-[#ff5b5b] text-white py-2 rounded-lg hover:bg-[#e04a4a] transition-colors text-center text-sm font-medium"
											>
												View Details
											</a>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</section>
			</main>
		</div>
	);
}
