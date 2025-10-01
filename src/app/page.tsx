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
import Footer from '@/components/Footer';

export default function HomePage() {
	const router = useRouter();
	const [activeTab, setActiveTab] = useState<'treatments' | 'salon'>(
		'treatments'
	);
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedLocation, setSelectedLocation] = useState('');
	const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
	const [showCurrentLocation, setShowCurrentLocation] = useState(true);
	const [selectedDate, setSelectedDate] = useState('');
	const [selectedTimeInterval, setSelectedTimeInterval] = useState('');
	const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
	const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
	const [currentMonth, setCurrentMonth] = useState(new Date());
	const datePickerRef = useRef<HTMLDivElement>(null);
	const timePickerRef = useRef<HTMLDivElement>(null);

	const categories = STATIC_CATEGORIES;

	// Time intervals for booking
	const TIME_INTERVALS = [
		{ value: 'any', label: 'Any time' },
		{ value: 'morning', label: 'Morning (6:00 - 12:00)' },
		{ value: 'afternoon', label: 'Afternoon (12:00 - 18:00)' },
		{ value: 'evening', label: 'Evening (18:00 - 24:00)' },
	];
	const {
		data: salons = [],
		isLoading: loading,
		error,
		refetch,
	} = useSalonsWithServices();

	// Close modals when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				datePickerRef.current &&
				!datePickerRef.current.contains(event.target as Node)
			) {
				setIsDatePickerOpen(false);
			}
			if (
				timePickerRef.current &&
				!timePickerRef.current.contains(event.target as Node)
			) {
				setIsTimePickerOpen(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, []);

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
		return formatDate(date) === selectedDate;
	};

	const handleDateSelect = (date: Date) => {
		if (isPastDate(date)) return;
		setSelectedDate(formatDate(date));
		setIsDatePickerOpen(false);
	};

	const handleTimeIntervalSelect = (interval: string) => {
		setSelectedTimeInterval(interval);
		setIsTimePickerOpen(false);
	};

	const formatDateDisplay = (dateString: string) => {
		if (!dateString) return 'Select date';
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
		});
	};

	const getTimeIntervalLabel = (interval: string) => {
		const timeInterval = TIME_INTERVALS.find((ti) => ti.value === interval);
		return timeInterval ? timeInterval.label : 'Select time';
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
			if (selectedDate) {
				params.set('date', selectedDate);
			}
			if (selectedTimeInterval) {
				params.set('time', selectedTimeInterval);
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

	const handleClearDate = () => {
		setSelectedDate('');
	};

	const handleClearTime = () => {
		setSelectedTimeInterval('');
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
				<section className="py-12 px-6 bg-[#F8F5F2]">
					<div className="mx-auto max-w-7xl">
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
							{/* Left Panel - Search/Booking Form */}
							<div className="bg-white rounded-xl p-6 shadow-lg">
								{/* Tabs */}
								<div className="flex mb-4">
									<button
										onClick={() => setActiveTab('treatments')}
										className={`flex items-center space-x-2 px-3 py-2 text-sm font-medium transition-colors ${
											activeTab === 'treatments'
												? 'border-b-2 border-red-500 text-red-500'
												: 'text-gray-600 hover:text-gray-800'
										}`}
									>
										<svg
											className="w-4 h-4"
											fill="currentColor"
											viewBox="0 0 20 20"
										>
											<path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
										</svg>
										<span>Treatments</span>
									</button>
									<button
										onClick={() => setActiveTab('salon')}
										className={`flex items-center space-x-2 px-3 py-2 text-sm font-medium transition-colors ${
											activeTab === 'salon'
												? 'border-b-2 border-red-500 text-red-500'
												: 'text-gray-600 hover:text-gray-800'
										}`}
									>
										<svg
											className="w-4 h-4"
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
								<div className="space-y-3">
									{/* Search by treatment or salon */}
									<div className="relative">
										{activeTab === 'treatments' ? (
											<ServiceAutocomplete
												value={searchQuery}
												onChange={setSearchQuery}
												placeholder="Search for treatments"
												className="w-full text-sm py-3"
											/>
										) : (
											<>
												<input
													type="text"
													placeholder="Search for salon name"
													value={searchQuery}
													onChange={(e) => setSearchQuery(e.target.value)}
													className="w-full px-4 py-3 pl-12 pr-12 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 text-sm"
												/>
												<svg
													className="absolute left-4 top-3.5 h-5 w-5 text-gray-400"
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
													className="w-full mb-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 hover:bg-blue-100 transition-colors flex items-center justify-center space-x-2 text-sm"
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
													<span className="text-xs font-medium">
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
													placeholder="Enter address"
													className="w-full px-4 py-3 pl-12 pr-12 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 text-sm"
												/>
												<svg
													className="absolute left-4 top-3.5 h-5 w-5 text-gray-400"
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

									{/* Date Picker - только для Treatments */}
									{activeTab === 'treatments' && (
										<div className="relative" ref={datePickerRef}>
											<button
												onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
												className="w-full px-4 py-3 pl-12 pr-12 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 text-left flex items-center justify-between text-sm"
											>
												<span
													className={
														selectedDate ? 'text-gray-900' : 'text-gray-500'
													}
												>
													{formatDateDisplay(selectedDate)}
												</span>
												<div className="flex items-center space-x-2">
													{/* Clear button for date */}
													{selectedDate && (
														<button
															onClick={(e) => {
																e.stopPropagation();
																handleClearDate();
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
															isDatePickerOpen ? 'rotate-180' : ''
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
												className="absolute left-4 top-3.5 h-5 w-5 text-gray-400"
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

											{/* Date Picker Calendar */}
											{isDatePickerOpen && (
												<div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 p-4">
													{/* Calendar Header */}
													<div className="flex items-center justify-between mb-3">
														<button
															onClick={() => navigateMonth('prev')}
															className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
														>
															<svg
																className="w-4 h-4 text-gray-700"
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
																className="w-4 h-4 text-gray-700"
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
															'Mon',
															'Tue',
															'Wed',
															'Thu',
															'Fri',
															'Sat',
															'Sun',
														].map((day) => (
															<div
																key={day}
																className="h-10 flex items-center justify-center text-sm font-medium text-gray-500"
															>
																{day}
															</div>
														))}
													</div>

													<div className="grid grid-cols-7 gap-1">
														{getDaysInMonth(currentMonth).map((day, index) => (
															<div key={index} className="aspect-square">
																{day ? (
																	<button
																		onClick={() => handleDateSelect(day)}
																		disabled={isPastDate(day)}
																		className={`w-full h-full rounded-lg text-sm font-medium transition-colors ${
																			isSelectedDate(day)
																				? 'bg-[#ff5b5b] text-white'
																				: isToday(day)
																					? 'bg-white text-gray-900 border-2 border-[#ff5b5b]'
																					: isPastDate(day)
																						? 'text-gray-300 cursor-not-allowed'
																						: 'text-gray-900 hover:bg-gray-100'
																		}`}
																	>
																		{day.getDate()}
																	</button>
																) : (
																	<div></div>
																)}
															</div>
														))}
													</div>
												</div>
											)}
										</div>
									)}

									{/* Time Interval Picker - только для Treatments */}
									{activeTab === 'treatments' && (
										<div className="relative" ref={timePickerRef}>
											<button
												onClick={() => setIsTimePickerOpen(!isTimePickerOpen)}
												className="w-full px-4 py-3 pl-12 pr-12 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 text-left flex items-center justify-between text-sm"
											>
												<span
													className={
														selectedTimeInterval
															? 'text-gray-900'
															: 'text-gray-500'
													}
												>
													{getTimeIntervalLabel(selectedTimeInterval)}
												</span>
												<div className="flex items-center space-x-2">
													{/* Clear button for time */}
													{selectedTimeInterval && (
														<button
															onClick={(e) => {
																e.stopPropagation();
																handleClearTime();
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
															isTimePickerOpen ? 'rotate-180' : ''
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
												className="absolute left-4 top-3.5 h-5 w-5 text-gray-400"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
												/>
											</svg>

											{/* Time Interval Picker */}
											{isTimePickerOpen && (
												<div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 p-4">
													<div className="text-center mb-3">
														<h3 className="text-lg font-semibold text-gray-900">
															Time
														</h3>
													</div>
													<div className="space-y-2">
														{TIME_INTERVALS.map((interval) => (
															<button
																key={interval.value}
																onClick={() =>
																	handleTimeIntervalSelect(interval.value)
																}
																className={`w-full px-4 py-3 text-left rounded-lg border transition-colors ${
																	selectedTimeInterval === interval.value
																		? 'bg-[#ff5b5b] text-white border-[#ff5b5b]'
																		: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
																}`}
															>
																{interval.label}
															</button>
														))}
													</div>
												</div>
											)}
										</div>
									)}
								</div>

								{/* Search Button */}
								<button
									onClick={handleSearch}
									className="w-full bg-red-500 text-white py-3 rounded-lg font-medium hover:bg-red-600 transition-colors mt-4 text-sm"
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

				{/* Why Choose Henzo Section */}
				<section className="py-16 px-6 bg-[#FBF7F5]">
					<div className="mx-auto max-w-6xl">
						{/* Heading */}
						<div className="text-center mb-12">
							<h2 className="text-3xl font-bold text-gray-900 mb-4">
								Why Choose Henzo?
							</h2>
							<p className="text-lg text-gray-700">
								Henzo makes booking your next beauty appointment simple and convenient.
							</p>
						</div>

						{/* Feature Cards */}
						<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
							{/* Easy Booking Card */}
							<div className="bg-white rounded-xl p-8 shadow-lg text-center">
								<div className="w-16 h-16 bg-[#ff5b5b] rounded-lg flex items-center justify-center mx-auto mb-6">
									<svg
										className="w-8 h-8 text-white"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
								</div>
								<h3 className="text-xl font-bold text-gray-900 mb-4">
									Easy Booking
								</h3>
								<p className="text-gray-700">
									Book appointments in just a few taps.
								</p>
							</div>

							{/* Flexible Scheduling Card */}
							<div className="bg-white rounded-xl p-8 shadow-lg text-center">
								<div className="w-16 h-16 bg-[#ff5b5b] rounded-lg flex items-center justify-center mx-auto mb-6">
									<svg
										className="w-8 h-8 text-white"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
								</div>
								<h3 className="text-xl font-bold text-gray-900 mb-4">
									Flexible Scheduling
								</h3>
								<p className="text-gray-700">
									Find a time that works for you, even last minute.
								</p>
							</div>

							{/* Trusted Reviews Card */}
							<div className="bg-white rounded-xl p-8 shadow-lg text-center">
								<div className="w-16 h-16 bg-[#ff5b5b] rounded-lg flex items-center justify-center mx-auto mb-6">
									<svg
										className="w-8 h-8 text-white"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
										/>
									</svg>
								</div>
								<h3 className="text-xl font-bold text-gray-900 mb-4">
									Trusted Reviews
								</h3>
								<p className="text-gray-700">
									Read reviews from other clients to find the best salon.
								</p>
							</div>
						</div>
					</div>
				</section>
			</main>
		</div>
	);
}
